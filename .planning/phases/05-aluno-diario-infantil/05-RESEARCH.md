# Phase 5: Aluno & Diario Infantil - Research

**Researched:** 2026-01-17
**Domain:** BNCC Early Childhood Education (Educacao Infantil), Student Profile UI
**Confidence:** HIGH

## Summary

This research covers the official BNCC (Base Nacional Comum Curricular) framework for Early Childhood Education in Brazil, focusing on the 5 Campos de Experiencia (Experience Fields), faixa etaria (age groups), and best practices for pedagogical documentation and descriptive reports.

Key findings:
1. **Colors are NOT officially standardized by MEC** - The official BNCC document does not prescribe specific colors for each Campo de Experiencia. However, the existing codebase already defines a consistent color scheme that follows common educational material conventions.
2. **Faixa etaria boundaries are officially defined** - Three groups: Bebes (0-1a6m), Criancas bem pequenas (1a7m-3a11m), Criancas pequenas (4a-5a11m).
3. **Descriptive reports must NEVER include grades** - BNCC for Educacao Infantil explicitly prohibits numerical or conceptual grades; only descriptive text is allowed.

**Primary recommendation:** Use the existing color scheme already defined in the codebase (globals.css) which follows common educational material conventions. Focus implementation on the vivencia registration flow and observation grouping patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15 | React framework | Already in use |
| Tailwind CSS | v4 | Styling | Already in use |
| shadcn/ui | latest | Component library | Already in use |
| react-hook-form | latest | Form management | Already in use for DescriptiveReportForm |
| Zod | latest | Validation | Already in use |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | latest | Date calculations for faixa etaria | Age calculations |
| Sonner | latest | Toast notifications | User feedback |
| lucide-react | latest | Icons | UI indicators |

### No Additional Libraries Needed
The existing stack fully supports Phase 5 requirements. No new dependencies are required.

## Architecture Patterns

### Recommended Project Structure
```
gestao_fronteira/
├── app/(dashboard)/dashboard/
│   ├── alunos/[id]/
│   │   ├── page.tsx           # Refactored student profile
│   │   ├── diario/            # New diario infantil section
│   │   │   ├── page.tsx       # Vivencias list by date
│   │   │   ├── novo/page.tsx  # New vivencia form
│   │   │   └── relatorio/page.tsx # Development report
│   │   └── ...
├── components/
│   ├── students/
│   │   ├── StudentProfileHeader.tsx  # Avatar + name + info + stats
│   │   ├── StudentTags.tsx           # Turma/turno/bolsa familia tags
│   │   ├── StudentInfoGrid.tsx       # Two-column dados pessoais/historico
│   │   └── FaixaEtariaIndicator.tsx  # Age group badge
│   ├── diary/
│   │   ├── CampoExperienciaSelector.tsx # 5 colored cards selector
│   │   ├── VivenciaForm.tsx           # Vivencia registration
│   │   ├── VivenciaCard.tsx           # Single observation card
│   │   ├── VivenciasTimeline.tsx      # Grouped by date
│   │   └── DevelopmentReportWriter.tsx # Report with vivencias reference
│   └── ui/
│       └── campo-experiencia.tsx      # Already exists, may need enhancement
├── lib/
│   └── utils/
│       └── faixa-etaria.ts           # Age group calculation helpers
└── types/
    └── diario-infantil.ts            # New types for vivencias
```

