# Phase 12: Role Access & Assignments - Research

**Researched:** 2026-01-20
**Domain:** Role-Based Access Control, Context Patterns, Teacher-Class Assignments
**Confidence:** HIGH

## Summary

This phase implements role-based action restrictions and a teacher-class assignment management UI. The research focuses on existing patterns in the codebase - how roles are checked, how the EscolaContext pattern works, and what infrastructure exists for teacher assignments.

**Key findings:**
1. The codebase has existing role infrastructure: `tipo_usuario` field in `users` table, `hasPermission` and `roleHierarchy` in `lib/auth.ts`, and RLS policies documented
2. EscolaContext (Phase 7.1) provides the pattern for context-based access control - this can be extended for role-based restrictions
3. TeacherAssignment component already exists (`components/classes/teacher-assignment.tsx`) with full UI for assigning/removing teachers from classes
4. The `turmas` table has `professor_id` field for single-teacher assignment; multi-teacher would need a junction table
5. Chamada page checks `canSeeBolsaFamilia` based on role but does not currently restrict attendance recording for admin

**Primary recommendation:** Create a `RoleContext` that provides `canRecordAttendance`, `canViewOnly`, and `activeRole` based on user's `tipo_usuario`. Use this to conditionally disable attendance controls and show explanatory messages for view-only users.

## Standard Stack

All required libraries already exist in the project - no new dependencies needed.

### Core (Already in Project)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| React Context | Role state management | Follows EscolaContext pattern |
| `lib/auth.ts` | Role checking utilities | Already has `hasPermission`, `roleHierarchy` |
| shadcn/ui components | UI for assignment page | Already used throughout |
| Supabase RLS | Database-level access control | Already configured |

### Supporting (Already in Project)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| Sonner (toast) | Success/error notifications | Assignment operations |
| React Query | Caching teacher lists | Consistent with other pages |
| lucide-react | Icons (Lock, Shield, etc.) | Visual indicators |

### No New Dependencies Required
This phase uses only existing project dependencies.

## Architecture Patterns

### Recommended Structure

```
contexts/
  escola-context.tsx       # EXISTING - escola selection
  role-context.tsx         # NEW - role-based permissions

components/
  attendance/
    view-only-notice.tsx   # NEW - info banner for admin view-only
  layout/
    role-selector.tsx      # NEW (if ROL-01) - active role selector for multi-role users

app/(dashboard)/dashboard/
  atribuicoes/
    page.tsx               # NEW - teacher-class assignment management page
```

### Pattern 1: RoleContext for Permissions

**What:** Create RoleContext following EscolaContext pattern to provide role-based permissions
**When to use:** When actions need to be conditionally disabled based on user role
**Source:** `contexts/escola-context.tsx` (existing pattern)

```typescript
// Pattern from escola-context.tsx adapted for roles
interface RoleContextType {
  // User's type from profile
  tipoUsuario: string | null

  // Active role (for multi-role users like admin who can "act as" professor)
  activeRole: string | null

  // Permission checks
  canRecordAttendance: boolean  // professor, diretor for their escola
  canViewAttendance: boolean    // all except responsavel
  canManageTeachers: boolean    // admin, diretor

  // Actions
  setActiveRole: (role: string | null) => void
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { userProfile } = useAuth()

  // Admin viewing as admin = view-only for attendance
  // Admin acting as professor = can record (ROL-01 optional feature)
  const canRecordAttendance = useMemo(() => {
    if (!userProfile) return false

    // Professor and diretor can record
    if (['professor', 'diretor'].includes(userProfile.tipo_usuario)) {
      return true
    }

    // Admin with active role selector = can record if acting as professor
    // Without ROL-01: admin is always view-only
    return false
  }, [userProfile])

  // ...
}
```

### Pattern 2: View-Only Mode for Attendance

**What:** Disable attendance controls and show explanatory message when user cannot record
**When to use:** Admin viewing chamada page
**Source:** `app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` (lines 456-552)

```typescript
// Current pattern in chamada page
const isDisabled = isLocked || isFutureDate

// New pattern: add role-based disable
const { canRecordAttendance } = useRole()
const isViewOnly = !canRecordAttendance
const isDisabled = isLocked || isFutureDate || isViewOnly

// Render view-only notice
{isViewOnly && (
  <ViewOnlyNotice
    message="Administradores visualizam a chamada, mas nao podem registrar presenca. O registro deve ser feito pelo professor responsavel."
    role={userProfile?.tipo_usuario}
  />
)}
```

### Pattern 3: Teacher Assignment Page Layout

**What:** Admin page to view and manage teacher-class assignments across escola
**Source:** `components/classes/teacher-assignment.tsx` (existing component)

