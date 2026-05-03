import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { emit } from '../realtime.js';

const router = Router();
router.use(requireAuth);

const wardSchema = z.object({
  name: z.string().min(2).max(60),
  type: z.enum(['ICU', 'Emergency', 'General', 'Pediatric', 'Maternity', 'Private']),
  description: z.string().max(300).optional().nullable(),
});

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT w.*,
        (SELECT COUNT(*) FROM beds b WHERE b.ward_id = w.id) AS total_beds,
        (SELECT COUNT(*) FROM beds b WHERE b.ward_id = w.id AND b.status='available') AS available_beds,
        (SELECT COUNT(*) FROM beds b WHERE b.ward_id = w.id AND b.status='occupied') AS occupied_beds
       FROM wards w ORDER BY w.name`
    )
    .all();
  res.json({ wards: rows });
});

router.post('/', requireRole('admin'), (req, res) => {
  const parsed = wardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const info = db
      .prepare('INSERT INTO wards (name,type,description) VALUES (?,?,?)')
      .run(parsed.data.name, parsed.data.type, parsed.data.description ?? null);
    const ward = db.prepare('SELECT * FROM wards WHERE id = ?').get(info.lastInsertRowid);
    emit('ward:created', ward);
    res.status(201).json({ ward });
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'Ward name already exists' });
    throw e;
  }
});

router.put('/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const parsed = wardSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = db.prepare('SELECT * FROM wards WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Ward not found' });
  const next = { ...existing, ...parsed.data };
  db.prepare('UPDATE wards SET name=?, type=?, description=? WHERE id=?').run(
    next.name,
    next.type,
    next.description,
    id
  );
  const ward = db.prepare('SELECT * FROM wards WHERE id = ?').get(id);
  emit('ward:updated', ward);
  res.json({ ward });
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM wards WHERE id = ?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'Ward not found' });
  emit('ward:deleted', { id });
  res.json({ ok: true });
});

export default router;
