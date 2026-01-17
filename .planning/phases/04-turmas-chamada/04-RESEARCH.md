# Phase 4: Turmas & Chamada - Research

**Researched:** 2026-01-17
**Domain:** Educational attendance management, Brazilian compliance, UI refactoring
**Confidence:** HIGH

## Summary

Phase 4 refactors the Turmas (class management) and Chamada (attendance) screens for the EDUCA educational platform. Research reveals a mature codebase with existing attendance infrastructure including immutability services, 18:00 auto-lock mechanisms, and Bolsa Familia compliance APIs.

The primary work is UI refactoring from a table-based Turmas listing to a card grid layout, and streamlining the Chamada interface with the P/F/J toggle pattern. The compliance layer (immutability, time-lock, audit trail) already exists and should be reused, not rebuilt.

**Primary recommendation:** Refactor UI components while preserving existing backend services. Focus on card grid layout for turmas and simplified P/F/J interaction for chamada. Leverage existing `AttendanceGrid`, `AttendanceCell`, and `attendance-immutability.ts` services.

## Current Implementation

### Existing Turmas Components

| File | Status | Notes |
|------|--------|-------|
| `app/(dashboard)/dashboard/turmas/page.tsx` | EXISTS - Table-based | 670 lines, uses Table component, needs card refactor |
| `app/(dashboard)/dashboard/turmas/[id]/page.tsx` | EXISTS | Turma details with stats, student list, session history |
| `app/(dashboard)/dashboard/turmas/nova/page.tsx` | EXISTS | New turma creation form |

**Current turmas page pattern:**
- Uses `Table` component with columns: Turma, Professor, Escola, Ocupacao, Turno, Status, Acoes
- Filters: search, escola, serie, turno, status
- StatsBar shows: Total, Ativas, Alunos, Ocupacao %
- No card grid - this is the refactor target

### Existing Attendance Components

| File | Status | Notes |
|------|--------|-------|
| `components/attendance/AttendanceGrid.tsx` | EXISTS - 1079 lines | Full-featured grid with 3-state support (P/F/A) |
| `components/attendance/AttendanceCell.tsx` | EXISTS - 236 lines | Touch-optimized cell with P/F/A toggle |
| `components/attendance/FrequenciaWorkflow.tsx` | EXISTS | Step-by-step workflow (disciplina -> turma -> aula) |
| `app/(dashboard)/dashboard/frequencia/page.tsx` | EXISTS | Frequencia landing page |
| `lib/api/attendance.ts` | EXISTS | API service with immutability integration |
| `lib/services/attendance-immutability.ts` | EXISTS - 599 lines | Legal compliance service |
| `lib/api/bolsa-familia.ts` | EXISTS - 439 lines | BF reporting API |

**Key existing features in AttendanceGrid:**
- Three-state attendance: P (Presente), F (Falta), A (Attestado)
- Lock status detection with `getSessionLockInfo()`
- Real-time statistics with color-coded attendance rate badge
- Batch operations support
- 18:00 time-lock enforcement
- Warning banner when approaching lock time
- Locked record visualization

### Database Schema (from types/database.ts)

**Tables relevant to Phase 4:**

```
turmas
- id, nome, serie, ano_letivo, escola_id, professor_id
- capacidade, turno, ativo, created_at

matriculas
- id, aluno_id, turma_id, ano_letivo, situacao, data_matricula

frequencia
- id, matricula_id, sessao_id, data_aula
- presente, status_presenca (P/F/A), justificativa
- bloqueado, bloqueado_em, bloqueado_por
- hash_registro, documento_oficial, travado
- marcado_em, marcado_por

sessoes_aula
- id, turma_id, professor_id, escola_id, disciplina_id
- data_aula, status (PLANEJADA/ABERTA/FECHADA/CANCELADA)
- aberta_em, fechada_em, conteudo_programatico

alunos
- id, nome_completo, data_nascimento, sexo
- cpf, nis (for Bolsa Familia)
```

### Existing Compliance Infrastructure

**18:00 Auto-Lock (from attendance-immutability.ts):**
```typescript
// Already implemented in lib/services/attendance-immutability.ts
private readonly DAILY_LOCK_HOUR = 18 // 6 PM
private readonly BRAZILIAN_TIMEZONE = 'America/Sao_Paulo'

// Functions available:
- isBefore18hSaoPaulo() - checks current time
- getTimeUntilLock() - returns minutes
- getSessionLockInfo() - returns full lock status
- checkTimeLock() - validates modification permission
```

