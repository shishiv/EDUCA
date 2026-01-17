# PROJECT.md

## Project: EDUCA UI/UX Refactoring

**Status:** Active
**Started:** 2026-01-16
**Type:** UI/UX Redesign (Brownfield)

---

## Vision

Refatorar a interface do sistema EDUCA Fronteira para seguir o novo design system definido nos mockups HTML em `/docs`, criando uma experiência visual consistente, moderna e acessível para gestão escolar municipal.

---

## Goals

1. **Implementar Design System EDUCA**
   - CSS variables para cores, tipografia, espaçamentos
   - Componentes reutilizáveis seguindo padrões dos mockups
   - Temas light/dark preparados

2. **Modernizar Layout Principal**
   - Sidebar fixa com navegação hierárquica
   - Header com busca global e notificações
   - Grid responsivo para conteúdo

3. **Refatorar Telas Existentes**
   - Login com split-screen (gradiente + formulário)
   - Dashboard com stats cards e alertas
   - Turmas como cards com métricas
   - Chamada como tabela interativa
   - Perfil do aluno com layout de duas colunas

4. **Implementar Diário Infantil (BNCC)**
   - Campos de Experiências com cores específicas
   - Registro de Vivências
   - Relatórios de Desenvolvimento

---

## Design System Reference

### Typography
| Font | Usage | Weight |
|------|-------|--------|
| Lexend | Títulos, Logo, Display | 400-800 |
| Inter | Corpo, UI, Forms | 400-700 |
| Caveat | Cursivo decorativo | 400-700 |

### Type Scale
| Name | Size | Usage |
|------|------|-------|
| Display | 48px | Hero, Logo |
| H1 | 32px | Page titles |
| H2 | 24px | Section titles |
| H3 | 18px | Card headers |
| Body | 16px | Paragraphs |
| Small | 14px | Captions |
| Caption | 12px | Metadata |

### Colors
**Primary Palette (Jardim)**
```css
--green-600: #059669  /* Primary brand */
--green-500: #10b981  /* Success */
--blue-500: #0ea5e9   /* Info, Secondary */
--yellow-400: #fcd34d /* Accent, Logo wave */
--pink-400: #fb7185   /* Alerts, Badges */
```

**BNCC Campos de Experiências**
```css
--campo-eu: #ec4899      /* O eu, o outro e o nós */
--campo-corpo: #f97316   /* Corpo, gestos e movimentos */
--campo-tracos: #8b5cf6  /* Traços, sons, cores e formas */
--campo-escuta: #0ea5e9  /* Escuta, fala, pensamento */
--campo-espacos: #10b981 /* Espaços, tempos, quantidades */
```

**Semantic Colors**
```css
--success: #10b981
--warning: #f59e0b
--error: #ef4444
--info: #0ea5e9
```

**Neutrals**
```css
--gray-900: #0f172a
--gray-800: #1e293b
--gray-700: #334155
--gray-600: #475569
--gray-500: #64748b
--gray-400: #94a3b8
--gray-300: #cbd5e1
--gray-200: #e2e8f0
--gray-100: #f1f5f9
--gray-50: #f8fafc
```

### Layout Constants
```css
--sidebar-width: 260px
--header-height: 70px
--border-radius-sm: 8px
--border-radius-md: 12px
--border-radius-lg: 16px
--border-radius-xl: 20px
```

---

## Screens to Refactor

### 1. Login
- Split layout: gradient hero left, form right
- EDUCA logo with gradient + yellow wave
- Feature highlights on hero side
- Clean form with focus states

### 2. Dashboard
- Stats grid (4 columns → 2 on tablet → 1 on mobile)
- Turmas list with color indicators
- Alerts panel with semantic colors
- Quick actions

### 3. Turmas
- Card grid (3 columns → 2 → 1)
- Each card: header with gradient, stats, action buttons
- Hover effects with shadow/translate

### 4. Chamada
- Header with turma info + date picker
- Table with student rows
- Attendance buttons (Presente/Falta/Justificada)
- Frequency percentage with color coding

### 5. Perfil do Aluno
- Avatar + info + stats header
- Two-column grid for data sections
- Tags for turma/turno/bolsa família

### 6. Diário Infantil (New)
- Campo de Experiência selector (5 colors)
- Vivência registration form
- Child observation cards
- Development report generator

---

## Component Library

| Component | Status | Priority |
|-----------|--------|----------|
| Button (primary, secondary, ghost) | Needed | High |
| Card | Needed | High |
| Input/Form controls | Needed | High |
| Sidebar navigation | Needed | High |
| Header | Needed | High |
| Stat card | Needed | High |
| Alert item | Needed | Medium |
| Table (attendance) | Needed | Medium |
| Avatar | Needed | Medium |
| Badge/Tag | Needed | Medium |
| Date picker | Needed | Medium |
| Campo de Experiência card | Needed | Medium |

---

## Technical Approach

1. **CSS Architecture**
   - Global CSS variables in `app/globals.css`
   - shadcn/ui components customized with design tokens
   - Tailwind config extended with EDUCA palette

2. **Component Strategy**
   - Use existing shadcn/ui components where possible
   - Create custom components for EDUCA-specific patterns
   - Maintain backwards compatibility during transition

3. **Responsive Breakpoints**
   - Desktop: 1200px+
   - Tablet: 768px-1199px
   - Mobile: <768px

---

## Source of Truth

**Design mockups:** `/docs/*.html`
- `educa-brand-guidelines.html` - Typography, colors, logo usage
- `educa-ui-mockups.html` - Main screens (Login, Dashboard, Turmas, Chamada, Aluno)
- `educa-mockups-cobranded.html` - Co-branding with Prefeitura
- `educa-diario-infantil.html` - BNCC/Educação Infantil screens
- `educa-logo-final.html` - Logo specifications

---

## Success Criteria

- [ ] Design tokens implemented as CSS variables
- [ ] All 5 main screens match mockup patterns
- [ ] Responsive across desktop/tablet/mobile
- [ ] BNCC Campos de Experiências with correct colors
- [ ] Co-branding pattern available
- [ ] No visual regressions on existing features
- [ ] Lighthouse accessibility score ≥90

---

## Constraints

- Must maintain existing Supabase API contracts
- Must preserve Brazilian compliance features (attendance immutability, auto-lock)
- Must work offline-first (existing PWA)
- Must support Portuguese language

---

## Next Steps

1. Create design tokens (CSS variables + Tailwind config)
2. Implement base layout (Sidebar + Header)
3. Refactor Login screen
4. Refactor Dashboard
5. Continue with remaining screens
6. Add Diário Infantil module
