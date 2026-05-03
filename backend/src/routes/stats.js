import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', (req, res) => {
  const totals = db
    .prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) AS available,
        SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) AS occupied,
        SUM(CASE WHEN status='reserved' THEN 1 ELSE 0 END) AS reserved,
        SUM(CASE WHEN status='maintenance' THEN 1 ELSE 0 END) AS maintenance
       FROM beds`
    )
    .get();
  const wards = db
    .prepare(
      `SELECT w.id, w.name, w.type,
              COUNT(b.id) AS total,
              SUM(CASE WHEN b.status='available' THEN 1 ELSE 0 END) AS available,
              SUM(CASE WHEN b.status='occupied' THEN 1 ELSE 0 END) AS occupied
         FROM wards w LEFT JOIN beds b ON b.ward_id = w.id
        GROUP BY w.id ORDER BY w.name`
    )
    .all();
  const patients = db
    .prepare(
      `SELECT
        SUM(CASE WHEN status='admitted' THEN 1 ELSE 0 END) AS admitted,
        SUM(CASE WHEN status='discharged' THEN 1 ELSE 0 END) AS discharged
       FROM patients`
    )
    .get();
  res.json({ totals, wards, patients });
});

router.get('/occupancy-trend', (req, res) => {
  const days = Math.max(1, Math.min(30, Number(req.query.days) || 7));
  const rows = db
    .prepare(
      `SELECT date(taken_at) AS day,
              ROUND(AVG(occupied) ,1) AS occupied,
              ROUND(AVG(available),1) AS available,
              ROUND(AVG(reserved) ,1) AS reserved,
              ROUND(AVG(total)    ,1) AS total
         FROM occupancy_log
        WHERE taken_at >= datetime('now', ?)
        GROUP BY day ORDER BY day`
    )
    .all(`-${days} day`);
  res.json({ trend: rows });
});

router.get('/ward-distribution', (req, res) => {
  const rows = db
    .prepare(
      `SELECT w.name, COUNT(b.id) AS beds,
              SUM(CASE WHEN b.status='occupied' THEN 1 ELSE 0 END) AS occupied
         FROM wards w LEFT JOIN beds b ON b.ward_id=w.id
        GROUP BY w.id ORDER BY w.name`
    )
    .all();
  res.json({ distribution: rows });
});

export default router;