```typescript
// Page layout for /dashboard/atribuicoes
export default function AtribuicoesPage() {
  const { selectedEscolaId, shouldShowSelector } = useEscola()

  // Show escola required state for admin without selection
  if (shouldShowSelector && !selectedEscolaId) {
    return <EscolaRequiredState ... />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Atribuicao de Professores"
        description="Gerencie as atribuicoes de professores as turmas"
      />

      {/* Grid of turmas with assignment status */}
      <TurmaAssignmentGrid escolaId={selectedEscolaId} />
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Don't check roles in every component:** Use RoleContext to centralize permission logic
- **Don't use hidden fields:** Make view-only state explicit with visual indicators
- **Don't block page access:** Allow viewing, just disable editing actions
- **Don't hardcode role strings:** Use typed constants from `lib/auth.ts`

## Don't Hand-Roll

Problems that have existing solutions in the codebase:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role checking | Custom role checks in each component | `hasPermission` from `lib/auth.ts` | Already has role hierarchy |
| Teacher assignment UI | New assignment component | `TeacherAssignment` in components/classes | Already built with full UI |
| Context state pattern | Custom state management | Follow EscolaContext pattern | Consistent with codebase |
| School scoping | Manual escola filtering | `useEscola().escolaIdToUse` | Already handles admin/non-admin |

**Key insight:** The TeacherAssignment component already exists and is fully functional. The new page (ROL-03) mainly needs to list turmas and render this component for each.

## Common Pitfalls

### Pitfall 1: Forgetting RLS Still Applies

**What goes wrong:** Frontend shows data user shouldn't see because relying only on UI restrictions
**Why it happens:** RLS is database-level security; frontend restrictions are UX, not security
**How to avoid:** RLS policies are the source of truth. Frontend restrictions mirror them for better UX but don't replace them.
```typescript
// CORRECT: UI restriction mirrors RLS behavior
const canRecordAttendance = tipoUsuario === 'professor'

// RLS policy already prevents admin from inserting frequencia
// Frontend just provides better UX by disabling the button
```
**Warning signs:** "Permission denied" errors from Supabase

### Pitfall 2: Multi-Role User Confusion

**What goes wrong:** Admin who is also professor at a school cannot record attendance
**Why it happens:** System checks `tipo_usuario` without considering escola context
**How to avoid:** For ROL-01, active role selector lets admin "act as" professor for specific escola
```typescript
// If implementing ROL-01
const effectiveRole = activeRole ?? userProfile.tipo_usuario

// Without ROL-01, admin is always view-only
```
**Warning signs:** Admins complaining they can't do their professor duties

### Pitfall 3: Not Showing Why Controls Are Disabled

**What goes wrong:** User clicks disabled button with no feedback
**Why it happens:** Disabled state without explanation
**How to avoid:** Always show tooltip or notice explaining why action is unavailable
```typescript
<Button
  disabled={isViewOnly}
  title={isViewOnly ? "Somente professores podem registrar presenca" : undefined}
>
  Salvar Chamada
</Button>

// Better: show explicit notice
{isViewOnly && <ViewOnlyNotice />}
```
**Warning signs:** User confusion, support tickets

### Pitfall 4: Inconsistent Role Names

**What goes wrong:** Code uses 'admin' in some places, 'administrador' in others
**Why it happens:** No single source of truth for role strings
**How to avoid:** Use typed enum from database types
```typescript
// Source of truth: users.tipo_usuario values
type TipoUsuario = 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel' | 'gestor_sme' | 'coordenador'

// Always use these exact strings from types/database.ts
```
**Warning signs:** Role checks silently failing

## Code Examples

### Example 1: Check Recording Permission

```typescript
// Source: lib/auth.ts role utilities
import { UserProfile, roleHierarchy, hasPermission } from '@/lib/auth'

/**
 * Check if user can record attendance
 * Only professors and diretores can record
 * Admin/secretario/gestor_sme are view-only
 */
function canRecordAttendance(profile: UserProfile | null): boolean {
  if (!profile) return false

  // Professors can always record for their assigned turmas
  if (profile.tipo_usuario === 'professor') return true

  // Diretores can record for any turma in their escola (supervisor role)
  if (profile.tipo_usuario === 'diretor') return true

  // All other roles (admin, secretario, gestor_sme) are view-only
  return false
}
```

### Example 2: View-Only Notice Component

```typescript
// Source: EDUCA design patterns from chamada page
import { Info, Shield } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ViewOnlyNoticeProps {
  message?: string
  className?: string
}

export function ViewOnlyNotice({
  message = "Voce esta visualizando a chamada. Apenas professores podem registrar presenca.",
  className
}: ViewOnlyNoticeProps) {
  return (
    <Alert className={cn("bg-blue-50 border-blue-200", className)}>
      <Shield className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800">Modo de Visualizacao</AlertTitle>
      <AlertDescription className="text-blue-700">
        {message}
      </AlertDescription>
    </Alert>
  )
}
```

### Example 3: Turma Assignment Grid

```typescript
// Source: Based on turmas page pattern
interface TurmaWithAssignment {
  id: string
  nome: string
  serie: string
  turno: string
  professor: { id: string; nome: string } | null
}

