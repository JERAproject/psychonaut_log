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

export default db;
