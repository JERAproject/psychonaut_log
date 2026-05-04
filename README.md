# Psychonaut Log

Una bitácora personal para registrar y analizar prácticas psiconáuticas (meditación, visualización, autoindagación). El proyecto integra tracking de hábitos, registro fenomenológico estructurado, clasificación cognitiva con IA local y embeddings para búsqueda semántica futura.

---

## 🌟 Visión del Proyecto

**Psychonaut Log** es una aplicación de bitácora personal para registrar y analizar prácticas psiconáuticas. El proyecto integra:

- 🧘 **Seguimiento de prácticas** - Registro fenomenológico estructurado
- 📊 **Hábitos** - Tracking de comportamientos diarios
- 🧠 **Clasificador cognitivo** - IA local (Ollama + Llama3) para análisis de estados
- 🔗 **Embeddings** - Almacenamiento vectorial para búsqueda semántica futura

---

## 🏗️ ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Astro)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  /index  │  │ /practica│  │ /journal │  │ /habits  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │              │
│       └─────────────┴─────────────┴─────────────┘              │
│                           │                                     │
│                    ┌──────┴──────┐                              │
│                    │  API Calls   │                              │
│                    │ (fetch API)  │                              │
│                    └──────┬──────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │ localhost:3001
┌───────────────────────────┼─────────────────────────────────────┐
│                     BACKEND (Express)                          │
│                           │                                     │
│  ┌────────────────────────┼─────────────────────────────────┐  │
│  │                    Routes & Logic                         │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐  │  │
│  │  │ /habits │  │ /logs   │  │/journal │  │/classify    │  │  │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬──────┘  │  │
│  └───────┼────────────┼────────────┼──────────────┼──────────┘  │
│          │            │            │               │             │
│          └────────────┴────────────┴───────────────┘             │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    │   SQLite (db.js)  │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼─────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────┴─────┐         ┌──────┴──────┐        ┌────┴─────┐
   │ Ollama   │         │   Schema     │        │  Models  │
   │ (LLM)    │         │   (SQLite)   │        │ (Llama3) │
   └──────────┘         └──────────────┘        └──────────┘
```

---

## 📦 ESTACK TECNOLÓGICO

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Astro** | 6.1.8 | Framework principal, SSG |
| **React** | 19.2.5 | Componentes interactivos |
| **TypeScript** | - | Tipado estático |
| **Tailwind CSS** | 4.2.2 | Estilos (disponible) |
| **D3.js** | 7.9.0 | Visualizaciones |

### Backend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Express** | 4.21.2 | Servidor API |
| **better-sqlite3** | 12.9.0 | Base de datos |
| **tsx** | 4.19.2 | Desarrollo con hot-reload |
| **TypeScript** | 5.7.0 | Tipado |

### IA/ML
| Tecnología | Modelo | Uso |
|------------|--------|-----|
| **Ollama** | llama3:8b | Clasificación de estados cognitivos |
| **Ollama** | nomic-embed-text | Generación de embeddings vectoriales |

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### Tablas Principales

#### 1. `habits` - Hábitos tracking
```sql
id, name, color, max_per_day, created_at
```

#### 2. `habit_logs` - Registros de hábitos
```sql
id, habit_id (FK), log_date, count
```

#### 3. `journal_entries` - Entradas de bitácora
```sql
id, fecha, hora, duracion, tipo_practica,
estado_previo,
fenomenologia_somatica,    -- Sensaciones corporales
fenomenologia_cognitiva,   -- Pensamientos observados
cuerpo, insight, integracion, estado_post, created_at
```

#### 4. `inferred_states` - Estados inferidos por IA
```sql
entry_id (PK, FK), somatic, emotional, attention, cognition
```

#### 5. `entry_embeddings` - Vectores para búsqueda semántica
```sql
entry_id, field (PK), embedding (PK)
-- field: 'emotional' | 'attention' | 'cognition'
```

---

## 🔄 FLUJO DE DATOS

### 1. Crear Entrada de Práctica

```
Frontend (/practica) 
  → POST /api/journal
  → Backend valida campos
  → Inserta en journal_entries
  → [ASYNC] → extractAndStoreStates()
      → 3 llamadas a Ollama (somatic, cognitive, emotional+attention)
      → Guarda en inferred_states
      → [ASYNC] → generateAndStoreEmbeddings()
          → Ollama embedding (nomic-embed-text)
          → Guarda en entry_embeddings