function TurmaAssignmentGrid({ escolaId }: { escolaId: string }) {
  const [turmas, setTurmas] = useState<TurmaWithAssignment[]>([])
  const [selectedTurma, setSelectedTurma] = useState<string | null>(null)

  useEffect(() => {
    loadTurmas()
  }, [escolaId])

  const loadTurmas = async () => {
    const { data } = await supabase
      .from('turmas')
      .select(`
        id, nome, serie, turno,
        professor:users!professor_id(id, nome)
      `)
      .eq('escola_id', escolaId)
      .eq('ativo', true)
      .order('nome')

    setTurmas(data || [])
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {turmas.map(turma => (
        <Card key={turma.id} className={cn(
          turma.professor ? 'border-green-200' : 'border-amber-200'
        )}>
          <CardHeader>
            <CardTitle>{turma.nome}</CardTitle>
            <CardDescription>{turma.serie} - {turma.turno}</CardDescription>
          </CardHeader>
          <CardContent>
            {turma.professor ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{turma.professor.nome}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span>Sem professor atribuido</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setSelectedTurma(turma.id)}
            >
              {turma.professor ? 'Alterar' : 'Atribuir'}
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Modal with TeacherAssignment component */}
      {selectedTurma && (
        <TeacherAssignment
          classId={selectedTurma}
          schoolId={escolaId}
          onAssignmentChange={() => {
            loadTurmas()
            setSelectedTurma(null)
          }}
        />
      )}
    </div>
  )
}
```

## Existing Infrastructure

### Database Tables

| Table | Relevant Fields | Usage |
|-------|----------------|-------|
| `users` | `tipo_usuario`, `escola_id` | User's role and school |
| `turmas` | `professor_id`, `escola_id` | Single teacher assignment per class |
| `sessoes_aula` | `professor_id` | Who opened the session |
| `frequencia` | `marcado_por`, `professor_id` | Who recorded attendance |

### Role Hierarchy (from lib/auth.ts)

```typescript
export const roleHierarchy = {
  responsavel: 1,
  professor: 2,
  secretario: 3,
  diretor: 4,
  admin: 5,
} as const
```

### RLS Policy Summary (from RLS-POLICIES.md)

| Role | frequencia | sessoes_aula |
|------|------------|--------------|
| admin | CRUD | CRUD |
| gestor_sme | CRUD | CRUD |
| diretor | R (escola) | R (escola) |
| secretario | R (escola) | R (escola) |
| professor | CRU (turma) | CRUD (own) |
| responsavel | R (filhos) | - |

**Important:** RLS allows admin full CRUD on frequencia, but the UI should restrict this for compliance - the frontend restriction is for UX/process control, not security.

## Requirements Analysis

### ROL-01: Active Role Selector for Multi-Role Admins

**What:** Dropdown in header/sidebar letting admin select which role to "act as"
**When visible:** Only for users with admin role who also have escola assignments
**Behavior:**
- Default: admin mode (view-only for attendance)
- Option: "Atuar como Professor" enables recording
- Selection persists in session (similar to escola selector)

**Decision needed:** Is this MVP or can we defer? Simple solution is admin = always view-only.

### ROL-02: Attendance View-Only for Admin

**What:** Disable attendance recording controls, show explanatory message
**Where:** `/dashboard/turmas/[id]/chamada/page.tsx`
**Implementation:**
1. Check `userProfile.tipo_usuario`
2. If not `professor` or `diretor`, set `isViewOnly = true`
3. Disable save button, status toggles
4. Show `ViewOnlyNotice` component

### ROL-03: Teacher-Class Assignment Page

**What:** Admin page to manage teacher-turma assignments
**Where:** `/dashboard/atribuicoes/page.tsx`
**Implementation:**
1. Use existing `EscolaRequiredState` pattern
2. List turmas with current professor assignment
3. Use existing `TeacherAssignment` component for assignment modal
4. Filter by escola (using `escolaIdToUse` pattern)

## Open Questions

1. **ROL-01 Scope:**
   - Is the active role selector needed for MVP?
   - **Recommendation:** Defer to v2.1. For MVP, admin is always view-only for attendance. This is simpler and aligns with separation of duties (auditor doesn't record).

2. **Multi-Teacher Classes:**
   - Current schema supports single `professor_id` per turma
   - Some classes may have multiple teachers (co-teaching, subject specialists)
   - **Recommendation:** Out of scope. Current single-teacher model is sufficient for pilot.

3. **Diretor Recording Permission:**
   - Should diretores be able to record attendance as fallback?
   - **Recommendation:** Yes, for practical reasons (covering for absent teacher). This is already supported by RLS.

## Sources

### Primary (HIGH confidence)
- `lib/auth.ts` - Role utilities and hierarchy
- `contexts/escola-context.tsx` - Context pattern reference
- `components/classes/teacher-assignment.tsx` - Existing assignment component
- `types/database.ts` - Database schema with tipo_usuario values
- `.planning/codebase/RLS-POLICIES.md` - Security matrix

### Secondary (MEDIUM confidence)
- `app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` - Attendance page patterns
- `app/(dashboard)/dashboard/turmas/page.tsx` - Page layout with escola filtering

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components exist in project
- Architecture: HIGH - Follows existing EscolaContext pattern
- Pitfalls: HIGH - Based on actual codebase patterns and existing role system

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (stable patterns, no external dependencies)