**Immutability Enforcement:**
```typescript
// Error codes defined:
- IMMUTABILITY_VIOLATION
- SESSION_LOCKED
- TIME_LOCK_ACTIVE
- AUDIT_TRAIL_MISSING

// Legal references in error messages:
- "Artigo 24, LDB - Lei 9394/96"
- "Portaria MEC no 1.095/2018 - Diario Digital"
- "Resolucao CNE/CEB no 7/2010"
- "Norma Operacional Basica - INEP"
```

**Bolsa Familia (from lib/api/bolsa-familia.ts):**
```typescript
// Existing functions:
- getBolsaFamiliaStudents() - students with NIS
- getBolsaFamiliaStudentsAtRisk() - frequency < 80%
- generateBolsaFamiliaReport() - full compliance report
- getStudentBolsaFamiliaFrequency() - individual student

// Thresholds:
const BOLSA_FAMILIA_THRESHOLDS = {
  minimum: 80 // Bolsa Familia requires 80% attendance
}
```

## Design System Patterns

### Color Tokens (from tailwind.config.js)

**Serie Color Gradient (from CONTEXT.md):**
| Serie | Color | Tailwind Class |
|-------|-------|----------------|
| Educacao Infantil | Pink | `pink-500` |
| Fundamental I (1-5) | Orange | `orange-500` |
| Fundamental II (6-9) | Violet | `violet-500` |

**Attendance Status Colors:**
```javascript
attendance: {
  present: '#22C55E',  // green-500
  absent: '#EF4444',   // red-500
  late: '#F59E0B',     // amber-500
  justified: '#3B82F6', // blue-500
}
```

**Frequency Color Coding (from requirements):**
| Range | Color | Meaning |
|-------|-------|---------|
| >= 75% | Green | Adequate |
| 60-75% | Yellow | Warning/Alert |
| < 60% | Red | Critical/Risk |

### Existing Component Patterns

**StatsCard variant system:**
```typescript
variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'warning' | 'emerald' | 'violet' | 'rose'
```

**Card hover pattern (from requirements):**
```css
hover:shadow-md hover:translate-y-[-2px]
transition-all duration-200
```

**Touch target size (WCAG compliance):**
```typescript
// From AttendanceCell.tsx
md: 'w-11 h-11 text-sm min-w-[44px] min-h-[44px]' // WCAG 44px touch target
```

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Files should be placed in existing structure:

```
gestao_fronteira/
components/
  turmas/                    # NEW - turma-specific components
    TurmaCard.tsx            # Individual card component
    TurmaCardGrid.tsx        # Grid container with responsive layout
    TurmaCardSkeleton.tsx    # Loading state
  attendance/
    ChamadaHeader.tsx        # NEW - header with turma info + date picker
    ChamadaDateNav.tsx       # NEW - date navigation < Today >
    ChamadaStatusButtons.tsx # NEW - P/F/J toggle group
    AttendanceGrid.tsx       # EXISTING - reuse with modifications
    AttendanceCell.tsx       # EXISTING - reuse
app/(dashboard)/dashboard/
  turmas/
    page.tsx                 # REFACTOR - table to card grid
    [id]/
      chamada/               # NEW - dedicated chamada route
        page.tsx             # Chamada interface for specific turma
```

### Pattern 1: Card Grid Responsive Layout

**From requirements:** 3 -> 2 -> 1 columns

```tsx
// Responsive grid pattern
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {turmas.map(turma => <TurmaCard key={turma.id} turma={turma} />)}
</div>
```

### Pattern 2: P/F/J Toggle Buttons

**From CONTEXT.md:** Buttons function as toggle with feedback visual

```tsx
// Toggle pattern - clicking same button deselects
const handleStatusChange = (newStatus: AttendanceStatus) => {
  if (currentStatus === newStatus) {
    setCurrentStatus('empty') // Deselect
  } else {
    setCurrentStatus(newStatus)
    if (newStatus === 'J') {
      openJustificationModal() // J requires reason
    }
  }
}
```

### Pattern 3: Batch Save with Dirty State

**From CONTEXT.md:** Save in batch at end, not auto-save per click

```tsx
// Track unsaved changes
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
const [localAttendance, setLocalAttendance] = useState<Map<string, Status>>(new Map())

// Show indicator when dirty
{hasUnsavedChanges && (
  <Alert variant="warning">
    <AlertDescription>Alteracoes nao salvas</AlertDescription>
    <Button onClick={saveBatch}>Salvar Chamada</Button>
  </Alert>
)}
```

### Anti-Patterns to Avoid

