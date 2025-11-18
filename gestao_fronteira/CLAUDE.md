<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

---

# Project Documentation

📖 **Master Documentation**: [MASTER-DOCUMENTATION.md](./MASTER-DOCUMENTATION.md)

This is the **single source of truth** for all project documentation. All 47 documentation files have been consolidated into 8 navigable chapters:

1. **Project Overview** - System introduction, tech stack, quick start
2. **Status & Progress** - Bug status, changelog, roadmap
3. **Architecture** - Services, validation, hooks, code organization
4. **Product & Business** - Mission, vision, roadmap
5. **Testing & QA** - Auth tests, UI/UX validation, manual tests
6. **Deployment & Operations** - Deploy guide, migrations
7. **Code Guidelines** - Chrome DevTools workflow, AI patterns
8. **Archives** - Historical documentation (SUPERSEDED)

**Quick Start**:
- For development setup → MASTER-DOCUMENTATION.md Chapter 1.1
- For bug status → MASTER-DOCUMENTATION.md Chapter 2.1
- For architecture overview → MASTER-DOCUMENTATION.md Chapter 3
- For deployment → MASTER-DOCUMENTATION.md Chapter 6.1