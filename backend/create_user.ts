import db from "./db.js";
import bcrypt from "bcryptjs";

const username = "fpc";
const password = "ejemplo123";
const role = "user";

const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
if (existing) {
  console.log(`User ${username} already exists`);
} else {
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(username, hash, role);
  console.log(`Created user: ${username} (id: ${result.lastInsertRowid}, role: ${role})`);
}

db.close();