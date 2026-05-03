import { db } from './db.js';

export function snapshotOccupancy() {
  const r = db
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
  db.prepare(
    `INSERT INTO occupancy_log (total,available,occupied,reserved,maintenance)
     VALUES (?,?,?,?,?)`
  ).run(r.total || 0, r.available || 0, r.occupied || 0, r.reserved || 0, r.maintenance || 0);
}

export function startSnapshotLoop(intervalMs = 60_000) {
  snapshotOccupancy();
  setInterval(snapshotOccupancy, intervalMs).unref?.();
}
