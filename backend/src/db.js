import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'hbms.db');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

export const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','nurse','receptionist')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('ICU','Emergency','General','Pediatric','Maternity','Private')),
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS beds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      ward_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('ICU','General','Private','Emergency')),
      status TEXT NOT NULL CHECK (status IN ('available','occupied','reserved','maintenance')) DEFAULT 'available',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT CHECK (gender IN ('male','female','other')),
      disease TEXT,
      contact TEXT,
      bed_id INTEGER UNIQUE,
      admitted_at TEXT,
      discharged_at TEXT,
      status TEXT NOT NULL CHECK (status IN ('admitted','discharged')) DEFAULT 'admitted',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS occupancy_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taken_at TEXT NOT NULL DEFAULT (datetime('now')),
      total INTEGER NOT NULL,
      available INTEGER NOT NULL,
      occupied INTEGER NOT NULL,
      reserved INTEGER NOT NULL,
      maintenance INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);
    CREATE INDEX IF NOT EXISTS idx_beds_ward ON beds(ward_id);
    CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
  `);
}
