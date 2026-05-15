import db from "./db.js";

const psicologoId = db.prepare("SELECT id FROM users WHERE username = 'psicologo'").get() as any;
const userId = db.prepare("SELECT id FROM users WHERE username = 'jera'").get() as any;

if (psicologoId && userId) {
  db.prepare("INSERT OR IGNORE INTO psicologo_users (psicologo_id, user_id) VALUES (?, ?)").run(psicologoId.id, userId.id);
  console.log(`Asignado: psicologo (${psicologoId.id}) → jera (${userId.id})`);
} else {
  if (!psicologoId) console.log("psicologo no encontrado");
  if (!userId) console.log("jera no encontrado");
}

db.close();