- **Don't rebuild immutability service:** Use existing `attendance-immutability.ts`
- **Don't bypass lock checks:** Always call `validateModificationPermission()` before saves
- **Don't show BF badge to teachers:** CONTEXT.md specifies role-based visibility
- **Don't auto-save per click:** CONTEXT.md explicitly says batch save
- **Don't allow future date editing:** Fields should be disabled for future dates

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time-based locking | Custom time logic | `attendance-immutability.ts` | Timezone handling, legal compliance |
| Attendance status toggle | Custom toggle | Adapt `AttendanceCell.tsx` | WCAG compliance, touch optimization |
| Bolsa Familia detection | NIS query | `lib/api/bolsa-familia.ts` | Threshold logic, risk calculation |
| Date navigation | Custom calendar | `date-fns` + shadcn Calendar | Already used in codebase |
| Legal audit trail | Manual logging | `logAuditTrail()` method | Legal hash generation |

**Key insight:** The compliance layer is the hardest part and is already done. UI refactoring is the primary work.

## Common Pitfalls

### Pitfall 1: Ignoring Role-Based Visibility

**What goes wrong:** Showing Bolsa Familia badge or exact frequency % to teachers
**Why it happens:** Not checking `userProfile.tipo_usuario` before rendering sensitive data
**How to avoid:**
```tsx
const canSeeBolsaFamilia = ['admin', 'diretor', 'secretario', 'supervisor'].includes(userProfile.tipo_usuario)
```
**Warning signs:** BF badge visible in teacher view, frequency % shown to teachers

### Pitfall 2: Not Handling Lock Transitions

**What goes wrong:** User starts editing at 17:55, tries to save at 18:05 - fails silently
**Why it happens:** Only checking lock at page load, not at save time
**How to avoid:**
- Check lock status on every save attempt
- Show real-time countdown when approaching 18:00
- Existing `AttendanceGrid` has interval updating lockInfo every 60 seconds
**Warning signs:** Save errors after 18:00, no warning before lock

### Pitfall 3: Not Starting with All Present

**What goes wrong:** Teacher has to click P for every student instead of just marking absences
**Why it happens:** Default attendance state is empty/neutral
**How to avoid:**
```tsx
// Initialize all students as Present on new chamada
const initializeAttendance = (students) => {
  const initial = new Map()
  students.forEach(s => initial.set(s.id, 'P'))
  setLocalAttendance(initial)
}
```
**Warning signs:** Teachers complaining about workflow, high click count per chamada

### Pitfall 4: Batch Save Race Conditions

**What goes wrong:** Duplicate records, partial saves, optimistic updates not reverted
**Why it happens:** Multiple rapid saves, network failures mid-batch
**How to avoid:**
- Use single batch endpoint `/api/sessoes/aula/${sessionId}/frequencia/batch`
- Disable save button during save operation
- Revert local state on error
**Warning signs:** Duplicate frequencia records, inconsistent UI after errors

## Code Examples

### TurmaCard Component Structure

