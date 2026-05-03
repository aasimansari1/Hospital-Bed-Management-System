import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { emit } from '../realtime.js';

const router = Router();
router.use(requireAuth);

const bedSchema = z.object({
  code: z.string().min(1).max(40),
  ward_id: z.coerce.number().int().positive(),
  type: z.enum(['ICU', 'General', 'Private', 'Emergency']),
  status: z.enum(['available', 'occupied', 'reserved', 'maintenance']).default('available'),
  notes: z.string().max(300).optional().nullable(),
});

router.get('/', (req, res) => {
  const { ward_id, status, type, q } = req.query;
  const clauses = [];
  const params = {};
  if (ward_id) {
    clauses.push('b.ward_id = @ward_id');
    params.ward_id = Number(ward_id);
  }
  if (status) {
    clauses.push('b.status = @status');
    params.status = status;
  }
  if (type) {
    clauses.push('b.type = @type');
    params.type = type;
  }
  if (q) {
    clauses.push('(b.code LIKE @q OR w.name LIKE @q)');
    params.q = `%${q}%`;
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT b.*, w.name AS ward_name, w.type AS ward_type,
           p.id AS patient_id, p.name AS patient_name, p.disease AS patient_disease
      FROM beds b
      JOIN wards w ON w.id = b.ward_id
      LEFT JOIN patients p ON p.bed_id = b.id AND p.status = 'admitted'
      ${where}
     ORDER BY w.name, b.code`;
  const rows = db.prepare(sql).all(params);
  res.json({ beds: rows });
});

router.get('/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT b.*, w.name AS ward_name, w.type AS ward_type,
              p.id AS patient_id, p.name AS patient_name
         FROM beds b JOIN wards w ON w.id=b.ward_id
         LEFT JOIN patients p ON p.bed_id=b.id AND p.status='admitted'
        WHERE b.id = ?`
    )
    .get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Bed not found' });
  res.json({ bed: row });
});

router.post('/', requireRole('admin'), (req, res) => {
  const parsed = bedSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { code, ward_id, type, status, notes } = parsed.data;
  const ward = db.prepare('SELECT id FROM wards WHERE id=?').get(ward_id);
  if (!ward) return res.status(400).json({ error: 'Ward does not exist' });
  try {
    const info = db
      .prepare('INSERT INTO beds (code,ward_id,type,status,notes) VALUES (?,?,?,?,?)')
      .run(code, ward_id, type, status, notes ?? null);
    const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(info.lastInsertRowid);
    emit('bed:created', bed);
    res.status(201).json({ bed });
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'Bed code already exists' });
    throw e;
  }
});

router.put('/:id', requireRole('admin', 'nurse'), (req, res) => {
  const id = Number(req.params.id);
  const parsed = bedSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = db.prepare('SELECT * FROM beds WHERE id=?').get(id);
  if (!existing) return res.status(404).json({ error: 'Bed not found' });

  const occupant = db.prepare("SELECT id FROM patients WHERE bed_id=? AND status='admitted'").get(id);
  if (occupant && parsed.data.status && parsed.data.status !== 'occupied') {
    return res
      .status(400)
      .json({ error: 'Cannot change status while a patient is admitted to this bed' });
  }

  const next = { ...existing, ...parsed.data };
  db.prepare('UPDATE beds SET code=?, ward_id=?, type=?, status=?, notes=? WHERE id=?').run(
    next.code,
    next.ward_id,
    next.type,
    next.status,
    next.notes,
    id
  );
  const bed = db.prepare('SELECT * FROM beds WHERE id=?').get(id);
  emit('bed:updated', bed);
  res.json({ bed });
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const occupant = db.prepare("SELECT id FROM patients WHERE bed_id=? AND status='admitted'").get(id);
  if (occupant) return res.status(400).json({ error: 'Cannot delete an occupied bed' });
  const info = db.prepare('DELETE FROM beds WHERE id=?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'Bed not found' });
  emit('bed:deleted', { id });
  res.json({ ok: true });
});

export default router;
