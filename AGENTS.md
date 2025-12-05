# AGENTS.md

Instructions for AI coding assistants working in this project.

## Project Rules

All agents MUST follow these rules defined in [CLAUDE.md](./CLAUDE.md):

### RULE 1: CHANGELOG.md
- **BEFORE** committing, update `/CHANGELOG.md`
- Format: [Keep a Changelog](https://keepachangelog.com/)
- Sections: Added, Changed, Fixed, Removed, Security

### RULE 2: Time Tracking (Apontamento)
- Log ALL work in `apontamento/[mes-ano].md`
- See: [apontamento/README.md](apontamento/README.md)
- Format: Non-technical Portuguese descriptions

### RULE 3: MCP Usage
All database, UI, and docs tasks MUST use MCPs:
- **Supabase MCP** - Database (no CLI)
- **Chrome DevTools MCP** - UI testing
- **shadcn-ui MCP** - Components
- **Context7 / Ref MCP** - Documentation
- **Sequential Thinking MCP** - Complex problems

### RULE 4: Beads Issue Tracking
- Track ALL work with `bd` CLI
- Use `bd sync` before session end
- See [CLAUDE.md](./CLAUDE.md) for commands

---

## OpenSpec Workflow

For spec-driven development, see: [openspec/AGENTS.md](./openspec/AGENTS.md)

**When to use OpenSpec:**
- New features/capabilities
- Breaking changes (API, schema)
- Architecture changes
- Performance optimizations

**Quick commands:**
```bash
openspec list              # Active changes
openspec show [item]       # View details
openspec validate --strict # Validate
```

---

## Documentation References

| Doc | Purpose |
|-----|---------|
| [CLAUDE.md](./CLAUDE.md) | MCP tools, rules, project setup |
| [openspec/AGENTS.md](./openspec/AGENTS.md) | Spec-driven development |
| [apontamento/README.md](./apontamento/README.md) | Time tracking guide |
| [gestao_fronteira/MASTER-DOCUMENTATION.md](./gestao_fronteira/MASTER-DOCUMENTATION.md) | Full project docs |

---

## Brazilian Compliance

1. **Attendance Immutability** - "não existe o esquecer"
2. **18:00 Auto-Lock** - São Paulo timezone
3. **Bolsa Família** - Alert at <80% attendance
4. **INEP/Educacenso** - Required fields
5. **RLS** - School-based isolation
