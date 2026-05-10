import db from "./db.js";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

const seed = fs.readFileSync(path.resolve("./seed.sql"), "utf8");

db.exec(seed);
console.log("Database seeded successfully");

const entries = db.prepare("SELECT * FROM journal_entries").all();
if (entries.length > 0) {
  console.log(`Seeded ${entries.length} journal entries`);
}

const habits = db.prepare("SELECT * FROM habits").all();
console.log(`Seeded ${habits.length} habits`);

const password = "psy2024";
const hash = bcrypt.hashSync(password, 10);

const users = [
  { username: "jera", role: "user" },
  { username: "psicologo", role: "psicologo" },
  { username: "admin", role: "admin" },
  { username: "invitado", role: "user" },
];

const userIds: Record<string, number> = {};

for (const u of users) {
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(u.username) as any;
  if (!existing) {
    const result = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(u.username, hash, u.role);
    userIds[u.username] = result.lastInsertRowid as number;
    console.log(`Created user: ${u.username} (role: ${u.role})`);
  } else {
    userIds[u.username] = existing.id;
    console.log(`User already exists: ${u.username}`);
  }
}

const jeraId = userIds["jera"];
const defaultHabits = db.prepare("SELECT * FROM habits WHERE user_id IS NULL").all();
if (defaultHabits.length > 0 && jeraId) {
  db.prepare("UPDATE habits SET user_id = ? WHERE user_id IS NULL").run(jeraId);
  console.log(`Assigned ${defaultHabits.length} habits to jera`);
}

const invitadoId = userIds["invitado"];
const existingEntries = db.prepare("SELECT id FROM journal_entries WHERE user_id = ?").get(invitadoId);
if (!existingEntries) {
  const sampleEntries = [
    {
      fecha: "2025-05-01",
      hora: "09:00",
      duracion: 30,
      tipo_practica: "mindfulness",
      estado_previo: "ansioso",
      fenomenologia_somatica: "Tension en el pecho y hombros, respiracion superficial",
      fenomenologia_cognitiva: "Rumiacion sobre decisiones pendientes",
      cuerpo: "Pecho tenso, hormigueo en manos",
      insight: "La ansiedad desaparece al enfocarme en la sensacion del aire",
      integracion: "Practicar mindfulness diariamente ayuda a reducir la rumiacion cognitiva",
      estado_post: "calmado",
      energy_pre: -2, valence_pre: -1, energy_post: 2, valence_post: 3
    },
    {
      fecha: "2025-05-03",
      hora: "08:30",
      duracion: 20,
      tipo_practica: "meditacion_trascendental",
      estado_previo: "agotado",
      fenomenologia_somatica: "Fatiga general, ligero mareo",
      fenomenologia_cognitiva: "Pensamiento nebuloso, baja concentracion",
      cuerpo: "Pesadez en extremidades",
      insight: "El descanso mental profundo es mas efectivo que el analisis constante",
      integracion: "Integrar pratyahara antes de la meditacion activa",
      estado_post: "energizado",
      energy_pre: -3, valence_pre: -2, energy_post: 1, valence_post: 2
    },
    {
      fecha: "2025-05-05",
      hora: "20:00",
      duracion: 45,
      tipo_practica: "visualizacion_guiada",
      estado_previo: "neutro",
      fenomenologia_somatica: "Relajacion muscular progresivamente",
      fenomenologia_cognitiva: "Imagineria activa, conexion mente-cuerpo",
      cuerpo: "Calidez corporal, sensacion de flotacion",
      insight: "La visualizacion creativa activa las mismas regiones cerebrales que la experiencia real",
      integracion: "Combinar con escritura posterior para fijar las experiencias",
      estado_post: "contento",
      energy_pre: 0, valence_pre: 0, energy_post: 3, valence_post: 4
    },
    {
      fecha: "2025-05-07",
      hora: "07:00",
      duracion: 15,
      tipo_practica: "respiracion_holotropica",
      estado_previo: "tenso",
      fenomenologia_somatica: "Presion en el pecho, energizacion rapida",
      fenomenologia_cognitiva: "Desapego emocional, claridad mental",
      cuerpo: "Vibracion interna, intensidad energetica",
      insight: "La respiracion consciente puede transformar estados emocionales rapidamente",
      integracion: "Usar en momentos de bloqueo emocional",
      estado_post: "equilibrado",
      energy_pre: -1, valence_pre: -1, energy_post: 2, valence_post: 2
    }
  ];

  for (const entry of sampleEntries) {
    db.prepare(`
      INSERT INTO journal_entries (fecha, hora, duracion, tipo_practica, estado_previo,
        fenomenologia_somatica, fenomenologia_cognitiva, cuerpo, insight, integracion,
        estado_post, energy_pre, valence_pre, energy_post, valence_post, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(entry.fecha, entry.hora, entry.duracion, entry.tipo_practica, entry.estado_previo,
      entry.fenomenologia_somatica, entry.fenomenologia_cognitiva, entry.cuerpo,
      entry.insight, entry.integracion, entry.estado_post, entry.energy_pre,
      entry.valence_pre, entry.energy_post, entry.valence_post, invitadoId);
  }
  console.log(`Created 4 sample journal entries for invitado`);
}

const allUsers = db.prepare("SELECT id, username, role FROM users").all();
console.log(`Total users: ${allUsers.length}`);

db.close();
