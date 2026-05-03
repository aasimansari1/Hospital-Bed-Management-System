import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { emit } from '../realtime.js';

const router = Router();
router.use(requireAuth);

const patientSchema = z.object({
  name: z.string().min(2).max(80),
  age: z.coerce.number().int().min(0).max(140),
  gender: z.enum(['male', 'female', 'other']).optional(),
  disease: z.string().max(200).optional().nullable(),
  contact: z.string().max(40).optional().nullable(),
  bed_id: z.coerce.number().int().positive().optional().nullable(),
});

router.get('/', (req, res) => {
  const { status, q } = req.query;
  const clauses = [];
  const params = {};
  if (status) {
    clauses.push('p.status = @status');
    params.status = status;
  }
  if (q) {
    clauses.push('(p.name LIKE @q OR p.disease LIKE @q OR p.contact LIKE @q)');
    params.q = `%${q}%`;
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT p.*, b.code AS bed_code, w.name AS ward_name
      FROM patients p
      LEFT JOIN beds b ON b.id = p.bed_id
      LEFT JOIN wards w ON w.id = b.ward_id
      ${where}
     ORDER BY p.created_at DESC`;
  const rows = db.prepare(sql).all(params);
  res.json({ patients: rows });
});

router.post('/', requireRole('admin', 'receptionist', 'nurse'), (req, res) => {
  const parsed = patientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, age, gender, disease, contact, bed_id } = parsed.data;

  const tx = db.transaction(() => {
    let assignedBedId = null;
    if (bed_id) {
      const bed = db.prepare('SELECT * FROM beds WHERE id=?').get(bed_id);
      if (!bed) throw new Error('BED_NOT_FOUND');
      if (bed.status !== 'available' && bed.status !== 'reserved')
        throw new Error('BED_UNAVAILABLE');
      const taken = db.prepare("SELECT id FROM patients WHERE bed_id=? AND status='admitted'").get(bed_id);
      if (taken) throw new Error('BED_ASSIGNED');
      db.prepare("UPDATE beds SET status='occupied' WHERE id=?").run(bed_id);
      assignedBedId = bed_id;
    }
    const info = db
      .prepare(
        `INSERT INTO patients (name,age,gender,disease,contact,bed_id,admitted_at,status)
         VALUES (?,?,?,?,?,?, datetime('now'), 'admitted')`
      )
      .run(name, age, gender ?? null, disease ?? null, contact ?? null, assignedBedId);
    return info.lastInsertRowid;
  });

  try {
    const id = tx();
    const patient = db.prepare('SELECT * FROM patients WHERE id=?').get(id);
    emit('patient:created', patient);
    if (patient.bed_id) emit('bed:updated', db.prepare('SELECT * FROM beds WHERE id=?').get(patient.bed_id));
    res.status(201).json({ patient });
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes('BED_NOT_FOUND')) return res.status(400).json({ error: 'Bed does not exist' });
    if (msg.includes('BED_UNAVAILABLE'))
      return res.status(400).json({ error: 'Selected bed is not available' });
    if (msg.includes('BED_ASSIGNED'))
      return res.status(409).json({ error: 'Bed is already assigned to another patient' });
    throw e;
  }
});

router.put('/:id', requireRole('admin', 'receptionist', 'nurse'), (req, res) => {
  const id = Number(req.params.id);
  const parsed = patientSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = db.prepare('SELECT * FROM patients WHERE id=?').get(id);
  if (!existing) return res.status(404).json({ error: 'Patient not found' });
  const next = { ...existing, ...parsed.data };
  db.prepare(
    'UPDATE patients SET name=?, age=?, gender=?, disease=?, contact=? WHERE id=?'
  ).run(next.name, next.age, next.gender, next.disease, next.contact, id);
  const patient = db.prepare('SELECT * FROM patients WHERE id=?').get(id);
  emit('patient:updated', patient);
  res.json({ patient });
});

router.post('/:id/assign-bed', requireRole('admin', 'nurse', 'receptionist'), (req, res) => {
  const id = Number(req.params.id);
  const bed_id = Number(req.body?.bed_id);
  if (!bed_id) return res.status(400).json({ error: 'bed_id required' });

  const tx = db.transaction(() => {
    const patient = db.prepare('SELECT * FROM patients WHERE id=?').get(id);
    if (!patient) throw new Error('PATIENT_NOT_FOUND');
    if (patient.status !== 'admitted') throw new Error('PATIENT_DISCHARGED');
    const bed = db.prepare('SELECT * FROM beds WHERE id=?').get(bed_id);
    if (!bed) throw new Error('BED_NOT_FOUND');
    if (bed.status === 'occupied' || bed.status === 'maintenance') throw new Error('BED_UNAVAILABLE');
    const taken = db.prepare("SELECT id FROM patients WHERE bed_id=? AND status='admitted' AND id<>?").get(bed_id, id);
    if (taken) throw new Error('BED_ASSIGNED');

    if (patient.bed_id && patient.bed_id !== bed_id) {
      db.prepare("UPDATE beds SET status='available' WHERE id=?").run(patient.bed_id);
    }
    db.prepare("UPDATE beds SET status='occupied' WHERE id=?").run(bed_id);
    db.prepare('UPDATE patients SET bed_id=? WHERE id=?').run(bed_id, id);
    return { previousBedId: patient.bed_id };
  });

  try {
    const { previousBedId } = tx();
    const patient = db.prepare('SELECT * FROM patients WHERE id=?').get(id);
    emit('patient:updated', patient);
    emit('bed:updated', db.prepare('SELECT * FROM beds WHERE id=?').get(bed_id));
    if (previousBedId)
      emit('bed:updated', db.prepare('SELECT * FROM beds WHERE id=?').get(previousBedId));
    res.json({ patient });
  } catch (e) {
    const msg = String(e.message || e);
    const map = {
      PATIENT_NOT_FOUND: [404, 'Patient not found'],
      PATIENT_DISCHARGED: [400, 'Patient is already discharged'],
      BED_NOT_FOUND: [400, 'Bed does not exist'],
      BED_UNAVAILABLE: [400, 'Bed is not available'],
      BED_ASSIGNED: [409, 'Bed is already assigned to another patient'],
    };
    const hit = map[msg];
    if (hit) return res.status(hit[0]).json({ error: hit[1] });
    throw e;
  }
});

router.post('/:id/discharge', requireRole('admin', 'nurse', 'receptionist'), (req, res) => {
  const id = Number(req.params.id);
  const tx = db.transaction(() => {
    const p = db.prepare('SELECT * FROM patients WHERE id=?').get(id);
    if (!p) throw new Error('NOT_FOUND');
    if (p.status === 'discharged') throw new Error('ALREADY');
    db.prepare("UPDATE patients SET status='discharged', discharged_at=datetime('now'), bed_id=NULL WHERE id=?").run(id);
    if (p.bed_id) db.prepare("UPDATE beds SET status='available' WHERE id=?").run(p.bed_id);
    return p.bed_id;
  });
  try {
    const freedBedId = tx();
    const patient = db.prepare('SELECT * FROM patients WHERE id=?').get(id);
    emit('patient:updated', patient);
    if (freedBedId)
      emit('bed:updated', db.prepare('SELECT * FROM beds WHERE id=?').get(freedBedId));
    res.json({ patient });
  } catch (e) {
    if (String(e.message).includes('NOT_FOUND')) return res.status(404).json({ error: 'Patient not found' });
    if (String(e.message).includes('ALREADY')) return res.status(400).json({ error: 'Patient already discharged' });
    throw e;
  }
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const p = db.prepare('SELECT * FROM patients WHERE id=?').get(id);
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  if (p.bed_id) db.prepare("UPDATE beds SET status='available' WHERE id=?").run(p.bed_id);
  db.prepare('DELETE FROM patients WHERE id=?').run(id);
  emit('patient:deleted', { id });
  if (p.bed_id) emit('bed:updated', db.prepare('SELECT * FROM beds WHERE id=?').get(p.bed_id));
  res.json({ ok: true });
});

export default router;
