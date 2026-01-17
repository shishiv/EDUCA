# Requirements: EDUCA UI/UX Refactoring

**Defined:** 2026-01-17
**Core Value:** Refatorar a interface do sistema EDUCA Fronteira para seguir o novo design system definido nos mockups HTML em `/docs`, criando uma experiência visual consistente, moderna e acessível para gestão escolar municipal.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Design System

- [ ] **DS-01**: CSS variables defined for colors (primary palette, BNCC campos, semantic, neutrals)
- [ ] **DS-02**: CSS variables defined for typography (Lexend/Inter/Caveat fonts, type scale)
- [ ] **DS-03**: CSS variables defined for spacing and layout constants (sidebar-width, header-height, border-radius)
- [ ] **DS-04**: Tailwind config extended with EDUCA palette and design tokens

### Layout

- [ ] **LAY-01**: Fixed sidebar with hierarchical navigation
- [ ] **LAY-02**: Header with global search field
- [ ] **LAY-03**: Header notification bell indicator
- [ ] **LAY-04**: Header user dropdown with quick actions
- [ ] **LAY-05**: Responsive grid (desktop 1200+, tablet 768-1199, mobile <768)

### Components

- [ ] **COMP-01**: Button component (primary, secondary, ghost variants)
- [ ] **COMP-02**: Card component with header and content areas
- [ ] **COMP-03**: Input/Form controls with focus states
- [ ] **COMP-04**: Avatar component with image and fallback
- [ ] **COMP-05**: Badge/Tag component with color variants
- [ ] **COMP-06**: Label component for form fields
- [ ] **COMP-07**: Stat card component with icon, value, and label
- [ ] **COMP-08**: Alert item component with severity levels
- [ ] **COMP-09**: Attendance table component with action buttons
- [ ] **COMP-10**: Campo de Experiência card with BNCC color coding

### Login

- [ ] **LOGIN-01**: Split layout with gradient hero on left, form on right
- [ ] **LOGIN-02**: EDUCA logo with gradient + yellow wave
- [ ] **LOGIN-03**: Clean form with visible focus states
- [ ] **LOGIN-04**: "Manter conectado" checkbox defaulted ON
- [ ] **LOGIN-05**: Password reset link visible

### Dashboard

- [ ] **DASH-01**: Stats grid with 4→2→1 column responsive layout
- [ ] **DASH-02**: Turmas list with color indicators by série
- [ ] **DASH-03**: Alerts panel with semantic colors (warning, error, info)
- [ ] **DASH-04**: Quick actions section for common tasks

### Turmas

- [ ] **TURM-01**: Card grid with 3→2→1 column responsive layout
- [ ] **TURM-02**: Turma card with gradient header and stats display
- [ ] **TURM-03**: Action buttons per card (Chamada, Diário, etc.)
- [ ] **TURM-04**: Hover effects with shadow and translate transform

### Chamada

- [ ] **CHAM-01**: Header with turma info + date picker
- [ ] **CHAM-02**: Table with student rows showing photo and name
- [ ] **CHAM-03**: Attendance buttons (Presente verde, Falta vermelho, Justificada amarelo)
- [ ] **CHAM-04**: Frequency percentage with color coding (green >75%, yellow 60-75%, red <60%)
- [ ] **CHAM-05**: Auto-save on each attendance button click

### Perfil do Aluno

- [ ] **ALUN-01**: Avatar + name + info + stats header section
- [ ] **ALUN-02**: Two-column grid for data sections (dados pessoais, histórico)
- [ ] **ALUN-03**: Tags for turma/turno/bolsa família

### Diário Infantil

- [ ] **DIAR-01**: Campo de Experiência selector with 5 BNCC colors
- [ ] **DIAR-02**: Vivência registration form with text description
- [ ] **DIAR-03**: Child observation cards grouped by date
- [ ] **DIAR-04**: Faixa etária indicator (Bebês, Crianças bem pequenas, Crianças pequenas)
- [ ] **DIAR-05**: Development report generator with descriptive text (nunca notas)

### Accessibility

