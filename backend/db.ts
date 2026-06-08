import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = path.resolve(
  process.env.DB_PATH || "../data/habits.db"
);

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const schema = fs.readFileSync(
  path.resolve("./schema.sql"),
  "utf8"
);

db.exec(schema);

const columns: any[] = db.prepare("PRAGMA table_info(journal_entries)").all();
const colNames = columns.map((c: any) => c.name);

if (colNames.includes("fenomenologia") && !colNames.includes("fenomenologia_somatica")) {
  db.prepare("ALTER TABLE journal_entries RENAME COLUMN fenomenologia TO fenomenologia_somatica").run();
}

if (!colNames.includes("fenomenologia_cognitiva")) {
  db.prepare("ALTER TABLE journal_entries ADD COLUMN fenomenologia_cognitiva TEXT").run();
}
if (!colNames.includes("energy_pre")) {
  db.prepare("ALTER TABLE journal_entries ADD COLUMN energy_pre INTEGER").run();
}
if (!colNames.includes("valence_pre")) {
  db.prepare("ALTER TABLE journal_entries ADD COLUMN valence_pre INTEGER").run();
}
if (!colNames.includes("energy_post")) {
  db.prepare("ALTER TABLE journal_entries ADD COLUMN energy_post INTEGER").run();
}
if (!colNames.includes("valence_post")) {
  db.prepare("ALTER TABLE journal_entries ADD COLUMN valence_post INTEGER").run();
}

const stateColumns: any[] = db.prepare("PRAGMA table_info(inferred_states)").all();
const stateColNames = stateColumns.map((c: any) => c.name);

if (stateColNames.includes("somatic_inferred") && !stateColNames.includes("somatic")) {
  try { db.prepare("ALTER TABLE inferred_states RENAME COLUMN somatic_inferred TO somatic").run(); } catch {}
}
if (stateColNames.includes("emotional_inferred") && !stateColNames.includes("emotional")) {
  try { db.prepare("ALTER TABLE inferred_states RENAME COLUMN emotional_inferred TO emotional").run(); } catch {}
}
if (stateColNames.includes("attention_inferred") && !stateColNames.includes("attention")) {
  try { db.prepare("ALTER TABLE inferred_states RENAME COLUMN attention_inferred TO attention").run(); } catch {}
}
if (stateColNames.includes("cognition_inferred") && !stateColNames.includes("cognition")) {
  try { db.prepare("ALTER TABLE inferred_states RENAME COLUMN cognition_inferred TO cognition").run(); } catch {}
}

if (!stateColNames.includes("somatic")) {
  try { db.prepare("ALTER TABLE inferred_states ADD COLUMN somatic TEXT").run(); } catch {}
}
if (!stateColNames.includes("emotional")) {
  try { db.prepare("ALTER TABLE inferred_states ADD COLUMN emotional TEXT").run(); } catch {}
}
if (!stateColNames.includes("attention")) {
  try { db.prepare("ALTER TABLE inferred_states ADD COLUMN attention TEXT").run(); } catch {}
}
if (!stateColNames.includes("cognition")) {
  try { db.prepare("ALTER TABLE inferred_states ADD COLUMN cognition TEXT").run(); } catch {}
}

const tables: any[] = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
const tableNames = tables.map((t: any) => t.name);

if (!tableNames.includes("entry_embeddings")) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS entry_embeddings(
      entry_id INTEGER NOT NULL,
      field TEXT NOT NULL,
      embedding TEXT NOT NULL,
      PRIMARY KEY(entry_id, field),
      FOREIGN KEY(entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
    )
  `);
}

const userTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'sessions')").all() as any[];
const userTableNames = userTables.map((t: any) => t.name);

if (!userTableNames.includes("users")) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

if (!userTableNames.includes("sessions")) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

const habitCols: any[] = db.prepare("PRAGMA table_info(habits)").all();
const habitColNames = habitCols.map((c: any) => c.name);
if (!habitColNames.includes("user_id")) {
  db.prepare("ALTER TABLE habits ADD COLUMN user_id INTEGER").run();
}

const logCols: any[] = db.prepare("PRAGMA table_info(habit_logs)").all();
const logColNames = logCols.map((c: any) => c.name);
if (!logColNames.includes("user_id")) {
  db.prepare("ALTER TABLE habit_logs ADD COLUMN user_id INTEGER").run();
  db.prepare("DROP INDEX IF EXISTS idx_habit_logs_unique").run();
}

const journalCols: any[] = db.prepare("PRAGMA table_info(journal_entries)").all();
const journalColNames = journalCols.map((c: any) => c.name);
if (!journalColNames.includes("user_id")) {
  db.prepare("ALTER TABLE journal_entries ADD COLUMN user_id INTEGER").run();
}

if (!journalColNames.includes("bienestar_logros")) {
  db.prepare("ALTER TABLE journal_entries ADD COLUMN bienestar_logros INTEGER").run();
}
if (!journalColNames.includes("bienestar_relaciones")) {
  db.prepare("ALTER TABLE journal_entries ADD COLUMN bienestar_relaciones INTEGER").run();
}
if (!journalColNames.includes("bienestar_sentido")) {
  db.prepare("ALTER TABLE journal_entries ADD COLUMN bienestar_sentido INTEGER").run();
}
if (!journalColNames.includes("bienestar_emociones")) {
  db.prepare("ALTER TABLE journal_entries ADD COLUMN bienestar_emociones INTEGER").run();
}
if (!journalColNames.includes("bienestar_entrega")) {
  db.prepare("ALTER TABLE journal_entries ADD COLUMN bienestar_entrega INTEGER").run();
}

const practiceTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='practices'").all();
if (practiceTables.length === 0) {
  db.exec(`
    CREATE TABLE practices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      slug TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, slug)
    )
  `);
  const defaultPractices = [
    { slug: "mindfulness", label: "Mindfulness" },
    { slug: "trataka", label: "Trataka" },
    { slug: "visualizacion", label: "Visualización Guiada" },
    { slug: "shambhavi", label: "Third Eye Gazing" },
    { slug: "escritura", label: "Escritura Reflectiva" },
  ];
  const insert = db.prepare("INSERT OR IGNORE INTO practices (user_id, slug, label) VALUES (NULL, ?, ?)");
  for (const p of defaultPractices) insert.run(p.slug, p.label);
}

const psicologoTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='psicologo_users'").all();
if (psicologoTables.length === 0) {
  db.exec(`
    CREATE TABLE psicologo_users (
      psicologo_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (psicologo_id, user_id),
      FOREIGN KEY (psicologo_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

const voiceTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='voice_transcriptions'").all();
if (voiceTables.length === 0) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS voice_transcriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT,
      transcript TEXT,
      language TEXT,
      duration REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export default db;
