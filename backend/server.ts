import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import db from "./db";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());

type AuthUser = { id: number; username: string; role: string } | null;

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.slice(7);
  const session = db.prepare(
    "SELECT s.user_id, u.username, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')"
  ).get(token) as { user_id: number; username: string; role: string } | undefined;

  req.user = session ? { id: session.user_id, username: session.username, role: session.role } : null;
  next();
}

app.use(authMiddleware);

app.post("/api/auth/register", async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "admin only" });
  }
  const { username, password, role = "user" } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }
  if (["user", "psicologo", "admin"].indexOf(role) === -1) {
    return res.status(400).json({ error: "invalid role" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return res.status(409).json({ error: "username already exists" });
  }
  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(username, hash, role);
  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
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
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  res.json({ user: req.user });
});

// ── Classifier ──────────────────────────────────────────

app.post("/api/classify", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const results: Record<string, string> = {};

    try {
      const promptA = SOMATIC_PROMPT.replace("{{TEXT}}", text);
      const rawA = await callOllama(promptA);
      const parsedA = parseJsonSafe(rawA);
      results.somatic = parsedA.somatic || "neutral";
    } catch (e) {
      results.somatic = "neutral";
    }

    try {
      const promptB = COGNITIVE_PROMPT.replace("{{TEXT}}", text);
      const rawB = await callOllama(promptB);
      const parsedB = parseJsonSafe(rawB);
      results.cognition = parsedB.cognition || "neutral";
    } catch (e) {
      results.cognition = "neutral";
    }

    try {
      const promptC = EMOTIONAL_ATTENTION_PROMPT.replace("{{TEXT}}", text);
      const rawC = await callOllama(promptC);
      const parsedC = parseJsonSafe(rawC);
      results.emotional = parsedC.emotional || "neutral";
      results.attention = parsedC.attention || "neutral";
    } catch (e) {
      results.emotional = "neutral";
      results.attention = "neutral";
    }

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Classification failed" });
  }
});

app.post("/api/auth/change-password", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword required" });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: "newPassword must be at least 4 characters" });
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
  if (!user) return res.status(404).json({ error: "User not found" });
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) return res.status(403).json({ error: "Current password is incorrect" });
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, req.user.id);
  res.json({ ok: true });
});

// ── Habits ──────────────────────────────────────────────

app.get("/api/habits", (req, res) => {
  if (req.user?.role === "admin") {
    const habits = db.prepare(
      "SELECT id, name, color, max_per_day as maxPerDay, user_id FROM habits"
    ).all();
    return res.json(habits);
  }
  const userId = req.user?.id ?? null;
  const habits = db.prepare(
    "SELECT id, name, color, max_per_day as maxPerDay FROM habits WHERE user_id = ? OR user_id IS NULL"
  ).all(userId);
  res.json(habits);
});

app.post("/api/habits", (req, res) => {
  const { name, color, maxPerDay } = req.body;
  if (!name || !color) {
    return res.status(400).json({ error: "name and color are required" });
  }
  if (!req.user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const max = Math.max(1, Math.min(Number(maxPerDay) || 1, 99));
  const userId = req.user?.role === "admin" ? req.body.userId : req.user?.id;
  db.prepare(
    "INSERT INTO habits (name, color, max_per_day, user_id) VALUES (?, ?, ?, ?)"
  ).run(name, color, max, userId);
  res.status(201).json({ ok: true });
});

app.delete("/api/habits/:id", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  const habit = db.prepare("SELECT user_id FROM habits WHERE id = ?").get(id) as any;
  if (!habit) return res.status(404).json({ error: "Not found" });
  if (habit.user_id === null || req.user?.role === "admin" || habit.user_id === req.user?.id) {
    db.prepare("DELETE FROM habit_logs WHERE habit_id = ?").run(id);
    db.prepare("DELETE FROM habits WHERE id = ?").run(id);
    return res.json({ ok: true });
  }
  res.status(403).json({ error: "Forbidden" });
});