- [ ] **ACESS-01**: Text contrast minimum 4.5:1 on all surfaces
- [ ] **ACESS-02**: Labels associated with all form fields
- [ ] **ACESS-03**: Error messages displayed below fields (not just red border)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Design System

- **DS-V2-01**: Light/dark theme toggle

### Accessibility (Full)

- **ACESS-V2-01**: WCAG AA + eMAG full compliance
- **ACESS-V2-02**: Lighthouse accessibility score ≥90
- **ACESS-V2-03**: NVDA screen reader testing and compatibility
- **ACESS-V2-04**: Touch targets ≥44x44px
- **ACESS-V2-05**: Dynamic type support (respect OS font size preferences)

### Screen Enhancements

- **ALUN-V2-01**: Frequency history graph visualization
- **ALUN-V2-02**: Collapsible sensitive data sections (LGPD)
- **DIAR-V2-01**: Portfolio digital (photo/video collection per child)
- **DIAR-V2-02**: Tags for Direitos de Aprendizagem

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Edição retroativa de frequência | Compliance brasileiro proíbe — "não existe o esquecer" |
| Notas numéricas Ed. Infantil | LDB proíbe avaliação classificatória nessa etapa |
| Gamificação para alunos | Fora do escopo — sistema é para gestão, não uso por alunos |
| Customização excessiva de interface | Aumenta complexidade; usuários preferem padrão |
| Integração WhatsApp | Complexidade alta, deferida para v2+ |
| Notificações push | Deferida para v2+ |
| Chat entre professores | WhatsApp já serve para isso |
| OAuth login | Email/password suficiente para v1 |

## Traceability

Which phases cover which requirements. Updated by create-roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DS-01 | Phase 1 | Complete |
| DS-02 | Phase 1 | Complete |
| DS-03 | Phase 1 | Complete |
| DS-04 | Phase 1 | Complete |
| COMP-01 | Phase 1 | Complete |
| COMP-02 | Phase 1 | Complete |
| COMP-03 | Phase 1 | Complete |
| COMP-04 | Phase 1 | Complete |
| COMP-05 | Phase 1 | Complete |
| COMP-06 | Phase 1 | Complete |
| ACESS-02 | Phase 1 | Complete |
| ACESS-03 | Phase 1 | Complete |
| LAY-01 | Phase 2 | Pending |
| LAY-02 | Phase 2 | Pending |
| LAY-03 | Phase 2 | Pending |
| LAY-04 | Phase 2 | Pending |
| LAY-05 | Phase 2 | Pending |
| COMP-07 | Phase 2 | Pending |
| COMP-08 | Phase 2 | Pending |
| COMP-09 | Phase 2 | Pending |
| COMP-10 | Phase 2 | Pending |
| ACESS-01 | Phase 2 | Pending |
| LOGIN-01 | Phase 3 | Pending |
| LOGIN-02 | Phase 3 | Pending |
| LOGIN-03 | Phase 3 | Pending |
| LOGIN-04 | Phase 3 | Pending |
| LOGIN-05 | Phase 3 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Pending |
| DASH-03 | Phase 3 | Pending |
| DASH-04 | Phase 3 | Pending |
| TURM-01 | Phase 4 | Pending |
| TURM-02 | Phase 4 | Pending |
| TURM-03 | Phase 4 | Pending |
| TURM-04 | Phase 4 | Pending |
| CHAM-01 | Phase 4 | Pending |
| CHAM-02 | Phase 4 | Pending |
| CHAM-03 | Phase 4 | Pending |
| CHAM-04 | Phase 4 | Pending |
| CHAM-05 | Phase 4 | Pending |
| ALUN-01 | Phase 5 | Pending |
| ALUN-02 | Phase 5 | Pending |
| ALUN-03 | Phase 5 | Pending |
| DIAR-01 | Phase 5 | Pending |
| DIAR-02 | Phase 5 | Pending |
| DIAR-03 | Phase 5 | Pending |
| DIAR-04 | Phase 5 | Pending |
| DIAR-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 48 total
- Mapped to phases: 48 ✓
- Unmapped: 0

---
*Requirements defined: 2026-01-17*
*Last updated: 2026-01-17 after roadmap creation*
