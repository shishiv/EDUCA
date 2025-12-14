# Prompt: Grade Curricular Implementation

## Objective
Implement the Grade Curricular (Curriculum Grid) module - the P0 blocker for MVP. This enables teachers to assign subjects to classes with workload and view weekly timetables.

## Context

### Why This is Critical
- **Current state:** 0% implemented
- **Blocks:** Lesson planning workflow (`sessoes_aula` needs to link to subjects)
- **Impact:** Teachers cannot plan lessons without knowing which subjects they teach per class

### Architecture
- **Deploy:** Vercel + Supabase Cloud (free tier)
- **Database:** Supabase MCP for migrations
- **UI:** shadcn/ui components

### Existing Related Tables
```sql
-- Already exists
disciplinas (id, nome, codigo, escola_id, ativa)
turmas (id, nome, serie, turno, professor_id, escola_id, ano_letivo)
sessoes_aula (id, turma_id, professor_id, data_aula, conteudo_programatico, ...)
```

### Reference Files
- @gestao_fronteira/lib/database.types.ts - Current schema
- @gestao_fronteira/app/(dashboard)/dashboard/turmas/ - Class management pattern
- @gestao_fronteira/components/classes/ - Class components pattern

## Requirements

### 1. Database Schema (Supabase MCP)

Create migration with these tables:

```sql
-- Subject assignment to class with workload
CREATE TABLE disciplinas_turma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  disciplina_id UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES users(id), -- Optional: specific teacher for this subject
  carga_horaria_semanal INTEGER NOT NULL DEFAULT 4, -- Hours per week
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(turma_id, disciplina_id)
);

-- Weekly timetable slots
CREATE TABLE horarios_aula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disciplina_turma_id UUID NOT NULL REFERENCES disciplinas_turma(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 5), -- 1=Monday, 5=Friday
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  sala VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT horario_valido CHECK (horario_fim > horario_inicio)
);

-- RLS Policies
ALTER TABLE disciplinas_turma ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_aula ENABLE ROW LEVEL SECURITY;

-- School-scoped access via turma
CREATE POLICY "disciplinas_turma_escola" ON disciplinas_turma
  FOR ALL USING (
    turma_id IN (SELECT id FROM turmas WHERE escola_id = auth.jwt()->>'escola_id'::uuid)
  );

CREATE POLICY "horarios_aula_escola" ON horarios_aula
  FOR ALL USING (
    disciplina_turma_id IN (
      SELECT dt.id FROM disciplinas_turma dt
      JOIN turmas t ON dt.turma_id = t.id
      WHERE t.escola_id = auth.jwt()->>'escola_id'::uuid
    )
  );

-- Indexes
CREATE INDEX idx_disciplinas_turma_turma ON disciplinas_turma(turma_id);
CREATE INDEX idx_horarios_aula_disciplina_turma ON horarios_aula(disciplina_turma_id);
CREATE INDEX idx_horarios_aula_dia ON horarios_aula(dia_semana);
```

### 2. TypeScript Types

Add to `types/grade-curricular.ts`:

```typescript
export interface DisciplinaTurma {
  id: string;
  turma_id: string;
  disciplina_id: string;
  professor_id?: string;
  carga_horaria_semanal: number;
  created_at: string;
  updated_at: string;
  // Joined
  disciplina?: Disciplina;
  turma?: Turma;
  professor?: User;
}

export interface HorarioAula {
  id: string;
  disciplina_turma_id: string;
  dia_semana: 1 | 2 | 3 | 4 | 5;
  horario_inicio: string; // "08:00"
  horario_fim: string;    // "08:50"
  sala?: string;
  created_at: string;
  // Joined
  disciplina_turma?: DisciplinaTurma;
}

export interface GradeSemanal {
  turma_id: string;
  turma_nome: string;
  horarios: {
    [dia: number]: HorarioAula[]; // 1-5
  };
}

export const DIAS_SEMANA = {
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
} as const;

export const HORARIOS_PADRAO = [
  { inicio: '07:00', fim: '07:50' },
  { inicio: '07:50', fim: '08:40' },
  { inicio: '08:40', fim: '09:30' },
  { inicio: '09:50', fim: '10:40' }, // After break
  { inicio: '10:40', fim: '11:30' },
] as const;
```

### 3. API Layer

Create `lib/api/grade-curricular.ts`:

