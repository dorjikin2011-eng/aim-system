import { getDB } from '../models/db';
import * as bcrypt from 'bcryptjs';

async function seed() {
  const db = getDB();

  // Helper: run async queries
  const run = (sql: string, params: any[] = []) => {
    return new Promise<void>((resolve, reject) => {
      db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  const get = <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  };

  try {
    // Insert agencies (avoid duplicates)
    await run(
      `INSERT OR IGNORE INTO agencies (id, name, sector) VALUES (?, ?, ?)`,
      ['MOEH', 'Ministry of Education and Skills Development', 'Education']
    );
    await run(
      `INSERT OR IGNORE INTO agencies (id, name, sector) VALUES (?, ?, ?)`,
      ['MOH', 'Ministry of Health', 'Health']
    );
    await run(
      `INSERT OR IGNORE INTO agencies (id, name, sector) VALUES (?, ?, ?)`,
      ['ACC', 'Anti-Corruption Commission', 'Oversight']
    );

    // Check if users exist (avoid re-seeding)
    const existing = await get<{count: number}>(
      `SELECT COUNT(*) as count FROM users WHERE email = ?`,
      ['kinley.w@gov.bt']
    );

    if (existing && existing.count > 0) {
      console.log('ℹ️ Users already seeded. Skipping.');
      process.exit(0);
    }

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const users = [
      { id: 'u1', name: 'Commissioner 1', email: 'c1@acc.gov.bt', password: 'password', role: 'commissioner', agency_id: null },
      { id: 'u2', name: 'Director', email: 'director@acc.gov.bt', password: 'password', role: 'director', agency_id: 'ACC' },
      { id: 'u3', name: 'Kinley Wangchuk', email: 'kinley.w@gov.bt', password: 'password', role: 'prevention_officer', agency_id: 'ACC' },
      { id: 'u4', name: 'MOEH Head', email: 'head@moeh.gov.bt', password: 'password', role: 'agency_head', agency_id: 'MOEH' },
      { id: 'u5', name: 'MOEH Focal', email: 'focal@moeh.gov.bt', password: 'password', role: 'focal_person', agency_id: 'MOEH' },
    ];

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, salt);
      await run(
        `INSERT OR IGNORE INTO users (id, name, email, password_hash, role, agency_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [u.id, u.name, u.email, hash, u.role, u.agency_id]
      );
    }

    console.log('✅ Seeded 3 agencies and 5 users.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