### Pattern 1: Faixa Etaria Calculator
**What:** Calculate age group from birth date
**When to use:** Displaying faixa etaria indicator, filtering by age group
**Example:**
```typescript
// Source: BNCC Official Document - Age Group Definitions
export type FaixaEtaria = 'bebes' | 'criancas-bem-pequenas' | 'criancas-pequenas'

export interface FaixaEtariaInfo {
  key: FaixaEtaria
  label: string
  description: string
  minMonths: number
  maxMonths: number
  color: string
}

export const FAIXA_ETARIA_CONFIG: Record<FaixaEtaria, FaixaEtariaInfo> = {
  'bebes': {
    key: 'bebes',
    label: 'Bebes',
    description: '0 a 1 ano e 6 meses',
    minMonths: 0,
    maxMonths: 18,
    color: '#f97316' // orange-500
  },
  'criancas-bem-pequenas': {
    key: 'criancas-bem-pequenas',
    label: 'Criancas bem pequenas',
    description: '1 ano e 7 meses a 3 anos e 11 meses',
    minMonths: 19,
    maxMonths: 47,
    color: '#8b5cf6' // violet-500
  },
  'criancas-pequenas': {
    key: 'criancas-pequenas',
    label: 'Criancas pequenas',
    description: '4 anos a 5 anos e 11 meses',
    minMonths: 48,
    maxMonths: 71,
    color: '#0ea5e9' // sky-500
  }
}

export function calculateFaixaEtaria(birthDate: Date, referenceDate: Date = new Date()): FaixaEtaria | null {
  const ageInMonths = differenceInMonths(referenceDate, birthDate)

  if (ageInMonths >= 0 && ageInMonths <= 18) return 'bebes'
  if (ageInMonths >= 19 && ageInMonths <= 47) return 'criancas-bem-pequenas'
  if (ageInMonths >= 48 && ageInMonths <= 71) return 'criancas-pequenas'

  return null // Outside early childhood range
}
```

### Pattern 2: Campo de Experiencia Multi-Select
**What:** Grid of 5 colored cards with multi-select capability
**When to use:** Vivencia registration where multiple campos can be selected
**Example:**
```typescript
// Extending existing CampoExperiencia component
interface CampoSelectorProps {
  selectedCampos: CampoType[]
  onSelectionChange: (campos: CampoType[]) => void
  disabled?: boolean
}

// Card shows selected state with checkmark overlay
// Multiple selection allowed
// Each card shows: emoji + title + description
```

### Pattern 3: Vivencias Timeline Grouping
**What:** Observations grouped by date (day/week sections)
**When to use:** Displaying child's observation history
**Example:**
```typescript
interface VivenciasTimelineProps {
  vivencias: Vivencia[]
  groupBy: 'day' | 'week'
}

// Groups vivencias by date
// Each group shows: date header + list of VivenciaCards
// VivenciaCard shows: campos (colored badges), description, teacher
```

### Anti-Patterns to Avoid
- **NEVER use numerical grades or scores** - BNCC explicitly prohibits this for Educacao Infantil
- **NEVER use comparative language** - "better than" or rankings violate pedagogical principles
- **NEVER skip faixa etaria validation** - A 7-year-old should not have Diario Infantil access

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Age calculation in months | Manual date math | `date-fns.differenceInMonths` | Handles edge cases, leap years |
| Multi-select UI | Custom checkboxes | Existing CampoExperiencia + selection state | Already styled per design system |
| Form validation | Manual checks | Zod + react-hook-form | Already in DescriptiveReportForm pattern |
| Timeline grouping | Manual array manipulation | `date-fns` grouping utilities | Proper date handling |
| Color scheme | New color system | Existing CSS variables in globals.css | Already defined and tested |

**Key insight:** The existing codebase already has 80% of the patterns needed. The CampoExperiencia component, DescriptiveReportForm, and color tokens are all ready to extend.

## Common Pitfalls

### Pitfall 1: Treating Faixa Etaria as Static
**What goes wrong:** Age group calculated once at registration, never updated
**Why it happens:** Developers think of age as enrollment-time data
**How to avoid:** Calculate faixa etaria dynamically from birth date on each view
**Warning signs:** Student shows as "bebes" but is clearly older in UI

### Pitfall 2: Allowing Grades in Infantil Context
**What goes wrong:** UI shows grade inputs or score displays for Educacao Infantil
**Why it happens:** Code reused from Ensino Fundamental without adaptation
**How to avoid:** Create separate components for Infantil vs Fundamental evaluation
**Warning signs:** Number inputs, percentage displays, or ranking language

### Pitfall 3: Not Linking Vivencias to Reports
**What goes wrong:** Teacher writes report without reference to recorded vivencias
**Why it happens:** Report form is isolated from vivencias data
**How to avoid:** Show vivencias as reference sidebar when writing reports
**Warning signs:** Reports lack specific examples, feel generic

