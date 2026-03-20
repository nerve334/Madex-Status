import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'madex-status.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin', 'manager')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS monitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'GET' CHECK(method IN ('GET','POST','HEAD','PUT','DELETE','PATCH')),
      interval_seconds INTEGER NOT NULL DEFAULT 60,
      timeout_seconds INTEGER NOT NULL DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('up','down','pending','maintenance')),
      expected_status_codes TEXT NOT NULL DEFAULT '200-299',
      headers TEXT DEFAULT '[]',
      body TEXT DEFAULT '',
      auth_type TEXT NOT NULL DEFAULT 'none' CHECK(auth_type IN ('none','basic','bearer')),
      auth_value TEXT DEFAULT '',
      keyword TEXT DEFAULT '',
      keyword_type TEXT DEFAULT 'present' CHECK(keyword_type IN ('present','absent')),
      active INTEGER NOT NULL DEFAULT 1,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      notify_on_down INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS heartbeats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monitor_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('up','down','pending')),
      response_time INTEGER DEFAULT 0,
      status_code INTEGER DEFAULT 0,
      message TEXT DEFAULT '',
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_heartbeats_monitor_time ON heartbeats(monitor_id, timestamp DESC);

    CREATE TABLE IF NOT EXISTS public_systems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'operational' CHECK(status IN ('operational','degraded','partial','major','maintenance')),
      display_order INTEGER NOT NULL DEFAULT 0,
      auto_status INTEGER NOT NULL DEFAULT 0,
      provider_url TEXT DEFAULT '',
      provider_component TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      system_id INTEGER,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','resolved','monitoring')),
      impact_status TEXT NOT NULL DEFAULT 'major' CHECK(impact_status IN ('operational','degraded','partial','major','maintenance')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (system_id) REFERENCES public_systems(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS incident_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'investigating' CHECK(status IN ('investigating','identified','monitoring','resolved')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notification_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'discord' CHECK(type IN ('discord')),
      webhook_url TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      notify_up INTEGER NOT NULL DEFAULT 1,
      notify_down INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Insert default settings if not existing
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('brand_name', 'Madex Status');
  insertSetting.run('logo', '');
  insertSetting.run('icon', '');
  insertSetting.run('favicon', '');
  insertSetting.run('setup_complete', 'false');

  // Migrate: add auto_status columns if missing (for existing DBs)
  try {
    db.prepare('SELECT auto_status FROM public_systems LIMIT 1').get();
  } catch {
    db.exec(`ALTER TABLE public_systems ADD COLUMN auto_status INTEGER NOT NULL DEFAULT 0`);
    db.exec(`ALTER TABLE public_systems ADD COLUMN provider_url TEXT DEFAULT ''`);
    db.exec(`ALTER TABLE public_systems ADD COLUMN provider_component TEXT DEFAULT ''`);
  }

  // Insert default public systems if table is empty
  const count = db.prepare('SELECT COUNT(*) as count FROM public_systems').get() as any;
  if (count.count === 0) {
    const insertSystem = db.prepare('INSERT INTO public_systems (name, status, display_order, auto_status, provider_url, provider_component) VALUES (?, ?, ?, ?, ?, ?)');
    insertSystem.run('Domain', 'operational', 1, 1, 'https://status.godaddy.com/api/v2/components.json', 'Domains');
    insertSystem.run('Hosting', 'operational', 2, 1, 'https://www.hostingerstatus.com/api/v2/components.json', 'Web Hosting');
    insertSystem.run('Server', 'operational', 3, 1, 'https://www.hostingerstatus.com/api/v2/components.json', 'VPS');
    insertSystem.run('E-Mail', 'operational', 4, 1, 'https://www.hostingerstatus.com/api/v2/components.json', 'Email');
  }
}

export default db;
