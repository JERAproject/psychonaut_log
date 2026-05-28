import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import db from "../backend/db.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.raw({ type: "audio/*", limit: "10mb" }));

// Import routes from server.ts
// For Vercel serverless, we'll inline the essential routes

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)").run(user.id, token, expiresAt);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const token = authHeader.slice(7);
  const session = db.prepare(
    "SELECT s.user_id, u.username, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')"
  ).get(token);
  if (!session) {
    return res.status(401).json({ error: "unauthorized" });
  }
  res.json({ user: { id: session.user_id, username: session.username, role: session.role } });
});

// Journal endpoints
app.get("/api/journal", (req, res) => {
  // Simplified version - add auth middleware as needed
  const entries = db.prepare("SELECT * FROM journal_entries ORDER BY fecha DESC, hora DESC").all();
  res.json(entries);
});

app.post("/api/journal", async (req, res) => {
  const {
    fecha, hora, duracion, tipo_practica,
    estado_previo, fenomenologia_somatica, fenomenologia_cognitiva,
    cuerpo, insight, integracion, estado_post,
    energy_pre, valence_pre, energy_post, valence_post,
  } = req.body;

  if (!fecha || !tipo_practica || !estado_previo || !estado_post) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = db.prepare(`
      INSERT INTO journal_entries (
        fecha, hora, duracion, tipo_practica,
        estado_previo, fenomenologia_somatica, fenomenologia_cognitiva,
        cuerpo, insight, integracion, estado_post,
        energy_pre, valence_pre, energy_post, valence_post
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fecha, hora || "", Number(duracion) || 0, tipo_practica,
      estado_previo, fenomenologia_somatica || "", fenomenologia_cognitiva || null,
      cuerpo || null, insight || null, integracion || null, estado_post,
      energy_pre || null, valence_pre || null, energy_post || null, valence_post || null
    );
    res.status(201).json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Habits endpoints
app.get("/api/habits", (req, res) => {
  const habits = db.prepare("SELECT id, name, color, max_per_day as maxPerDay FROM habits").all();
  res.json(habits);
});

app.post("/api/habits", (req, res) => {
  const { name, color, maxPerDay } = req.body;
  if (!name || !color) {
    return res.status(400).json({ error: "name and color are required" });
  }
  const max = Math.max(1, Math.min(Number(maxPerDay) || 1, 99));
  db.prepare("INSERT INTO habits (name, color, max_per_day) VALUES (?, ?, ?)").run(name, color, max);
  res.status(201).json({ ok: true });
});

// Practices endpoints
app.get("/api/practices", (req, res) => {
  const practices = db.prepare("SELECT slug, label FROM practices ORDER BY label ASC").all();
  res.json(practices);
});

// Stats endpoint
app.get("/api/journal/stats/energy-valence", (req, res) => {
  const entries = db.prepare(`
    SELECT id, fecha, tipo_practica, energy_pre, valence_pre, energy_post, valence_post
    FROM journal_entries
    WHERE energy_pre IS NOT NULL OR valence_pre IS NOT NULL OR energy_post IS NOT NULL OR valence_post IS NOT NULL
    ORDER BY fecha DESC LIMIT 50
  `).all();
  res.json(entries);
});

export default app;