```

### 2. Clasificador Cognitivo (/clasificador)

```
Frontend (/clasificador)
  → POST /api/classify
  → Backend → Ollama (llama3)
  → Devuelve JSON: { somatic, emotional, attention, cognition }
```

---

## 📝 PIPELINE DE EXTRACCIÓN DE ESTADOS (3 PROMPTS)

| Prompt | Input | Output |
|--------|-------|--------|
| **Somatic** | `fenomenologia_somatica` | `{ "somatic": "value" }` |
| **Cognitive** | `fenomenologia_cognitiva` | `{ "cognition": "value" }` |
| **Emotional+Attention** | `fenomenologia_cognitiva` | `{ "emotional": "value", "attention": "value" }` |

### Valores Permitidos

- **Somatic**: fatigue, low_energy, neutral, alert, high_energy, tension, relaxed, restless
- **Emotional**: anxiety, stress, calm, neutral, irritability, contentment
- **Attention**: distracted, scattered, unstable_attention, sustained_attention, focused, hyperfocused
- **Cognition**: rumination, overthinking, analytical, mental_fog, clear, insight_oriented

---

## 🎨 PÁGINAS DEL FRONTEND

| Página | Archivo | Descripción |
|--------|---------|-------------|
| **Home** | `src/pages/index.astro` | Landing page |
| **Práctica** | `src/pages/practica.astro` | Formulario nueva entrada (dual phenomenology) |
| **Bitácora** | `src/pages/journal.astro` | Lista de entradas + modal edición |
| **Hábitos** | `src/pages/habits.astro` | Dashboard hábitos + calendario |
| **Clasificador** | `src/pages/clasificador.astro` | UI del clasificador de estados |
| **Stats** | `src/pages/stats.astro` | Estadísticas y gráficos |
| **About** | `src/pages/about.astro` | Información del proyecto |
| **Contact** | `src/pages/contact.astro` | Formulario de contacto |

---

## 🚀 COMANDOS

Todos los comandos se ejecutan desde la raíz del proyecto:

| Comando | Acción |
|---------|--------|
| `npm run dev` | Inicia frontend + backend (concurrently) |
| `npm run dev:web` | Frontend (Astro: localhost:4321) |
| `npm run dev:api` | Backend (Express: localhost:3001) |
| `npm run build` | Construye para producción en `./dist/` |
| `npm run preview` | Previsualiza build localmente |

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
psychonaut_log/
├── astro.config.mjs          # Config Astro
├── package.json              # Deps frontend
├── tsconfig.json
├── DESIGN.md                 # Sistema de diseño
├── README.md
│
├── backend/
│   ├── package.json          # Deps backend
│   ├── tsconfig.json
│   ├── server.ts             # API Express + LLM + Embeddings
│   ├── db.ts                 # Conexión SQLite
│   ├── schema.sql            # Definición tablas
│   ├── seed.ts               # Datos iniciales
│   └── seed.sql
│
└── src/
    ├── pages/                # Páginas Astro
    │   ├── index.astro
    │   ├── practica.astro    # ← Formulario nuevo
    │   ├── journal.astro     # ← Lista entradas
    │   ├── habits.astro
    │   ├── clasificador.astro
    │   ├── stats.astro
    │   └── ...
    │
    ├── components/
    │   ├── Header.astro
    │   ├── Footer.astro
    │   ├── JournalList.astro # ← Edit form + detail view
    │   ├── HabitDashboard.jsx
    │   ├── CognitiveClassifier.jsx
    │   └── ...
    │
    ├── layouts/
    │   └── Layout.astro
    │
    ├── lib/
    │   ├── api.ts            # Fetch helpers
    │   └── dates.ts
    │
    ├── styles/
    │   └── global.css
    │
    └── types/
        └── habit.ts
```

---

## ⚠️ REQUISITOS

1. **Node.js** >= 22.12.0
2. **Ollama** instalado y corriendo (`ollama serve`)
3. Modelos instalados:
   - `ollama pull llama3`
   - `ollama pull nomic-embed-text`

---

## 🔮 PRÓXIMAS POSIBILIDADES

1. **Búsqueda semántica** - Query vectorial entre entradas
2. **Graph de conocimientos** - Conexiones entre insights
3. **Estadísticas de estados** - Dashboard de evolución cognitiva
4. **Recomendaciones** - Sugerencias basado en patrones