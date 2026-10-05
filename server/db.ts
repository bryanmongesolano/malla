import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { StoredStatus, UserSettings } from '../shared/types.js';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), '.local', 'malla.db');

// Ensure parent folder exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Enable WAL mode for high performance and concurrency
db.pragma('journal_mode = WAL');

// Migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS progress (
    username   TEXT NOT NULL,
    item_id    TEXT NOT NULL,
    status     TEXT NOT NULL CHECK (status IN ('cursando', 'completada', 'suficiencia')),
    updated_at TEXT NOT NULL,
    PRIMARY KEY (username, item_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    username            TEXT PRIMARY KEY,
    courses_per_period  INTEGER NOT NULL DEFAULT 4,
    updated_at          TEXT NOT NULL
  );
`);

// Check if progress table constraint needs upgrade to include 'suficiencia'
const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='progress'").get() as { sql?: string } | undefined;
if (tableInfo?.sql && !tableInfo.sql.includes('suficiencia')) {
  db.exec(`
    PRAGMA foreign_keys=off;
    BEGIN TRANSACTION;
    CREATE TABLE progress_new (
      username   TEXT NOT NULL,
      item_id    TEXT NOT NULL,
      status     TEXT NOT NULL CHECK (status IN ('cursando', 'completada', 'suficiencia')),
      updated_at TEXT NOT NULL,
      PRIMARY KEY (username, item_id)
    );
    INSERT OR IGNORE INTO progress_new SELECT username, item_id, status, updated_at FROM progress;
    DROP TABLE progress;
    ALTER TABLE progress_new RENAME TO progress;
    COMMIT;
    PRAGMA foreign_keys=on;
  `);
}

export function getUserProgress(username: string): Record<string, StoredStatus> {
  const stmt = db.prepare('SELECT item_id, status FROM progress WHERE username = ?');
  const rows = stmt.all(username) as { item_id: string; status: StoredStatus }[];
  const progress: Record<string, StoredStatus> = {};
  for (const r of rows) {
    progress[r.item_id] = r.status;
  }
  return progress;
}

export function setUserProgressItem(
  username: string,
  itemId: string,
  status: 'disponible' | 'bloqueada' | 'cursando' | 'completada' | 'suficiencia'
): void {
  const now = new Date().toISOString();
  if (status === 'disponible' || status === 'bloqueada') {
    const stmt = db.prepare('DELETE FROM progress WHERE username = ? AND item_id = ?');
    stmt.run(username, itemId);
  } else {
    const stmt = db.prepare(`
      INSERT INTO progress (username, item_id, status, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(username, item_id) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at
    `);
    stmt.run(username, itemId, status, now);
  }
}

export function getUserSettings(username: string): UserSettings {
  const stmt = db.prepare('SELECT courses_per_period FROM settings WHERE username = ?');
  const row = stmt.get(username) as { courses_per_period: number } | undefined;
  if (!row) {
    return { coursesPerPeriod: 4 };
  }
  return { coursesPerPeriod: row.courses_per_period };
}

export function setUserSettings(username: string, settings: UserSettings): void {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO settings (username, courses_per_period, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      courses_per_period = excluded.courses_per_period,
      updated_at = excluded.updated_at
  `);
  stmt.run(username, settings.coursesPerPeriod, now);
}