### Pitfall 4: Overcomplicating the Vivencia Form
**What goes wrong:** Form has too many required fields, teachers don't use it
**Why it happens:** Trying to capture everything pedagogically relevant
**How to avoid:** Keep form simple: date + campos + description. Batch mode optional.
**Warning signs:** Low adoption, incomplete entries, complaints from teachers

### Pitfall 5: Ignoring Existing Color System
**What goes wrong:** New colors defined that clash with design system
**Why it happens:** Not checking globals.css for existing campo tokens
**How to avoid:** Use existing `--campo-*` CSS variables exclusively
**Warning signs:** Inconsistent colors between components

## Code Examples

### BNCC Campos de Experiencia - Official Names and Existing Colors
```typescript
// Source: BNCC Official Document + Existing globals.css
export const CAMPOS_EXPERIENCIA = {
  eu: {
    code: 'EO',
    name: 'O eu, o outro e o nos',
    shortName: 'O eu, o outro e o nos',
    description: 'Desenvolvimento da identidade pessoal e social, construcao de autonomia e nocao de coletividade',
    // Existing colors from globals.css
    color: '#ec4899',        // --campo-eu (pink-500)
    bgColor: '#fdf2f8',      // --campo-eu-bg
    lightColor: '#fce7f3',   // --campo-eu-light
    emoji: '🤝'
  },
  corpo: {
    code: 'CG',
    name: 'Corpo, gestos e movimentos',
    shortName: 'Corpo, gestos e movimentos',
    description: 'Exploracao do corpo, gestos, movimentos, coordenacao motora e expressao corporal',
    color: '#f97316',        // --campo-corpo (orange-500)
    bgColor: '#fff7ed',      // --campo-corpo-bg
    lightColor: '#ffedd5',   // --campo-corpo-light
    emoji: '🏃'
  },
  tracos: {
    code: 'TS',
    name: 'Tracos, sons, cores e formas',
    shortName: 'Tracos, sons, cores e formas',
    description: 'Exploracao artistica atraves de tracos, sons, cores, formas e expressoes culturais',
    color: '#8b5cf6',        // --campo-tracos (violet-500)
    bgColor: '#f5f3ff',      // --campo-tracos-bg
    lightColor: '#ede9fe',   // --campo-tracos-light
    emoji: '🎵'
  },
  escuta: {
    code: 'EF',
    name: 'Escuta, fala, pensamento e imaginacao',
    shortName: 'Escuta, fala, pensamento e imaginacao',
    description: 'Desenvolvimento da linguagem oral, escuta ativa, pensamento critico e imaginacao',
    color: '#0ea5e9',        // --campo-escuta (sky-500)
    bgColor: '#f0f9ff',      // --campo-escuta-bg
    lightColor: '#e0f2fe',   // --campo-escuta-light
    emoji: '💬'
  },
  espacos: {
    code: 'ET',
    name: 'Espacos, tempos, quantidades, relacoes e transformacoes',
    shortName: 'Espacos, tempos, quantidades',
    description: 'Nocoes espaciais, temporais, quantitativas e relacoes de transformacao do mundo',
    color: '#10b981',        // --campo-espacos (emerald-500)
    bgColor: '#ecfdf5',      // --campo-espacos-bg
    lightColor: '#d1fae5',   // --campo-espacos-light
    emoji: '🌍'
  }
} as const
```

### Student Profile Header Pattern
```typescript
// Source: CONTEXT.md decision - avatar grande (~120px) a esquerda
interface StudentProfileHeaderProps {
  student: {
    id: string
    nome_completo: string
    data_nascimento: string
    foto_url?: string
  }
  turma?: {
    nome: string
    turno: string
  }
  bolsaFamilia?: boolean
  stats?: {
    vivencias: number
    frequencia: number
  }
}

// Layout: [Avatar 120px] [Name + Info Column] [Stats Row]
// Tags below name: turma chip, turno chip, bolsa familia chip (if applicable)
```

