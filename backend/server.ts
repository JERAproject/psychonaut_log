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
            estado_previo, fenomenologia_somatica, fenomenologia_cognitiva,
            cuerpo, insight, integracion, estado_post,
            energy_pre, valence_pre, energy_post, valence_post,
            created_at
      FROM journal_entries ORDER BY fecha DESC, hora DESC`
  ).all();
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

  // Validate energy/valence range (-5 to 5) or null
  const validatedEnergyPre = validateEnergyValence(energy_pre);
  const validatedValencePre = validateEnergyValence(valence_pre);
  const validatedEnergyPost = validateEnergyValence(energy_post);
  const validatedValencePost = validateEnergyValence(valence_post);

  try {
    const result = db.prepare(
      `INSERT INTO journal_entries (
        fecha, hora, duracion, tipo_practica,
        estado_previo, fenomenologia_somatica, fenomenologia_cognitiva,
        cuerpo, insight, integracion, estado_post,
        energy_pre, valence_pre, energy_post, valence_post
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
      validatedValencePost
    );

    const entryId = result.lastInsertRowid;

    // Extract states and generate embeddings (async, don't block response)
    extractAndStoreStates(entryId as number, somatica, cognitiva).catch((err) => {
      console.error("State extraction failed:", err);
    });

    res.status(201).json({ ok: true, id: entryId });
  } catch (err: any) {
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
  db.prepare("DELETE FROM journal_entries WHERE id = ?").run(id);
  res.json({ ok: true });
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

  // A) Extract somatic from fenomenologia_somatica
  let somatic = "neutral";
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

  // B) Extract cognition from fenomenologia_cognitiva
  let cognition = "neutral";
  if (cognitiva) {
    try {
      const promptB = COGNITIVE_PROMPT.replace("{{TEXT}}", cognitiva);
      const rawB = await callOllama(promptB);
      const parsedB = parseJsonSafe(rawB);
      cognition = parsedB.cognition || "neutral";
    } catch (e) {
      console.error("Cognition extraction failed:", e);
    }
  }

  // C) Extract emotional + attention from fenomenologia_cognitiva
  let emotional = "neutral";
  let attention = "neutral";
  if (cognitiva) {
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

  // Store in inferred_states (UPSERT)
  db.prepare(
    `INSERT INTO inferred_states (entry_id, somatic, emotional, attention, cognition)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(entry_id) DO UPDATE SET
       somatic = excluded.somatic,
       emotional = excluded.emotional,
       attention = excluded.attention,
       cognition = excluded.cognition`
  ).run(entryId, somatic, emotional, attention, cognition);

  // Generate embeddings for emotional, attention, cognition
  await generateAndStoreEmbeddings(entryId, { emotional, attention, cognition });
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

app.get("/api/journal/stats/energy-valence", (_req, res) => {
  const entries = db.prepare(
    `SELECT id, fecha, tipo_practica, energy_pre, valence_pre, energy_post, valence_post
     FROM journal_entries
     WHERE (energy_pre IS NOT NULL OR valence_pre IS NOT NULL 
         OR energy_post IS NOT NULL OR valence_post IS NOT NULL)
     ORDER BY fecha DESC
     LIMIT 50`
  ).all();
  res.json(entries);
});

// ── Start ───────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});