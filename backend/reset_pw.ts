import db from "./db.js";
import bcrypt from "bcryptjs";

const password = "psy2024";
const hash = bcrypt.hashSync(password, 10);

const users = db.prepare("SELECT id, username FROM users").all() as any[];
for (const u of users) {
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, u.id);
  console.log(`Reset password for: ${u.username}`);
}

db.close();