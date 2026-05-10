CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

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
  user_id INTEGER,

  UNIQUE(habit_id, log_date, user_id),

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
  fenomenologia_somatica TEXT NOT NULL,
  fenomenologia_cognitiva TEXT,
  cuerpo TEXT,
  insight TEXT,
  integracion TEXT,
  estado_post TEXT NOT NULL,
  energy_pre INTEGER,
  valence_pre INTEGER,
  energy_post INTEGER,
  valence_post INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER
);

CREATE TABLE IF NOT EXISTS inferred_states(
  entry_id INTEGER PRIMARY KEY,
  somatic TEXT,
  emotional TEXT,
  attention TEXT,
  cognition TEXT,

  FOREIGN KEY(entry_id)
  REFERENCES journal_entries(id)
  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entry_embeddings(
  entry_id INTEGER NOT NULL,
  field TEXT NOT NULL,
  embedding TEXT NOT NULL,
  PRIMARY KEY(entry_id, field),
  FOREIGN KEY(entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
);