app.put("/api/habits/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, color, maxPerDay } = req.body;
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  if (!name || !color) {
    return res.status(400).json({ error: "name and color are required" });
  }
  const habit = db.prepare("SELECT user_id FROM habits WHERE id = ?").get(id) as any;
  if (!habit) return res.status(404).json({ error: "Not found" });
  if (req.user?.role !== "admin" && habit.user_id !== req.user?.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const max = Math.max(1, Math.min(Number(maxPerDay) || 1, 99));
  db.prepare(
    "UPDATE habits SET name = ?, color = ?, max_per_day = ? WHERE id = ?"
  ).run(name, color, max, id);
  res.json({ ok: true });
});

// ── Habit Logs ──────────────────────────────────────────

app.get("/api/logs", (req, res) => {
  const { habitId, startDate, endDate } = req.query;
  const userId = req.user?.id ?? null;
  const isAdmin = req.user?.role === "admin";

  let query =
    "SELECT habit_id as habitId, log_date as logDate, count FROM habit_logs WHERE 1=1";
  const params: any[] = [];

  if (!isAdmin) {
    query += " AND (user_id = ? OR user_id IS NULL)";
    params.push(userId);
  }

  if (habitId) {
    query += " AND habit_id = ?";
    params.push(habitId);
  }
  if (startDate) {
    query += " AND log_date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND log_date <= ?";
    params.push(endDate);
  }

  query += " ORDER BY log_date ASC";

  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

app.post("/api/log", (req, res) => {
  const { habitId, date } = req.body;
  if (!habitId || !date) {
    return res.status(400).json({ error: "habitId and date are required" });
  }
  if (!req.user) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const habit = db.prepare(
    "SELECT id, max_per_day as maxPerDay, user_id FROM habits WHERE id = ?"
  ).get(habitId) as { id: number; maxPerDay: number; user_id: number | null } | undefined;

  if (!habit) {
    return res.status(404).json({ error: "Habit not found" });
  }

  const userId = req.user?.id ?? null;

  const existing = db.prepare(
    "SELECT count FROM habit_logs WHERE habit_id = ? AND log_date = ? AND user_id = ?"
  ).get(habitId, date, userId) as { count: number } | undefined;

  if (existing) {
    const newCount = Math.min(existing.count + 1, habit.maxPerDay);
    db.prepare("UPDATE habit_logs SET count = ? WHERE habit_id = ? AND log_date = ? AND user_id = ?")
      .run(newCount, habitId, date, userId);
  } else {
    db.prepare("INSERT INTO habit_logs (habit_id, log_date, count, user_id) VALUES (?, ?, 1, ?)")
      .run(habitId, date, userId);
  }

  res.json({ ok: true });
});

// ── Journal ─────────────────────────────────────────────

app.get("/api/journal", (req, res) => {
  const role = req.user?.role;
  const isAdmin = role === "admin";
  const isPsicologo = role === "psicologo";
  const userId = req.user?.id ?? null;

  let query = `SELECT j.id, j.fecha, j.hora, j.duracion, j.tipo_practica,
            j.estado_previo, j.fenomenologia_somatica, j.fenomenologia_cognitiva,
            j.cuerpo, j.insight, j.integracion, j.estado_post,
            j.energy_pre, j.valence_pre, j.energy_post, j.valence_post,
            j.created_at, j.user_id, ${(isAdmin || isPsicologo) ? "u.username" : "NULL as username"}
      FROM journal_entries j ${(isAdmin || isPsicologo) ? "LEFT JOIN users u ON j.user_id = u.id" : ""} WHERE 1=1`;
  const params: any[] = [];

  if (isAdmin) {
  } else if (isPsicologo) {
    query += ` AND (j.user_id = ? OR j.user_id IS NULL OR j.user_id IN (
      SELECT user_id FROM psicologo_users WHERE psicologo_id = ?
    ))`;
    params.push(userId, userId);
  } else {
    query += " AND (j.user_id = ? OR j.user_id IS NULL)";
    params.push(userId);
  }

  query += " ORDER BY j.fecha DESC, j.hora DESC";

  const entries = db.prepare(query).all(...params);
  res.json(entries);
});

app.post("/api/journal", async (req, res) => {
  const {
    fecha,
    hora,
    duracion,
    tipo_practica,
    estado_previo,
    fenomenologia_somatica,
    fenomenologia_cognitiva,
    cuerpo,
    insight,
    integracion,
    estado_post,
    energy_pre,
    valence_pre,
    energy_post,
    valence_post,
  } = req.body;

  // Backward compatibility: accept old "fenomenologia" field
  const somatica = fenomenologia_somatica || req.body.fenomenologia || "";
  const cognitiva = fenomenologia_cognitiva || "";

  if (!fecha || !tipo_practica || !estado_previo || !somatica || !estado_post) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!req.user) {
    return res.status(401).json({ error: "unauthorized" });
  }

  // Validate energy/valence range (-5 to 5) or null
  const validatedEnergyPre = validateEnergyValence(energy_pre);
  const validatedValencePre = validateEnergyValence(valence_pre);
  const validatedEnergyPost = validateEnergyValence(energy_post);
  const validatedValencePost = validateEnergyValence(valence_post);

  const userId = req.user?.id ?? null;

  try {
    const result = db.prepare(
      `INSERT INTO journal_entries (
        fecha, hora, duracion, tipo_practica,
        estado_previo, fenomenologia_somatica, fenomenologia_cognitiva,
        cuerpo, insight, integracion, estado_post,
        energy_pre, valence_pre, energy_post, valence_post, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      fecha,
      hora || "",
      Number(duracion) || 0,
      tipo_practica,
      estado_previo,
      somatica,
      cognitiva || null,
      cuerpo || null,
      insight || null,
      integracion || null,
      estado_post,
      validatedEnergyPre,
      validatedValencePre,
      validatedEnergyPost,
      validatedValencePost,
      userId
    );

    const entryId = result.lastInsertRowid;

    extractAndStoreStates(entryId as number, somatica, cognitiva)
      .catch((err) => console.error("State extraction failed:", err));

    res.status(201).json({ ok: true, id: entryId });
  } catch (err: any) {
    console.error("Database error:", err);
    res.status(500).json({ error: err.message || "Database error" });
  }
});

// Helper: validate energy/valence values (-5 to 5) or null
function validateEnergyValence(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  if (num < -5 || num > 5) return null;
  return Math.round(num);
}

app.delete("/api/journal/:id", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  const entry = db.prepare("SELECT user_id FROM journal_entries WHERE id = ?").get(id) as any;
  if (!entry) return res.status(404).json({ error: "Not found" });
  if (req.user?.role === "admin" || entry.user_id === req.user?.id) {
    db.prepare("DELETE FROM journal_entries WHERE id = ?").run(id);
    return res.json({ ok: true });
  }
  res.status(403).json({ error: "Forbidden" });
});

app.put("/api/journal/:id", (req, res) => {
  const id = Number(req.params.id);
  const {
    fecha,
    hora,
    duracion,
    tipo_practica,
    estado_previo,
    fenomenologia_somatica,
    fenomenologia_cognitiva,
    cuerpo,
    insight,
    integracion,
    estado_post,
    energy_pre,
    valence_pre,
    energy_post,
    valence_post,
  } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  if (!req.user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const entry = db.prepare("SELECT user_id FROM journal_entries WHERE id = ?").get(id) as any;
  if (!entry) return res.status(404).json({ error: "Not found" });
  if (req.user.role !== "admin" && entry.user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Backward compatibility
  const somatica = fenomenologia_somatica || req.body.fenomenologia || "";
  const cognitiva = fenomenologia_cognitiva || "";

  if (!fecha || !tipo_practica || !estado_previo || !somatica || !estado_post) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate energy/valence
  const validatedEnergyPre = validateEnergyValence(energy_pre);
  const validatedValencePre = validateEnergyValence(valence_pre);
  const validatedEnergyPost = validateEnergyValence(energy_post);
  const validatedValencePost = validateEnergyValence(valence_post);

  try {
    db.prepare(
      `UPDATE journal_entries SET
        fecha = ?, hora = ?, duracion = ?, tipo_practica = ?,
        estado_previo = ?, fenomenologia_somatica = ?, fenomenologia_cognitiva = ?,
        cuerpo = ?, insight = ?, integracion = ?, estado_post = ?,
        energy_pre = ?, valence_pre = ?, energy_post = ?, valence_post = ?
      WHERE id = ?`
    ).run(
      fecha,
      hora || "",
      Number(duracion) || 0,
      tipo_practica,
      estado_previo,
      somatica,
      cognitiva || null,
      cuerpo || null,
      insight || null,
      integracion || null,
      estado_post,
      validatedEnergyPre,
      validatedValencePre,
      validatedEnergyPost,
      validatedValencePost,
      id
    );

    // Re-extract states on update
    extractAndStoreStates(id, somatica, cognitiva).catch((err) => {
      console.error("State re-extraction failed:", err);
    });

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Database error" });
  }
});

// ── State Extraction ───────────────────────────────────

const SOMATIC_PROMPT = `You are a somatic state classifier. Classify body sensations into ONE category.

Allowed values: fatigue, low_energy, neutral, alert, high_energy, tension, relaxed, restless

Output ONLY valid JSON:
{"somatic": "value"}

Input: {{TEXT}}`;

const COGNITIVE_PROMPT = `You are a cognitive pattern classifier. Classify thinking patterns into ONE category.

Allowed values: rumination, overthinking, analytical, mental_fog, clear, insight_oriented

Output ONLY valid JSON:
{"cognition": "value"}

Input: {{TEXT}}`;

const EMOTIONAL_ATTENTION_PROMPT = `You are a dual classifier. Classify emotional state and attention stability.

Emotional allowed: anxiety, stress, calm, neutral, irritability, contentment
Attention allowed: distracted, scattered, unstable_attention, sustained_attention, focused, hyperfocused

Output ONLY valid JSON:
{"emotional": "value", "attention": "value"}

Input: {{TEXT}}`;

async function callOllama(prompt: string): Promise<string> {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3",
      prompt,
      stream: false,
      format: "json",
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`);
  }

  const data = await response.json() as { response?: string };
  return data.response || "";
}

function parseJsonSafe(text: string): Record<string, string> {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return {};
}

async function extractAndStoreStates(
  entryId: number,
  somatica: string,
  cognitiva: string
) {
  if (!somatica && !cognitiva) return;

  let somatic = "neutral";
  let cognition = "neutral";
  let emotional = "neutral";
  let attention = "neutral";

  try {
    if (somatica) {
      try {
        const promptA = SOMATIC_PROMPT.replace("{{TEXT}}", somatica);
        const rawA = await callOllama(promptA);
        const parsedA = parseJsonSafe(rawA);
        somatic = parsedA.somatic || "neutral";
      } catch (e) {
        console.error("Somatic extraction failed:", e);
      }
    }

    if (cognitiva) {
      try {
        const promptB = COGNITIVE_PROMPT.replace("{{TEXT}}", cognitiva);
        const rawB = await callOllama(promptB);
        const parsedB = parseJsonSafe(rawB);
        cognition = parsedB.cognition || "neutral";
      } catch (e) {
        console.error("Cognition extraction failed:", e);
      }

      try {
        const promptC = EMOTIONAL_ATTENTION_PROMPT.replace("{{TEXT}}", cognitiva);
        const rawC = await callOllama(promptC);
        const parsedC = parseJsonSafe(rawC);
        emotional = parsedC.emotional || "neutral";
        attention = parsedC.attention || "neutral";
      } catch (e) {
        console.error("Emotional/Attention extraction failed:", e);
      }
    }
  } catch (e) {
    console.error("State extraction error:", e);
  }

  try {
    db.prepare(
      `INSERT INTO inferred_states (entry_id, somatic, emotional, attention, cognition)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(entry_id) DO UPDATE SET
         somatic = excluded.somatic,
         emotional = excluded.emotional,
         attention = excluded.attention,
         cognition = excluded.cognition`
    ).run(entryId, somatic, emotional, attention, cognition);
  } catch (e) {
    console.error("Failed to store states:", e);
  }

  try {
    await generateAndStoreEmbeddings(entryId, { emotional, attention, cognition });
  } catch (e) {
    console.error("Embedding generation failed:", e);
  }
}

// ── Embeddings ─────────────────────────────────────────

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch("http://localhost:11434/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding error: ${response.statusText}`);
  }

  const data = await response.json() as { embedding?: number[] };
  return data.embedding || [];
}

async function generateAndStoreEmbeddings(
  entryId: number,
  states: { emotional: string; attention: string; cognition: string }
) {
  const embeddingFields = [
    { field: "emotional", value: states.emotional },
    { field: "attention", value: states.attention },
    { field: "cognition", value: states.cognition },
  ];

  for (const { field, value } of embeddingFields) {
    try {
      // Format: "emotional:{value} attention:{value} cognition:{value}"
      const embeddingInput = `emotional:${states.emotional} attention:${states.attention} cognition:${states.cognition}`;
      const embedding = await getEmbedding(embeddingInput);

      db.prepare(
        `INSERT INTO entry_embeddings (entry_id, field, embedding)
         VALUES (?, ?, ?)
         ON CONFLICT(entry_id, field) DO UPDATE SET
           embedding = excluded.embedding`
      ).run(entryId, field, JSON.stringify(embedding));
    } catch (e) {
      console.error(`Embedding generation failed for ${field}:`, e);
    }
  }
}

// ── Get Inferred States ────────────────────────────────

app.get("/api/journal/:id/states", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const states = db.prepare(
    "SELECT somatic, emotional, attention, cognition FROM inferred_states WHERE entry_id = ?"
  ).get(id);

  res.json(states || null);
});