```tsx
// Source: Based on existing StatsCard pattern + CONTEXT.md requirements
interface TurmaCardProps {
  turma: {
    id: string
    nome: string
    serie: string
    turno: string
    escola: { nome: string }
    alunos_matriculados: number
    capacidade: number
    professor?: { nome: string }
  }
  onChamada: (turmaId: string) => void
  onDiario: (turmaId: string) => void
}

function TurmaCard({ turma, onChamada, onDiario }: TurmaCardProps) {
  const serieColor = getSerieColor(turma.serie) // pink/orange/violet

  return (
    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
      {/* Serie color band */}
      <div className={`h-2 rounded-t-lg bg-gradient-to-r from-${serieColor}-400 to-${serieColor}-600`} />

      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{turma.nome}</CardTitle>
        <CardDescription>{turma.escola.nome}</CardDescription>
      </CardHeader>

      <CardContent>
        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{turma.alunos_matriculados}/{turma.capacidade} alunos</span>
          <span>{getTurnoLabel(turma.turno)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={(e) => { e.stopPropagation(); onChamada(turma.id) }}>
            Fazer Chamada
          </Button>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onDiario(turma.id) }}>
            Ver Diario
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Serie Color Mapping

```tsx
// Source: CONTEXT.md decision
function getSerieColor(serie: string): string {
  const serieNormalized = serie.toLowerCase()

  // Educacao Infantil
  if (serieNormalized.includes('bercario') ||
      serieNormalized.includes('maternal') ||
      serieNormalized.includes('pre')) {
    return 'pink'
  }

  // Fundamental I (1-5 ano)
  if (/[1-5].?\s*ano/i.test(serie)) {
    return 'orange'
  }

  // Fundamental II (6-9 ano)
  if (/[6-9].?\s*ano/i.test(serie)) {
    return 'violet'
  }

  return 'gray' // fallback
}
```

### Date Navigation Component

```tsx
// Source: CONTEXT.md requirements
function ChamadaDateNav({
  currentDate,
  onDateChange,
  chamadaStatus // Map<string, 'complete' | 'pending'>
}) {
  const today = new Date()
  const isToday = isSameDay(currentDate, today)
  const isFuture = currentDate > today

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDateChange(subDays(currentDate, 1))}
      >
        <ChevronLeft />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            {format(currentDate, "dd 'de' MMMM", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            selected={currentDate}
            onSelect={onDateChange}
            modifiers={{
              complete: (date) => chamadaStatus.get(format(date, 'yyyy-MM-dd')) === 'complete',
              pending: (date) => chamadaStatus.get(format(date, 'yyyy-MM-dd')) === 'pending',
              weekend: (date) => [0, 6].includes(date.getDay()),
            }}
            modifiersClassNames={{
              complete: 'bg-green-100 text-green-800',
              pending: 'bg-red-100 text-red-800',
              weekend: 'text-gray-400 cursor-not-allowed',
            }}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDateChange(addDays(currentDate, 1))}
      >
        <ChevronRight />
      </Button>

      {!isToday && (
        <Button variant="outline" size="sm" onClick={() => onDateChange(today)}>
          Hoje
        </Button>
      )}

      {isFuture && (
        <Badge variant="secondary">Visualizacao</Badge>
      )}
    </div>
  )
}
```

### Justification Modal for "J" Status

```tsx
// Source: CONTEXT.md requirement - J requires motivo
function JustificationModal({
  isOpen,
  onClose,
  onConfirm,
  studentName
}) {
  const [motivo, setMotivo] = useState('')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Justificar Falta</DialogTitle>
          <DialogDescription>
            Informe o motivo da falta justificada para {studentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="motivo">Motivo (obrigatorio)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Atestado medico, comparecimento a audiencia..."
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onConfirm(motivo)}
            disabled={!motivo.trim()}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `aulas_abertas` table | `sessoes_aula` table | Migration exists | Both supported via API |
| Auto-save per click | Batch save at end | CONTEXT.md decision | Better UX, fewer API calls |
| 3-state (P/F/A) | 3-state (P/F/J) | Phase 4 | J = Justificada with reason |
| Table listing | Card grid | Phase 4 | Visual hierarchy |

**Note on terminology:**
- Backend uses `A` (Atestado) for justified absence
- UI will display as `J` (Justificada) per CONTEXT.md
- Both map to `presente=true` with `status_presenca='A'` in database

## Open Questions

1. **Calendar Integration**
   - What we know: CONTEXT.md says "calendario escolar sera disponibilizado pelo usuario"
   - What's unclear: How to get school calendar data (table? API? manual input?)
   - Recommendation: For Phase 4, mark weekends disabled. Calendar import can be Phase 5.

2. **Pending Chamadas List**
   - What we know: CONTEXT.md mentions "lista separada de chamadas pendentes"
   - What's unclear: Where to display (sidebar? modal? separate page?)
   - Recommendation: Add dropdown/panel in header showing pending dates

3. **Edit Permissions After Lock**
   - What we know: "Secretaria de Educacao e Admin" can edit after 18h
   - What's unclear: UI for this override (separate button? confirmation flow?)
   - Recommendation: Show "Solicitar Desbloqueio" button for authorized roles

## Sources

### Primary (HIGH confidence)

**Codebase files:**
- `gestao_fronteira/lib/services/attendance-immutability.ts` - Complete immutability service
- `gestao_fronteira/components/attendance/AttendanceGrid.tsx` - Existing grid with lock handling
- `gestao_fronteira/components/attendance/AttendanceCell.tsx` - Touch-optimized cell
- `gestao_fronteira/lib/api/attendance.ts` - API service layer
- `gestao_fronteira/lib/api/bolsa-familia.ts` - BF compliance API
- `gestao_fronteira/tailwind.config.js` - Design system tokens
- `gestao_fronteira/types/database.ts` - Database schema types

**Planning documents:**
- `.planning/phases/04-turmas-chamada/04-CONTEXT.md` - User decisions

### Secondary (MEDIUM confidence)

**Inferred from codebase patterns:**
- Card component patterns from `components/dashboard/stats-card.tsx`
- Filter patterns from existing turmas page
- Date handling patterns from `FrequenciaWorkflow.tsx`

## Metadata

**Confidence breakdown:**
- Current implementation: HIGH - Direct codebase analysis
- Compliance layer: HIGH - Existing service with legal references
- UI patterns: HIGH - Established design system
- Database schema: HIGH - Generated types from Supabase
- New requirements: MEDIUM - From CONTEXT.md, some interpretation needed

**Research date:** 2026-01-17
**Valid until:** 2026-02-17 (stable codebase, minimal external dependencies)
