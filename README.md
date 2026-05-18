# Psychonaut Log

Una bitácora personal para registrar y analizar prácticas psiconáuticas (meditación, visualización, autoindagación). El proyecto integra tracking de hábitos, registro fenomenológico estructurado, clasificación cognitiva con IA local y embeddings para búsqueda semántica futura.

---

## Arquitectura del Proyecto

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Astro)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │   Pages     │  │  Components  │  │  React Components │  │
│  │  inicio     │  │  Header      │  │  LorenzGraph      │  │
│  │  journal    │  │  BottomNav   │  │  Brain            │  │
│  │  habits     │  │  Footer      │  │  NetworkGraph     │  │
│  │  stats      │  │  Hero        │  │  LorenzAttractor  │  │
│  │  admin      │  │  ...         │  │                   │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
│                          │                                   │
│                    src/lib/api.ts (API client)              │
└──────────────────────────┬──────────────────────────────────┘
                           │ proxy /api → localhost:3001
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND (Express/Node)                    │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  Auth        │  │  Journal       │  │  Habits/Logs      │  │
│  │  Sessions    │  │  Classifier    │  │  Practices       │  │
│  │  Users       │  │  Ollama Proxy  │  │  Psicologo mgmt  │  │
│  └──────────────┘  └────────────────┘  └──────────────────┘  │
│                          │                                    │
│                    db.ts + SQLite                            │
│                    (data/habits.db)                         │
└──────────────────────────┬───────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌────────────┐  ┌─────────────┐  ┌──────────────┐
   │   Ollama   │  │  Python     │  │  External    │
   │ (llama3)   │  │  (Whisper)  │  │  Services    │
   │  :11434    │  │  :5000      │  │              │
   └────────────┘  └─────────────┘  └──────────────┘
```

---

## Stack Tecnológico

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Astro** | 6.1.8 | Framework principal, SSG/SSR |
| **React** | 19.2.5 | Componentes interactivos (islands) |
| **Tailwind CSS** | 4.2.2 | Estilos utility-first |
| **Three.js** | 0.184.0 | Visualizaciones 3D |
| **D3.js** | 7.9.0 | Visualizaciones de datos |
| **Anime.js** | 4.4.1 | Animaciones |
| **@react-three/*** | 10.7.7 | React bindings para Three.js |

### Backend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Express** | 4.21.2 | Servidor API REST |
| **better-sqlite3** | 12.9.0 | Base de datos SQLite |
| **bcryptjs** | 2.4.3 | Hash de passwords |
| **multer** | 2.1.1 | Upload de archivos (audio) |
| **uuid** | 11.1.0 | Tokens de sesión |
| **tsx** | 4.19.2 | Desarrollo con hot-reload |

### AI/ML (Ollama)
| Tecnología | Modelo | Uso |
|------------|--------|-----|
| **Ollama** | llama3:8b | Clasificación cognitiva, chat |
| **Ollama** | nomic-embed-text | Embeddings vectoriales |
| **Faster-Whisper** | - | Transcripción de audio (:5000) |

---

## Base de Datos (SQLite)

### Tablas

```sql
-- Users y autenticación
users(id, username, password_hash, role, created_at)
sessions(id, user_id, token, expires_at, created_at)

-- Hábitos
habits(id, name, color, max_per_day, user_id, created_at)
habit_logs(id, habit_id, log_date, count, user_id)

-- Prácticas
practices(id, user_id, slug, label, created_at)

-- Journal
journal_entries(id, fecha, hora, duracion, tipo_practica,
  estado_previo, fenomenologia_somatica, fenomenologia_cognitiva,
  cuerpo, insight, integracion, estado_post,
  energy_pre, valence_pre, energy_post, valence_post,
  user_id, created_at)

-- Estados inferidos por IA
inferred_states(entry_id, somatic, emotional, attention, cognition)

-- Embeddings vectoriales
entry_embeddings(entry_id, field, embedding)

-- Gestión psicólogo-usuario
psicologo_users(psicologo_id, user_id, assigned_at)

-- Transcripciones de voz
voice_transcriptions(id, filename, transcript, language, duration, created_at)
```

### Campos Energy/Valence
- **Energy**: -5 (fatiga máxima) a +5 (alta energía)
- **Valence**: -5 (negativo) a +5 (positivo)

---

## API Endpoints

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Crear usuario (admin) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Usuario actual |
| POST | `/api/auth/change-password` | Cambiar password |

### Journal
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/journal` | Listar entradas |
| POST | `/api/journal` | Crear entrada |
| PUT | `/api/journal/:id` | Editar entrada (admin) |
| DELETE | `/api/journal/:id` | Eliminar entrada (admin) |
| GET | `/api/journal/:id/states` | Estados inferidos |
| GET | `/api/journal/:id/embeddings` | Embeddings de entrada |

### Hábitos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/habits` | Listar hábitos |
| POST | `/api/habits` | Crear hábito |
| PUT | `/api/habits/:id` | Editar hábito |
| DELETE | `/api/habits/:id` | Eliminar hábito |

### Logs de Hábitos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/logs` | Listar logs |
| POST | `/api/log` | Incrementar count |
| DELETE | `/api/log` | Decrementar count |