app.get("/api/journal/:id/embeddings", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const embeddings = db.prepare(
    "SELECT field, embedding FROM entry_embeddings WHERE entry_id = ?"
  ).all(id);

  res.json(embeddings);
});

// ── Visualization Data ─────────────────────────────────

app.get("/api/journal/stats/energy-valence", (req, res) => {
  const role = req.user?.role;
  const isAdminOrPsicologo = role === "admin" || role === "psicologo";
  const userId = req.user?.id ?? null;

  let query = `SELECT id, fecha, tipo_practica, energy_pre, valence_pre, energy_post, valence_post, user_id
     FROM journal_entries
     WHERE (energy_pre IS NOT NULL OR valence_pre IS NOT NULL
         OR energy_post IS NOT NULL OR valence_post IS NOT NULL)`;
  const params: any[] = [];

  if (!isAdminOrPsicologo) {
    query += " AND (user_id = ? OR user_id IS NULL)";
    params.push(userId);
  }

  query += " ORDER BY fecha DESC LIMIT 50";

  const entries = db.prepare(query).all(...params);
  res.json(entries);
});

// ── Admin: All Users ─────────────────────────────────────

app.get("/api/admin/users", (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "admin only" });
  }
  const users = db.prepare(
    "SELECT id, username, role, created_at FROM users ORDER BY created_at ASC"
  ).all();
  res.json(users);
});

