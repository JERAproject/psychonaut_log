import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

let testDb: Database.Database;

export function createTestDb(): Database.Database {
  testDb = new Database(':memory:');

  testDb.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      max_per_day INTEGER DEFAULT 1,
      user_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      log_date TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      user_id INTEGER,
      FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    CREATE TABLE journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT,
      duracion INTEGER DEFAULT 0,
      tipo_practica TEXT NOT NULL,
      estado_previo TEXT NOT NULL,
      fenomenologia_somatica TEXT,
      fenomenologia_cognitiva TEXT,
      cuerpo TEXT,
      insight TEXT,
      integracion TEXT,
      estado_post TEXT NOT NULL,
      energy_pre INTEGER,
      valence_pre INTEGER,
      energy_post INTEGER,
      valence_post INTEGER,
      bienestar_logros INTEGER,
      bienestar_relaciones INTEGER,
      bienestar_sentido INTEGER,
      bienestar_emociones INTEGER,
      bienestar_entrega INTEGER,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE inferred_states (
      entry_id INTEGER PRIMARY KEY,
      somatic TEXT,
      emotional TEXT,
      attention TEXT,
      cognition TEXT
    );

    CREATE TABLE entry_embeddings (
      entry_id INTEGER NOT NULL,
      field TEXT NOT NULL,
      embedding TEXT NOT NULL,
      PRIMARY KEY(entry_id, field)
    );

    CREATE TABLE practices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      slug TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, slug)
    );

    CREATE TABLE psicologo_users (
      psicologo_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (psicologo_id, user_id)
    );
  `);

  return testDb;
}

export function getTestDb(): Database.Database {
  return testDb;
}

export function createTestUser(db: Database.Database, username: string, password: string, role: string = 'user') {
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
  ).run(username, hash, role);
  return result.lastInsertRowid;
}

export function createTestSession(db: Database.Database, userId: number): string {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(userId, token, expiresAt);
  return token;
}

export function cleanupTestDb(db: Database.Database) {
  db.close();
}