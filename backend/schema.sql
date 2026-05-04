-- Habits table
CREATE TABLE IF NOT EXISTS habits(
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  max_per_day INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Habit logs table
CREATE TABLE IF NOT EXISTS habit_logs(
  id INTEGER PRIMARY KEY,
  habit_id INTEGER NOT NULL,
  log_date DATE NOT NULL,
  count INTEGER DEFAULT 0,

  UNIQUE(habit_id, log_date),

  FOREIGN KEY(habit_id)
  REFERENCES habits(id)
  ON DELETE CASCADE
);

-- Journal entries table - updated with structured phenomenology + continuous dimensions
CREATE TABLE IF NOT EXISTS journal_entries(
  id INTEGER PRIMARY KEY,
  fecha DATE NOT NULL,
  hora TIME,
  duracion INTEGER,
  tipo_practica TEXT NOT NULL,
  estado_previo TEXT NOT NULL,
  fenomenologia_somatica TEXT NOT NULL,
  fenomenologia_cognitiva TEXT,
  cuerpo TEXT,
  insight TEXT,
  integracion TEXT,
  estado_post TEXT NOT NULL,
  energy_pre INTEGER CHECK (energy_pre IS NULL OR (energy_pre >= -5 AND energy_pre <= 5)),
  valence_pre INTEGER CHECK (valence_pre IS NULL OR (valence_pre >= -5 AND valence_pre <= 5)),
  energy_post INTEGER CHECK (energy_post IS NULL OR (energy_post >= -5 AND energy_post <= 5)),
  valence_post INTEGER CHECK (valence_post IS NULL OR (valence_post >= -5 AND valence_post <= 5)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inferred states - one row per journal entry
CREATE TABLE IF NOT EXISTS inferred_states (
  entry_id INTEGER PRIMARY KEY,
  somatic TEXT,
  emotional TEXT,
  attention TEXT,
  cognition TEXT,

  FOREIGN KEY(entry_id)
  REFERENCES journal_entries(id)
  ON DELETE CASCADE
);

-- Entry embeddings - multiple embeddings per entry for semantic search
CREATE TABLE IF NOT EXISTS entry_embeddings (
  entry_id INTEGER NOT NULL,
  field TEXT NOT NULL,
  embedding TEXT NOT NULL,

  PRIMARY KEY (entry_id, field),

  FOREIGN KEY(entry_id)
  REFERENCES journal_entries(id)
  ON DELETE CASCADE
);