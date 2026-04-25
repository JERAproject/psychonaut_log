import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const db=
new Database(
"./data/habits.db"
);

const schema=
fs.readFileSync(
path.resolve(
"./backend/schema.sql"
),
"utf8"
);

db.exec(schema);

export default db;