app.post("/api/admin/users", async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "admin only" });
  }
  const { username, password, role = "user" } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }
  if (["user", "psicologo", "admin"].indexOf(role) === -1) {
    return res.status(400).json({ error: "invalid role" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return res.status(409).json({ error: "username already exists" });
  }
  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(username, hash, role);
  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

app.patch("/api/admin/users/:id", async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "admin only" });
  }
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "invalid id" });
  const { password, role } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    updates.push("password_hash = ?");
    params.push(hash);
  }
  if (role && ["user", "psicologo", "admin"].indexOf(role) !== -1) {
    updates.push("role = ?");
    params.push(role);
  }
  if (updates.length === 0) return res.status(400).json({ error: "nothing to update" });
  params.push(id);
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

app.delete("/api/admin/users/:id", (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "admin only" });
  }
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "invalid id" });
  if (id === req.user.id) return res.status(400).json({ error: "cannot delete yourself" });
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.get("/api/admin/entries", (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "admin only" });
  }
  const { username } = req.query;
  let query = `SELECT j.*, u.username FROM journal_entries j
               LEFT JOIN users u ON j.user_id = u.id WHERE 1=1`;
  const params: any[] = [];
  if (username) {
    query += " AND u.username = ?";
    params.push(username);
  }
  query += " ORDER BY j.fecha DESC, j.hora DESC";
  const entries = db.prepare(query).all(...params);
  res.json(entries);
});