### Vivencia Type Definition
```typescript
// New type for vivencias
export interface Vivencia {
  id: string
  aluno_id: string
  turma_id: string
  professor_id: string
  data_vivencia: string // ISO date
  campos_experiencia: CampoType[] // Multiple campos allowed
  descricao: string
  observacoes?: string
  created_at: string
  updated_at: string
}

// Form data for creating vivencia
export interface VivenciaFormData {
  data_vivencia: string
  campos_experiencia: CampoType[] // At least one required
  descricao: string
  observacoes?: string
  aplicar_multiplos?: boolean // Batch mode
  alunos_ids?: string[] // For batch mode
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fichas de avaliacao (assessment cards) | Relatorio descritivo (descriptive report) | BNCC 2017 | No grades, only narrative |
| Teacher-centered observation | Child-centered documentation | BNCC 2017 | Focus on child's perspective |
| Isolated reports | Portfolio with vivencias | BNCC 2017 | Cumulative evidence |
| Fixed curriculum | Campos de Experiencia | BNCC 2017 | Flexible, integrated learning |

**Deprecated/outdated:**
- Numerical grades for Educacao Infantil: Explicitly prohibited by BNCC
- Fixed developmental checklists: Replaced by descriptive observations
- Single-campo activities: BNCC encourages integrated experiences across multiple campos

## Official BNCC Faixa Etaria Definitions

| Faixa Etaria | Portuguese Name | Age Range | Months | Education Stage |
|--------------|-----------------|-----------|--------|-----------------|
| Bebes | Bebes | 0 - 1 ano e 6 meses | 0-18 | Creche |
| Criancas bem pequenas | Criancas bem pequenas | 1 ano e 7 meses - 3 anos e 11 meses | 19-47 | Creche |
| Criancas pequenas | Criancas pequenas | 4 anos - 5 anos e 11 meses | 48-71 | Pre-escola |

**Note:** Matricula obrigatoria (mandatory enrollment) starts at 4 years (Pre-escola). Creche (0-3 years) is optional but a right.

## Open Questions

Things that couldn't be fully resolved:

1. **Official MEC Color Scheme**
   - What we know: MEC does not prescribe official colors for Campos de Experiencia
   - What's unclear: Whether any state/municipal education secretariat has standardized colors
   - Recommendation: Use existing codebase colors (already well-designed and consistent)

2. **Batch Vivencia for Multiple Students**
   - What we know: CONTEXT.md mentions "opcao aplicar a varios alunos"
   - What's unclear: Exact UX for selecting students in batch mode
   - Recommendation: Simple multi-select dropdown/checkbox list, same form otherwise

## Sources

### Primary (HIGH confidence)
- BNCC Official Document (basenacionalcomum.mec.gov.br) - Faixa etaria definitions, Campos de Experiencia names
- Existing codebase (globals.css, campo-experiencia.tsx, descriptive-report.ts) - Color scheme, patterns

### Secondary (MEDIUM confidence)
- [Nova Escola BNCC Guide](https://novaescola.org.br/bncc/conteudo/58/o-que-sao-os-campos-de-experiencia-da-educacao-infantil) - Campo descriptions
- [Movimento pela Base](https://movimentopelabase.org.br/) - BNCC implementation materials
- [SME Sao Paulo Normativa](https://acervodigital.sme.prefeitura.sp.gov.br/acervo/orientacao-normativa-de-registros-na-educacao-infantil/) - Observation/documentation practices

### Tertiary (LOW confidence - for context only)
- Various educational blog posts on parecer descritivo format
- Early childhood portfolio software patterns (Brightwheel, Storypark)

## Metadata

**Confidence breakdown:**
- BNCC Campos names/descriptions: HIGH - Official MEC document
- Faixa etaria boundaries: HIGH - Official MEC document
- Color scheme: HIGH - Already defined in codebase, no official standard
- Vivencia patterns: MEDIUM - Based on pedagogical best practices, not official standard
- Report format: HIGH - BNCC explicit about no grades for Infantil

**Research date:** 2026-01-17
**Valid until:** 2026-04-17 (90 days - BNCC is stable, unlikely to change)

---

## Key Takeaways for Planning

1. **Use existing color system** - No changes needed to globals.css
2. **Extend CampoExperiencia component** - Add multi-select support
3. **Create FaixaEtariaIndicator** - Dynamic calculation from birth date
4. **Vivencia form is simple** - date + campos[] + description
5. **Reports reference vivencias** - Show as sidebar, not inline
6. **NEVER grades** - Only descriptive text for Infantil
