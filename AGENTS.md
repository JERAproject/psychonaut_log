# AGENTS.md

This file provides guidance to AI coding agents (OpenCode, Claude Code, Cursor, etc.) when working with code in this repository.

## Project Overview

Psychonaut Log - A personal tracking application for meditation practices, habits, and journal entries. Built with Astro (frontend), Express/TypeScript (backend), SQLite (database), and integrates with Ollama for AI-powered state classification.

## Tech Stack

- **Frontend**: Astro, React, TailwindCSS, TypeScript
- **Backend**: Express, TypeScript, better-sqlite3
- **AI**: Ollama (llama3 for classification, nomic-embed-text for embeddings)
- **Speech-to-Text**: Python Flask service (faster-whisper)

## OpenCode Integration

OpenCode uses a **skill-driven execution model** powered by the `skill` tool and the `.agents/skills/` directory.

### Core Rules

- If a task matches a skill, you MUST invoke it
- Skills are located in `.agents/skills/<skill-name>/SKILL.md`
- Never implement directly if a skill applies
- Always follow the skill instructions exactly

### Intent → Skill Mapping

The agent should automatically map user intent to skills:

- Feature / new functionality → `spec-driven-development`, then `incremental-implementation`, `test-driven-development`
- Planning / breakdown → `planning-and-task-breakdown`
- Bug / failure / unexpected behavior → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactoring / simplification → `code-simplification`
- API or interface design → `api-and-interface-design`
- UI work → `frontend-ui-engineering`
- Accessibility → `accessibility` (from .agents/skills/accessibility)
- Astro development → `astro` (from .agents/skills/astro)
- Node.js backend → `nodejs-backend-patterns` or `nodejs-best-practices`

### Lifecycle Mapping

- DEFINE → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development`
- VERIFY → `debugging-and-error-recovery` + `browser-testing-with-devtools`
- REVIEW → `code-review-and-quality` + `security-and-hardening`
- SHIP → `shipping-and-launch` + `git-workflow-and-versioning`

### Anti-Rationalization

Correct behavior:
- Always check for and use skills first
- Never skip required workflows (spec, plan, test, etc.)
- Do not jump directly to implementation

### Project-Specific Guidelines

1. **Backend services must be running**: Express on port 3001, Python Flask on port 5000, Ollama on port 11434
2. **API calls use proxy**: Frontend requests go through Vite proxy (`/api/*` → `localhost:3001`)
3. **Database**: SQLite with WAL mode, migrations handled in `db.ts`
4. **Testing**: Python tests in `src/test/`, JS tests use jsdom

## Available Skills

### From agent-skills (.agents/skills_agent_skills/)
- spec-driven-development
- planning-and-task-breakdown
- incremental-implementation
- test-driven-development
- debugging-and-error-recovery
- code-review-and-quality
- code-simplification
- frontend-ui-engineering
- api-and-interface-design
- security-and-hardening
- shipping-and-launch
- git-workflow-and-versioning

### From project-specific (.agents/skills/)
- accessibility
- astro
- frontend-design
- nodejs-backend-patterns
- nodejs-best-practices
- tailwind-css-patterns
- seo
- typescript-advanced-types