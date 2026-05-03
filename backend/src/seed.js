import bcrypt from 'bcryptjs';
import { db, initSchema } from './db.js';

export function runSeed() {
  initSchema();
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0) return; // already seeded

  const insertUser = db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)');
  insertUser.run('Hospital Admin', 'admin@hbms.local', bcrypt.hashSync('admin123', 10), 'admin');
  insertUser.run('Nurse Joy', 'nurse@hbms.local', bcrypt.hashSync('nurse123', 10), 'nurse');
  insertUser.run('Front Desk', 'desk@hbms.local', bcrypt.hashSync('desk123', 10), 'receptionist');

  const wards = [
    ['ICU - North', 'ICU', 'Intensive care, advanced monitoring'],
    ['Emergency', 'Emergency', 'Trauma and emergency admissions'],
    ['General Ward A', 'General', 'General medicine, low acuity'],
    ['General Ward B', 'General', 'General medicine, post-op recovery'],
    ['Pediatrics', 'Pediatric', 'Children up to 16'],
    ['Maternity', 'Maternity', 'Labor & delivery'],
    ['Private Suites', 'Private', 'Private rooms'],
  ];
  const insertWard = db.prepare('INSERT INTO wards (name,type,description) VALUES (?,?,?)');
  const wardIds = wards.map((w) => insertWard.run(...w).lastInsertRowid);

  const insertBed = db.prepare('INSERT INTO beds (code,ward_id,type,status,notes) VALUES (?,?,?,?,?)');
  const bedTypeFor = (wardType) => {
    if (wardType === 'ICU') return 'ICU';
    if (wardType === 'Emergency') return 'Emergency';
    if (wardType === 'Private') return 'Private';
    return 'General';
  };
  const statusPool = ['available', 'available', 'available', 'occupied', 'occupied', 'reserved', 'maintenance'];

  wards.forEach((w, i) => {
    const wardId = wardIds[i];
    const count = w[1] === 'ICU' ? 6 : w[1] === 'Emergency' ? 8 : w[1] === 'Private' ? 5 : 12;
    for (let n = 1; n <= count; n++) {
      const code = `${w[0].split(' ')[0].slice(0, 3).toUpperCase()}-${String(n).padStart(3, '0')}`;
      const status = statusPool[(i + n) % statusPool.length];
      insertBed.run(code, wardId, bedTypeFor(w[1]), status, null);
    }
  });

  const insertPatient = db.prepare(
    `INSERT INTO patients (name,age,gender,disease,contact,bed_id,admitted_at,status)
     VALUES (?,?,?,?,?,?, datetime('now','-1 day'), 'admitted')`
  );
  const occupiedBeds = db.prepare("SELECT id FROM beds WHERE status='occupied'").all();
  const sampleNames = [
    ['Aisha Khan', 34, 'female', 'Pneumonia'],
    ['Daniel Park', 56, 'male', 'Cardiac monitoring'],
    ['Maria Lopez', 28, 'female', 'Post-op recovery'],
    ['Liam Wright', 7, 'male', 'Asthma exacerbation'],
    ['Noor Hassan', 67, 'female', 'Stroke recovery'],
    ['Tomas Becker', 41, 'male', 'Sepsis'],
    ['Yuki Tanaka', 19, 'female', 'Appendicitis'],
    ['Owen Reed', 73, 'male', 'COPD'],
    ['Ines Costa', 31, 'female', 'Maternity admission'],
  ];
  occupiedBeds.forEach((b, i) => {
    const s = sampleNames[i % sampleNames.length];
    insertPatient.run(s[0], s[1], s[2], s[3], `+1-555-01${String(i).padStart(2, '0')}`, b.id);
  });

  const log = db.prepare(
    `INSERT INTO occupancy_log (taken_at,total,available,occupied,reserved,maintenance)
     VALUES (datetime('now', ?), ?, ?, ?, ?, ?)`
  );
  const totals = db.prepare('SELECT COUNT(*) c FROM beds').get().c;
  for (let d = 7; d >= 0; d--) {
    const occupied = Math.floor(totals * (0.45 + Math.random() * 0.3));
    const reserved = Math.floor(totals * 0.05);
    const maintenance = Math.floor(totals * 0.04);
    const available = totals - occupied - reserved - maintenance;
    log.run(`-${d} day`, totals, available, occupied, reserved, maintenance);
  }

  console.log('Seeded demo data. Logins:');
  console.log('  admin@hbms.local / admin123');
  console.log('  nurse@hbms.local / nurse123');
  console.log('  desk@hbms.local  / desk123');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed();
}
