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

export default db;
