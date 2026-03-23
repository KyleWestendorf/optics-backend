import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync } from 'fs';

const DB_PATH = path.join(__dirname, '../data/dashboard.db');

// Ensure data directory exists (needed on fresh deploys)
mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    site TEXT NOT NULL,
    page_views INTEGER DEFAULT 0,
    sessions INTEGER DEFAULT 0,
    affiliate_clicks INTEGER DEFAULT 0,
    bounce_rate REAL DEFAULT 0,
    avg_session_duration REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(date, site)
  );

  CREATE TABLE IF NOT EXISTS keyword_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    site TEXT NOT NULL,
    query TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    ctr REAL DEFAULT 0,
    position REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(date, site, query)
  );

  CREATE TABLE IF NOT EXISTS page_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    site TEXT NOT NULL,
    path TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    sessions INTEGER DEFAULT 0,
    bounce_rate REAL DEFAULT 0,
    avg_duration REAL DEFAULT 0,
    affiliate_clicks INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(date, site, path)
  );
`);

export default db;
