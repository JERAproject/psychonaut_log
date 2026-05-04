import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());

// ── Habits ──────────────────────────────────────────────

app.get("/api/habits", (_req, res) => {
  const habits = db.prepare(
    "SELECT id, name, color, max_per_day as maxPerDay FROM habits"
  ).all();
  res.json(habits);
});

app.post("/api/habits", (req, res) => {
  const { name, color, maxPerDay } = req.body;
  if (!name || !color) {
    return res.status(400).json({ error: "name and color are required" });
  }
  const max = Math.max(1, Math.min(Number(maxPerDay) || 1, 99));
  db.prepare(
    "INSERT INTO habits (name, color, max_per_day) VALUES (?, ?, ?)"
  ).run(name, color, max);
  res.status(201).json({ ok: true });
});

app.delete("/api/habits/:id", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  db.prepare("DELETE FROM habit_logs WHERE habit_id = ?").run(id);
  db.prepare("DELETE FROM habits WHERE id = ?").run(id);
  res.json({ ok: true });
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
  const max = Math.max(1, Math.min(Number(maxPerDay) || 1, 99));
  db.prepare(
    "UPDATE habits SET name = ?, color = ?, max_per_day = ? WHERE id = ?"
  ).run(name, color, max, id);
  res.json({ ok: true });
});

// ── Habit Logs ──────────────────────────────────────────

app.get("/api/logs", (req, res) => {
  const { habitId, startDate, endDate } = req.query;
  let query =
    "SELECT habit_id as habitId, log_date as logDate, count FROM habit_logs WHERE 1=1";
  const params: any[] = [];

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

  query += " ORDER BY log_date DESC";

  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

app.post("/api/log", (req, res) => {
  const { habitId, date } = req.body;
  if (!habitId || !date) {
    return res.status(400).json({ error: "habitId and date are required" });
  }

  const habit = db.prepare(
    "SELECT id, max_per_day as maxPerDay FROM habits WHERE id = ?"
  ).get(habitId) as { id: number; maxPerDay: number } | undefined;

  if (!habit) {
    return res.status(404).json({ error: "Habit not found" });
  }

  db.prepare(
    `INSERT INTO habit_logs (habit_id, log_date, count) VALUES (?, ?, 1)
     ON CONFLICT (habit_id, log_date)
     DO UPDATE SET count = MIN(count + 1, ?)`
  ).run(habitId, date, habit.maxPerDay);

  res.json({ ok: true });
});

// ── Journal ─────────────────────────────────────────────

app.get("/api/journal", (_req, res) => {
  const entries = db.prepare(
    `SELECT id, fecha, hora, duracion, tipo_practica,
            estado_previo, fenomenologia, cuerpo,
            insight, integracion, estado_post, created_at
     FROM journal_entries ORDER BY fecha DESC, hora DESC`
  ).all();
  res.json(entries);
});

app.post("/api/journal", (req, res) => {
  const { fecha, hora, duracion, tipo_practica, estado_previo, fenomenologia, cuerpo, insight, integracion, estado_post } = req.body;

  if (!fecha || !tipo_practica || !estado_previo || !fenomenologia || !estado_post) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    db.prepare(
      `INSERT INTO journal_entries (
        fecha, hora, duracion, tipo_practica,
        estado_previo, fenomenologia, cuerpo,
        insight, integracion, estado_post
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      fecha,
      hora || "",
      Number(duracion) || 0,
      tipo_practica,
      estado_previo,
      fenomenologia,
      cuerpo || null,
      insight || null,
      integracion || null,
      estado_post
    );
    res.status(201).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Database error" });
  }
});

app.delete("/api/journal/:id", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  db.prepare("DELETE FROM journal_entries WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.put("/api/journal/:id", (req, res) => {
  const id = Number(req.params.id);
  const { fecha, hora, duracion, tipo_practica, estado_previo, fenomenologia, cuerpo, insight, integracion, estado_post } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  if (!fecha || !tipo_practica || !estado_previo || !fenomenologia || !estado_post) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    db.prepare(
      `UPDATE journal_entries SET
        fecha = ?, hora = ?, duracion = ?, tipo_practica = ?,
        estado_previo = ?, fenomenologia = ?, cuerpo = ?,
        insight = ?, integracion = ?, estado_post = ?
      WHERE id = ?`
    ).run(
      fecha,
      hora || "",
      Number(duracion) || 0,
      tipo_practica,
      estado_previo,
      fenomenologia,
      cuerpo || null,
      insight || null,
      integracion || null,
      estado_post,
      id
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Database error" });
  }
});

// ── Cognitive State Classifier ───────────────────────────

const CLASSIFIER_PROMPT = `You are a cognitive state classifier. Classify the following input text into four dimensions.

Somatic (body state): fatigue, low_energy, neutral, alert, high_energy, tension, relaxed, restless
Emotional (affective state): anxiety, stress, calm, neutral, irritability, contentment
Attention (focus stability): distracted, scattered, unstable_attention, sustained_attention, focused, hyperfocused
Cognition (thinking pattern): rumination, overthinking, analytical, mental_fog, clear, insight_oriented

Output ONLY valid JSON in this exact format:
{
  "somatic": "value",
  "emotional": "value",
  "attention": "value",
  "cognition": "value"
}

Input: {{TEXT}}`;

function buildPrompt(text: string) {
  return CLASSIFIER_PROMPT.replace("{{TEXT}}", text);
}

app.post("/api/classify", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const ollamaRes = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt: buildPrompt(text),
        stream: false,
        format: "json",
      }),
    });

    if (!ollamaRes.ok) {
      const err = await ollamaRes.text();
      return res.status(502).json({ error: "Ollama error: " + err });
    }

    const data = await ollamaRes.json() as { response?: string };
    const response = data.response || "";

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(response);
    } catch {
      return res.status(500).json({ error: "Invalid JSON from model" });
    }

    res.json({
      somatic: parsed.somatic || "neutral",
      emotional: parsed.emotional || "neutral",
      attention: parsed.attention || "neutral",
      cognition: parsed.cognition || "neutral",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Classification failed" });
  }
});

// ── Start ───────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