// ── Practices (per user) ──────────────────────────────────

app.get("/api/practices", (req, res) => {
  const userId = req.user?.id ?? null;
  const practices = db.prepare(
    "SELECT slug, label FROM practices WHERE user_id IS NULL OR user_id = ? ORDER BY user_id DESC, label ASC"
  ).all(userId);
  res.json(practices);
});

app.post("/api/practices", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  const { slug, label } = req.body;
  if (!slug || !label) return res.status(400).json({ error: "slug and label required" });
  const slugified = slug.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  const existing = db.prepare("SELECT id FROM practices WHERE (user_id = ? OR user_id IS NULL) AND slug = ?").get(req.user.id, slugified) as any;
  if (existing) return res.status(409).json({ error: "practice already exists" });
  db.prepare("INSERT INTO practices (user_id, slug, label) VALUES (?, ?, ?)").run(req.user.id, slugified, label.trim());
  res.status(201).json({ ok: true, slug: slugified, label: label.trim() });
});

app.delete("/api/practices/:slug", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  const { slug } = req.params;
  const deleted = db.prepare("DELETE FROM practices WHERE user_id = ? AND slug = ?").run(req.user.id, slug);
  if (deleted.changes === 0) return res.status(404).json({ error: "practice not found or not yours" });
  res.json({ ok: true });
});