```typescript
// CRUD for disciplinas_turma
export async function getDisciplinasTurma(turmaId: string): Promise<DisciplinaTurma[]>
export async function addDisciplinaTurma(data: Omit<DisciplinaTurma, 'id' | 'created_at' | 'updated_at'>): Promise<DisciplinaTurma>
export async function updateDisciplinaTurma(id: string, data: Partial<DisciplinaTurma>): Promise<DisciplinaTurma>
export async function removeDisciplinaTurma(id: string): Promise<void>

// CRUD for horarios_aula
export async function getHorariosTurma(turmaId: string): Promise<HorarioAula[]>
export async function addHorarioAula(data: Omit<HorarioAula, 'id' | 'created_at'>): Promise<HorarioAula>
export async function updateHorarioAula(id: string, data: Partial<HorarioAula>): Promise<HorarioAula>
export async function removeHorarioAula(id: string): Promise<void>

// Aggregated view
export async function getGradeSemanal(turmaId: string): Promise<GradeSemanal>

// Validation
export async function checkConflitos(turmaId: string, novoHorario: Partial<HorarioAula>): Promise<HorarioAula[]>
```

### 4. UI Components

Create in `components/grade-curricular/`:

#### 4.1 `disciplinas-turma-form.tsx`
- Multi-select for disciplines
- Workload input per discipline
- Optional teacher assignment

#### 4.2 `grade-semanal-grid.tsx`
- 5-column grid (Mon-Fri)
- Rows for each time slot
- Drag-and-drop assignment (optional, can be simple dropdowns)
- Color-coded by discipline
- Conflict detection (visual warning)

#### 4.3 `horario-slot.tsx`
- Individual slot component
- Shows discipline name + teacher
- Click to edit/remove

#### 4.4 `grade-curricular-view.tsx`
- Read-only view for teachers
- "My schedule this week"
- Print-friendly layout

### 5. Pages

#### `/dashboard/grade-curricular/page.tsx`
- List of classes with their curriculum status
- Quick stats: "X classes configured, Y pending"

#### `/dashboard/turmas/[id]/grade/page.tsx`
- Full grade editor for specific class
- Tabs: "Disciplinas" | "Horários"

### 6. Integration with Lesson Planning

Update `sessoes_aula` creation to:
1. Require `disciplina_turma_id` (or at least `disciplina_id`)
2. Validate time slot matches schedule
3. Show schedule context when creating lesson

## Implementation Order

1. **Day 1:** Database migration + types + regenerate Supabase types
2. **Day 2:** API layer (`lib/api/grade-curricular.ts`)
3. **Day 3:** Disciplinas assignment UI
4. **Day 4:** Grade semanal grid (basic)
5. **Day 5:** Integration with sessoes_aula
6. **Day 6-7:** Polish, conflict detection, testing

## Output Files

Create these files:
- `gestao_fronteira/types/grade-curricular.ts`
- `gestao_fronteira/lib/api/grade-curricular.ts`
- `gestao_fronteira/components/grade-curricular/disciplinas-turma-form.tsx`
- `gestao_fronteira/components/grade-curricular/grade-semanal-grid.tsx`
- `gestao_fronteira/components/grade-curricular/horario-slot.tsx`
- `gestao_fronteira/components/grade-curricular/index.ts`
- `gestao_fronteira/app/(dashboard)/dashboard/grade-curricular/page.tsx`
- `gestao_fronteira/app/(dashboard)/dashboard/turmas/[id]/grade/page.tsx`

Apply migration via Supabase MCP:
```bash
mcp__supabase__apply_migration --name="create_grade_curricular" --query="..."
```

## Success Criteria

- [ ] Migration applied successfully
- [ ] Types generated and exported
- [ ] API functions work (test with Supabase MCP execute_sql)
- [ ] Can assign disciplines to a class
- [ ] Can view/edit weekly schedule grid
- [ ] Conflicts detected and shown
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` succeeds

## SUMMARY.md

After completion, create `.prompts/011-grade-curricular-do/SUMMARY.md`:

```markdown
# Grade Curricular Implementation Summary

**[One-liner describing what was built]**

## Version
v1

## Files Created
- [List all files]

## Database Changes
- Tables: disciplinas_turma, horarios_aula
- RLS policies applied
- Indexes created

## Key Decisions
- [Any decisions made during implementation]

## Known Limitations
- [Any scope cuts or limitations]

## Next Step
[What should be done next]
```
