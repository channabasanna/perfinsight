import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH || './data/perf_comparison.db';
const dbDir = path.dirname(path.resolve(DB_PATH));

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.resolve(DB_PATH));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    const hashBuf = Buffer.from(hash, 'hex');
    const derivedBuf = scryptSync(password, salt, 64);
    return timingSafeEqual(hashBuf, derivedBuf);
  } catch {
    return false;
  }
}

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sub_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      transaction_filters TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS test_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sub_project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      build TEXT,
      user_load INTEGER,
      test_tool TEXT NOT NULL DEFAULT 'Custom',
      execution_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      file_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sub_project_id) REFERENCES sub_projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_run_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      samples INTEGER,
      avg_response_time REAL,
      min_response_time REAL,
      max_response_time REAL,
      p90_response_time REAL,
      p95_response_time REAL,
      p99_response_time REAL,
      error_rate REAL,
      throughput REAL,
      kb_per_sec REAL,
      FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_project_access (
      user_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, project_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Run migrations for existing databases
  const columns = db.prepare("PRAGMA table_info(sub_projects)").all() as { name: string }[];
  const hasFilters = columns.some((c) => c.name === 'transaction_filters');
  if (!hasFilters) {
    db.exec('ALTER TABLE sub_projects ADD COLUMN transaction_filters TEXT');
  }

  // Seed default admin user if no users exist
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount === 0) {
    const adminUsername = process.env.AUTH_USERNAME || 'admin';
    const adminPassword = process.env.AUTH_PASSWORD || 'admin123';
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(
      adminUsername,
      hashPassword(adminPassword),
      'admin'
    );
    console.log(`Default admin user created: ${adminUsername}`);
  }

  console.log('Database initialized successfully');
}

export default db;
