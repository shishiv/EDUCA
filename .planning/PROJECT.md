# PROJECT.md

## Project: EDUCA UI/UX Refactoring

**Status:** v1.0 Shipped
**Started:** 2026-01-16
**Shipped:** 2026-01-18
**Type:** UI/UX Redesign (Brownfield)

---

## Current State

**v1.0 SHIPPED** - Complete UI/UX overhaul following EDUCA design system mockups.

### What Was Delivered

- Design system foundation (CSS variables, Tailwind config, typography)
- Responsive layout shell (Sidebar, Header, MobileNav)
- Refactored screens: Login, Dashboard, Turmas, Chamada, Aluno
- New module: Diario Infantil (BNCC-compliant)
- 48 requirements satisfied across 5 phases

### Tech Debt Carried Forward

- 2 orphaned components (AttendanceButton, CampoExperiencia in ui/)
- Frequency percentage hardcoded at 85%
- Vivencias API not implemented (mock data)
- PDF export not implemented
- Browser validation pending for municipal schools

---

## Vision

Refatorar a interface do sistema EDUCA Fronteira para seguir o novo design system definido nos mockups HTML em `/docs`, criando uma experiencia visual consistente, moderna e acessivel para gestao escolar municipal.

---

## Goals

1. **Implementar Design System EDUCA** - v1.0
   - CSS variables para cores, tipografia, espacamentos
   - Componentes reutilizaveis seguindo padroes dos mockups
   - Temas light/dark preparados

2. **Modernizar Layout Principal** - v1.0
   - Sidebar fixa com navegacao hierarquica
   - Header com busca global e notificacoes
   - Grid responsivo para conteudo

3. **Refatorar Telas Existentes** - v1.0
   - Login com split-screen (gradiente + formulario)
   - Dashboard com stats cards e alertas
   - Turmas como cards com metricas
   - Chamada como tabela interativa
   - Perfil do aluno com layout de duas colunas

4. **Implementar Diario Infantil (BNCC)** - v1.0
   - Campos de Experiencias com cores especificas
   - Registro de Vivencias
   - Relatorios de Desenvolvimento

---

## Requirements

### Validated (v1.0)

- Design System: DS-01 to DS-04 (4 requirements)
- Layout: LAY-01 to LAY-05 (5 requirements)
- Components: COMP-01 to COMP-10 (10 requirements)
- Login: LOGIN-01 to LOGIN-05 (5 requirements)
- Dashboard: DASH-01 to DASH-04 (4 requirements)
- Turmas: TURM-01 to TURM-04 (4 requirements)
- Chamada: CHAM-01 to CHAM-05 (5 requirements)
- Aluno: ALUN-01 to ALUN-03 (3 requirements)
- Diario Infantil: DIAR-01 to DIAR-05 (5 requirements)
- Accessibility: ACESS-01 to ACESS-03 (3 requirements)

**Total: 48 requirements validated in v1.0**

### Active (v1.1+)

- Backend: Vivencias API implementation
- Enhancement: Real frequency calculation (not hardcoded)
- Feature: PDF export for development reports
- Cleanup: Remove orphaned components
- Validation: Browser support in municipal schools

### Out of Scope

| Feature | Reason |
|---------|--------|
| Edicao retroativa de frequencia | Compliance brasileiro proibe |
| Notas numericas Ed. Infantil | LDB proibe avaliacao classificatoria |
| Gamificacao para alunos | Sistema e para gestao, nao uso por alunos |
| Integracao WhatsApp | Complexidade alta, deferida |

---

## Design System Reference

### Typography
| Font | Usage | Weight |
|------|-------|--------|
| Lexend | Titulos, Logo, Display | 400-800 |
| Inter | Corpo, UI, Forms | 400-700 |
| Caveat | Cursivo decorativo | 400-700 |

### Colors
**Primary Palette (Jardim)**
```css
--green-600: #059669  /* Primary brand */
--green-500: #10b981  /* Success */
--blue-500: #0ea5e9   /* Info, Secondary */
--yellow-400: #fcd34d /* Accent, Logo wave */
--pink-400: #fb7185   /* Alerts, Badges */
```

**BNCC Campos de Experiencias**
```css
--campo-eu: #ec4899      /* O eu, o outro e o nos */
--campo-corpo: #f97316   /* Corpo, gestos e movimentos */
--campo-tracos: #8b5cf6  /* Tracos, sons, cores e formas */
--campo-escuta: #0ea5e9  /* Escuta, fala, pensamento */
--campo-espacos: #10b981 /* Espacos, tempos, quantidades */
```

---

## Key Decisions (v1.0)

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CSS variables as tokens | Enables runtime theming | Good |
| Font weights limited | Bundle size optimization | Good |
| Full class lookup for colors | Avoids Tailwind purge issues | Good |
| New chamada starts Present | Teacher marks absences | Good |
| Faixa etaria dynamic | Age changes over time | Good |
| Sort in JS not Supabase | Nested relation ordering | Good |

---

## Constraints

- Must maintain existing Supabase API contracts
- Must preserve Brazilian compliance features (attendance immutability, auto-lock)
- Must work offline-first (existing PWA)
- Must support Portuguese language

---

## Source of Truth

**Design mockups:** `/docs/*.html`
- `educa-brand-guidelines.html` - Typography, colors, logo usage
- `educa-ui-mockups.html` - Main screens
- `educa-mockups-cobranded.html` - Co-branding with Prefeitura
- `educa-diario-infantil.html` - BNCC/Educacao Infantil screens
- `educa-logo-final.html` - Logo specifications

---

*Last updated: 2026-01-18 after v1.0 milestone shipped*