// ── Psicologo-User Assignments ───────────────────────────

app.get("/api/psicologo/users", (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "admin only" });
  const psicologos = db.prepare(
    "SELECT id, username FROM users WHERE role = 'psicologo' ORDER BY username"
  ).all() as any[];
  const users = db.prepare(
    "SELECT id, username FROM users WHERE role = 'user' ORDER BY username"
  ).all() as any[];
  const assignments = db.prepare(
    "SELECT psicologo_id, user_id FROM psicologo_users"
  ).all() as any[];
  const map: Record<number, number[]> = {};
  for (const a of assignments) {
    if (!map[a.psicologo_id]) map[a.psicologo_id] = [];
    map[a.psicologo_id].push(a.user_id);
  }
  res.json({ psicologos, users, assignments: map });
});

app.post("/api/psicologo/assign", (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "admin only" });
  const { psicologoId, userId } = req.body;
  if (!psicologoId || !userId) return res.status(400).json({ error: "psicologoId and userId required" });
  const psicologo = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'psicologo'").get(psicologoId);
  if (!psicologo) return res.status(400).json({ error: "invalid psicologo" });
  const targetUser = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'user'").get(userId);
  if (!targetUser) return res.status(400).json({ error: "invalid user" });
  db.prepare("INSERT OR IGNORE INTO psicologo_users (psicologo_id, user_id) VALUES (?, ?)").run(psicologoId, userId);
  res.json({ ok: true });
});

app.post("/api/psicologo/unassign", (req, res) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "admin only" });
  const { psicologoId, userId } = req.body;
  if (!psicologoId || !userId) return res.status(400).json({ error: "psicologoId and userId required" });
  db.prepare("DELETE FROM psicologo_users WHERE psicologo_id = ? AND user_id = ?").run(psicologoId, userId);
  res.json({ ok: true });
});

// ── Start ───────────────────────────────────────────────

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`API server running on http://0.0.0.0:${PORT}`);
});