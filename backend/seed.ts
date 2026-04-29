import db from "./db.js";
import fs from "node:fs";
import path from "node:path";

const seed = fs.readFileSync(path.resolve("./seed.sql"), "utf8");

db.exec(seed);
console.log("Database seeded successfully");

const entries = db.prepare("SELECT * FROM journal_entries").all();
if (entries.length > 0) {
  console.log(`Seeded ${entries.length} journal entries`);
}

const habits = db.prepare("SELECT * FROM habits").all();
console.log(`Seeded ${habits.length} habits`);

db.close();