### Clasificación IA
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/classify` | Clasificar texto |

### Otros
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/users` | Listar usuarios |
| POST | `/api/admin/users` | Crear usuario |
| PATCH | `/api/admin/users/:id` | Actualizar usuario |
| DELETE | `/api/admin/users/:id` | Eliminar usuario |
| GET | `/api/admin/entries` | Todas las entradas (admin) |
| GET | `/api/practices` | Listar prácticas |
| POST | `/api/practices` | Crear práctica |
| DELETE | `/api/practices/:slug` | Eliminar práctica |
| POST | `/api/psicologo/assign` | Asignar usuario a psicólogo |
| POST | `/api/psicologo/unassign` | Desasignar |
| POST | `/api/transcribe` | Transcribir audio |
| GET | `/api/transcriptions` | Historial transcripciones |
| POST | `/api/chat` | Proxy Ollama chat |
| GET | `/api/journal/stats/energy-valence` | Stats energy/valence |

---

## Roles de Usuario

| Rol | Permisos |
|-----|----------|
| **user** | CRUD propias entradas, hábitos, prácticas |
| **psicologo** | Ver entradas de usuarios asignados |
| **admin** | Gestión completa de usuarios y entradas |

---

## Clasificación de Estados (Ollama)

### Prompts y Outputs

| Prompt | Input | Output |
|--------|-------|--------|
| **Somatic** | fenomenologia_somatica | `{ "somatic": "..." }` |
| **Cognitive** | fenomenologia_cognitiva | `{ "cognition": "..." }` |
| **Emotional+Attention** | fenomenologia_cognitiva | `{ "emotional": "...", "attention": "..." }` |

### Valores Permitidos

**Somatic:** fatigue, low_energy, neutral, alert, high_energy, tension, relaxed, restless

**Emotional:** anxiety, stress, calm, neutral, irritability, contentment

**Attention:** distracted, scattered, unstable_attention, sustained_attention, focused, hyperfocused

**Cognition:** rumination, overthinking, analytical, mental_fog, clear, insight_oriented

---

## Páginas del Frontend

| Ruta | Descripción |
|------|-------------|
| `/` | Landing page |
| `/inicio` | Dashboard principal |
| `/practica` | Nueva entrada de práctica |
| `/practica_guiada` | Práctica guiada |
| `/journal` | Lista de entradas |
| `/habits` | Tracking de hábitos |
| `/stats` | Estadísticas y gráficos |
| `/admin` | Panel de administración |
| `/clasificador` | Clasificador cognitivo |
| `/about` | Información del proyecto |
| `/contact` | Contacto |

---

## Requisitos

1. **Node.js** >= 22.12.0
2. **pnpm** >= 9.0.0
3. **Ollama** corriendo (`ollama serve`)
4. Modelos Ollama:
   - `ollama pull llama3`
   - `ollama pull nomic-embed-text`
5. (Opcional) Python service con Faster-Whisper en `:5000`

---

## Comandos

```bash
# Desarrollo (frontend + backend)
pnpm run dev

# Solo frontend
pnpm run dev:web

# Solo backend
pnpm run dev:api

# Build producción
pnpm run build

# Preview
pnpm run preview
```

---

## Estructura de Archivos

```
psyconaut_log/
├── astro.config.mjs          # Config Astro + Vite proxy
├── package.json              # Deps frontend
├── pnpm-workspace.yaml
├── tsconfig.json
├── DESIGN.md
├── README.md
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── server.ts             # API Express completa
│   ├── db.ts                 # SQLite + migraciones
│   ├── schema.sql            # Schema inicial
│   ├── seed.ts               # Seed data
│   └── *.ts                  # Scripts utilitarios
│
├── src/
│   ├── pages/
│   │   ├── index.astro
│   │   ├── inicio.astro
│   │   ├── practica.astro
│   │   ├── practica_guiada.astro
│   │   ├── journal.astro
│   │   ├── habits.astro
│   │   ├── stats.astro
│   │   ├── admin.astro
│   │   ├── clasificador.astro
│   │   ├── about.astro
│   │   └── contact.astro
│   │
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── BottomNav.astro
│   │   ├── Hero.astro
│   │   ├── Welcome.astro
│   │   ├── LogoSvg.astro
│   │   ├── Tecnicas.astro
│   │   ├── CalendarView.astro
│   │   ├── HabitGrid.astro
│   │   ├── HabitForm.astro
│   │   ├── JournalList.astro
│   │   ├── StatsPanel.astro
│   │   ├── NetworkGraph.astro
│   │   ├── Lorenz.js
│   │   ├── LorenzGraph.tsx
│   │   ├── LorenzAttractor.tsx
│   │   └── brain.tsx
│   │
│   ├── layouts/
│   │   └── Layout.astro
│   │
│   ├── lib/
│   │   ├── api.ts            # Cliente API
│   │   └── dates.ts
│   │
│   └── types/
│       └── habit.ts
│
├── data/                      # SQLite DB
├── uploads/                   # Archivos subidos
└── public/                    # Assets estáticos
```

---

## Próximas Posibilidades

1. **Búsqueda semántica** - Query vectorial entre entradas
2. **Graph de conocimientos** - Conexiones entre insights
3. **Dashboard cognitivo** - Evolución de estados en el tiempo
4. **Recomendaciones** - Sugerencias basadas en patrones