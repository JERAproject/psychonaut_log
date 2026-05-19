# Estado del Proyecto - Psychonaut Log

## 📊 Información General

| Campo | Valor |
|-------|-------|
| **Nombre** | Psychonaut Log |
| **Versión** | 0.0.1 |
| **Stack Principal** | Astro + Express + SQLite + Ollama |
| **Repositorio** | GitHub |

---

## 🔧 Tech Stack

### Frontend
- **Framework**: Astro 6.x + React 19
- **Estilos**: TailwindCSS 4.x
- **Visualización**: Three.js, D3.js
- **TypeScript**: Parcial (muchos `any` en backend)

### Backend
- **Runtime**: Node.js 22 + Express
- **DB**: SQLite con better-sqlite3 (WAL mode)
- **Auth**: JWT (bcryptjs)
- **TypeScript**: Parcial

### Integraciones
- **AI**: Ollama (llama3 + nomic-embed-text)
- **Speech-to-Text**: Python Flask + Faster-Whisper
- **Dev Tools**: tsx, concurrently

### Features Recientes
- **Gráfico Energy/Valence interactivo**: Click en puntos del gráfico navega al detalle de la entrada
- **Tooltip personalizado**: Muestra fecha, tipo de práctica y valores E/V al hacer hover

---

## ✅ Estado de Calidad

### Testing
- **Estado**: 🟡 En desarrollo
- **Backend**: Vitest + Supertest configurado
- **Python**: Tests básicos en `src/test/`
- **Cobertura**: < 10%

### CI/CD
- **Estado**: ✅ Completado
- **GitHub Actions**: workflow `ci.yml`
- **Checks**: TypeScript check (frontend + backend), Build
- **Badge**:Pendiente crear release

### Seguridad
- **Estado**: 🟡 Básico
- **Auth**: JWT con expiry
- **Input**: Validación básica
- **Faltante**: Rate limiting, Helmet headers

### Accesibilidad
- **Estado**: ✅ Avanzado
- ✅ Lang="es" en HTML
- ✅ Skip link implementado
- ✅ Focus-visible styles
- ✅ Reduced motion support
- ✅ Min-height 44px en botones
- ✅ Roles ARIA en algunos componentes

### TypeScript
- **Estado**: 🟡 Parcial
- Frontend: Mostly typed
- Backend: Muchos `any`, sin strict mode

### Performance
- **Estado**: 🟡 Sin optimizar
- Code splitting: No implementado
- Lazy loading: No implementado

### Documentación
- **Estado**: 🟡 Básico
- README.md
- DESIGN.md
- AGENTS.md (integrado con agent-skills)

---

## 📋 Plan de Acción Actualizado

### 🔴 Completados

1. ✅ CI/CD con GitHub Actions
2. ✅ Tests básicos con Vitest
3. ✅ Accesibilidad avanzada (layout, skip link, focus, reduced motion)
4. ✅ Integración agent-skills
5. ✅ Gráfico Energy/Valence interactivo - Click para ver detalle de entrada
6. ✅ Tooltip personalizado en gráfico con fecha, práctica y valores E/V

### 🟡 Pendientes (Próximas iteraciones)

1. **TypeScript strict** - Eliminar `any`, agregar tipos completos
2. **Rate limiting** - Agregar express-rate-limit
3. **Helmet** - Agregar headers de seguridad
4. **Code splitting** - Implementar lazy loading en Astro
5. **Más tests** - Coverage target: 50%
6. **API Docs** - OpenAPI/Swagger

---

## 📁 Estructura de Archivos Clave

```
├── .github/workflows/ci.yml      # CI/CD
├── .agents/
│   ├── skills/                   # Skills del proyecto
│   └── skills_agent_skills/     # agent-skills
├── backend/
│   ├── server.ts                 # API Express
│   ├── db.ts                    # DB + migraciones
│   ├── test/api.test.ts         # Tests
│   └── vitest.config.ts
├── src/
│   ├── layouts/Layout.astro     # Layout accesible
│   ├── styles/global.css        # Estilos + a11y
│   ├── lib/                     # Utilidades
│   └── pages/                   # Páginas Astro
└── AGENTS.md                    # Configuración de skills
```

---

## 🚀 Cómo Contribuir

1. **Nuevo feature**: Usar skill `spec-driven-development`
2. **Bug fix**: Usar skill `debugging-and-error-recovery`
3. **Code review**: Usar skill `code-review-and-quality`
4. **Refactoring**: Usar skill `code-simplification`

Ver `AGENTS.md` para más detalles sobre workflow.

---

_Last updated: 2026-05-19 17:50_