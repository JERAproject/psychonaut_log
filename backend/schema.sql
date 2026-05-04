CREATE TABLE IF NOT EXISTS habits(
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  max_per_day INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS journal_entries(
  id INTEGER PRIMARY KEY,
  fecha DATE NOT NULL,
  hora TIME,
  duracion INTEGER,
  tipo_practica TEXT NOT NULL,
  estado_previo TEXT NOT NULL,
  fenomenologia TEXT NOT NULL,
  cuerpo TEXT,
  insight TEXT,
  integracion TEXT,
  estado_post TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inferred_states (
  entry_id INTEGER,
  somatic TEXT,
  emotional TEXT,
  attention TEXT,
  cognition TEXT
);