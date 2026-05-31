# Graph Report - .  (2026-05-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 378 nodes · 439 edges · 38 communities (30 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6feb346a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 12 edges
2. `skills` - 9 edges
3. `scripts` - 8 edges
4. `source` - 8 edges
5. `sourceType` - 8 edges
6. `computedHash` - 8 edges
7. `create_lorenz_graph()` - 8 edges
8. `scripts` - 6 edges
9. `apply_projection()` - 6 edges
10. `apiFetch()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Robots Exclusion File` --semantically_similar_to--> `Favicon SVG Icon`  [EXTRACTED] [semantically similar]
  public/robots.txt → public/favicon.svg
- `Psychonaut Log Agents` --conceptually_related_to--> `Psychonaut Log Design`  [EXTRACTED]
  AGENTS.md → DESIGN.md
- `Proyección 3D con rotación para obtener silueta de mariposa.` --rationale_for--> `apply_projection()`  [EXTRACTED]
  scripts/lorenz_manim.py → scripts/lorenz_graph.py
- `renderEntries()` --calls--> `openEditModal()`  [INFERRED]
  src/components/JournalList.astro → src/pages/admin.astro
- `Calcula conexiones entre nodos basados en distancia euclidiana.     Retorna list` --rationale_for--> `compute_connectivity()`  [EXTRACTED]
  scripts/lorenz_graph.py → scripts/lorenz_manim.py

## Import Cycles
- None detected.

## Communities (38 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (33): dependencies, animejs, @astrojs/react, d3, react, react-dom, @react-three/drei, @react-three/fiber (+25 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (27): app, psicologoId, userId, existing, colNames, columns, db, dbPath (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (20): getToken(), getUser(), navItems, updateMobileNav(), changePassBtn, closePassBtn, passError, passForm (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (28): Scene, apply_projection(), compute_connectivity(), create_gold_cmap(), create_lorenz_graph(), generate_constellation_nodes(), integrate_lorenz(), lorenz_derivatives() (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (29): dependencies, bcryptjs, better-sqlite3, cors, express, multer, @types/multer, uuid (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (12): render3DChart(), COLORS, getARGDate(), getWeekDays(), PRACTICE_COLORS, formatDate(), getPracticeLabel(), renderEntries() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (11): app, AuthUser, callOllama(), extractAndStoreStates(), generateAndStoreEmbeddings(), getEmbedding(), parseJsonSafe(), Request (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (8): dayNames, maxTotalPerDay, monthNames, today, dates, ../lib/dates, ../types/habit, getDatesArray()

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (14): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, resolveJsonModule (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.37
Nodes (13): computedHash, source, sourceType, skills, accessibility, astro, frontend-design, nodejs-backend-patterns (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.23
Nodes (8): apiFetch(), applyAlteredMode(), getApiBase(), getToken(), loadPracticeList(), loadPractices(), openPracticeModal(), restoreDraft()

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (5): BrainGraph, DIMENSION_LABELS, VALUE_COLORS, formatTime(), ../components/CognitiveClassifier.jsx

### Community 12 - "Community 12"
Cohesion: 0.20
Nodes (9): allUsers, defaultHabits, entries, existingEntries, habits, hash, seed, userIds (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.44
Nodes (9): apiFetch(), attachEvents(), closeEditModal(), getToken(), getUser(), handleCreate(), handleEdit(), loadUsers() (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.43
Nodes (6): COLORS, getARGDate(), getMonthDays(), getWeekDays(), HabitTracker(), ../components/HabitTracker.jsx

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (7): buildCommand, env, NODE_ENV, framework, installCommand, outputDirectory, rewrites

### Community 16 - "Community 16"
Cohesion: 0.39
Nodes (4): cleanupTestDb(), createTestDb(), createTestSession(), createTestUser()

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (3): getTimeInArgentina(), getWeekDays(), ../components/HabitDashboard.jsx

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (5): apiFetch(), apiGet(), apiPost(), getApiBase(), getAuthHeaders()

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, jsxImportSource, exclude, extends, include

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (6): ../assets/Autohimnosis.png?url, ../assets/Escritura reflexiva.png?url, ../assets/Mindfulness.png?url, ../assets/Shambavi mudra.png?url, ../assets/Tracker.png?url, ../assets/Trataka.png?url

### Community 21 - "Community 21"
Cohesion: 0.50
Nodes (3): match, match2, newHash

## Knowledge Gaps
- **173 isolated node(s):** `name`, `type`, `version`, `node`, `pnpm` (+168 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `name`, `type`, `version` to the rest of the system?**
  _186 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06818181818181818 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09247311827956989 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.12631578947368421 - nodes in this community are weakly interconnected._