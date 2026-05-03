import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import rateLimit from 'express-rate-limit';

import { db, initSchema } from './db.js';
import { attachSocket } from './realtime.js';
import { startSnapshotLoop } from './snapshot.js';
import authRouter from './routes/auth.js';
import wardsRouter from './routes/wards.js';
import bedsRouter from './routes/beds.js';
import patientsRouter from './routes/patients.js';
import statsRouter from './routes/stats.js';
import { runSeed } from './seed.js';

const app = express();
const port = Number(process.env.PORT) || 4000;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

initSchema();
runSeed();

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '512kb' }));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/api/health', (req, res) => {
  const beds = db.prepare('SELECT COUNT(*) AS c FROM beds').get().c;
  res.json({ ok: true, beds, ts: Date.now() });
});

app.use('/api/auth', authRouter);
app.use('/api/wards', wardsRouter);
app.use('/api/beds', bedsRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/stats', statsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const httpServer = http.createServer(app);
attachSocket(httpServer, corsOrigin);
startSnapshotLoop(60_000);

httpServer.listen(port, () => {
  console.log(`HBMS API listening on http://localhost:${port}`);
  console.log(`CORS origin: ${corsOrigin}`);
});
