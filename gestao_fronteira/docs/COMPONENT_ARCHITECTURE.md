# Component Architecture Documentation

**Project**: Sistema de Gestão Educacional - Município de Fronteira, MG
**Version**: 1.0.0
**Last Updated**: 2025-01-17
**Status**: Production-Ready (90% Complete)

---

## Table of Contents

1. [Overview](#overview)
2. [Component Directory Structure](#component-directory-structure)
3. [Component Categories](#component-categories)
4. [Shared Component Patterns](#shared-component-patterns)
5. [Brazilian Educational Components](#brazilian-educational-components)
6. [Form System Architecture](#form-system-architecture)
7. [Attendance Workflow Components](#attendance-workflow-components)
8. [UI Components (shadcn/ui)](#ui-components-shadcnui)
9. [State Management Patterns](#state-management-patterns)
10. [Component Usage Examples](#component-usage-examples)
11. [Best Practices](#best-practices)
12. [Performance Optimization](#performance-optimization)

---

## Overview

### Component Statistics
- **Total Components**: 145+ TypeScript files
- **Component Directories**: 28 organized categories
- **UI Library**: shadcn/ui + Radix UI primitives
- **Form Management**: React Hook Form 7.53.0 + Zod 3.23.8
- **State Management**: Zustand 4.4.7 for global state
- **Data Fetching**: TanStack Query 5.17.9 with Supabase integration

### Architecture Principles

1. **Feature-Based Organization**: Components grouped by educational domain
2. **Brazilian Compliance**: INEP, LGPD, and Educacenso requirements
3. **Mobile-First**: Tablet-optimized for classroom environments
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Performance**: Code splitting, lazy loading, optimized re-renders
6. **Type Safety**: TypeScript strict mode throughout

---

## Component Directory Structure

```
components/
├── ui/                     # shadcn/ui base components (50+ components)
├── forms/                  # Enhanced form system with Brazilian validation
├── attendance/             # "Abrir aula" workflow and frequency marking
├── students/               # Student registration and management
├── auth/                   # Authentication and authorization
├── admin/                  # Administrative functions
├── classes/                # Class/turma management
├── schools/                # School management
├── reports/                # Analytics and exports
├── compliance/             # INEP, Educacenso, Bolsa Família
├── dashboard/              # Dashboard widgets and cards
├── diary/                  # Class diary and lesson planning
├── charts/                 # Data visualization (Recharts)
├── layout/                 # Navigation, headers, sidebars
├── identity/               # User identity and profile
├── notifications/          # Toast notifications and alerts
├── providers/              # Context providers (Auth, Theme, Query)
├── error-boundaries/       # Error handling and recovery
├── accessibility/          # WCAG compliance components
├── branding/               # Municipality branding assets
├── help/                   # Help system and documentation
├── tutorial/               # Interactive tutorials
├── landing/                # Landing page components
├── mobile/                 # Mobile-specific optimizations
├── monitoring/             # Performance monitoring
├── registration/           # Student registration workflows
├── search/                 # Universal search functionality
└── testing/                # Test utilities and fixtures
```

---

## Component Categories

### 1. High Reusability Components (Use Across Features)

#### UI Components (`components/ui/`)
- **Base Components**: 50+ shadcn/ui components
- **Purpose**: Consistent design system across application
- **Key Components**:
  - `button.tsx` - Primary UI action component
  - `form.tsx` - Form wrapper with React Hook Form integration
  - `dialog.tsx` - Modal dialogs for user interactions
  - `card.tsx` - Content container with variants
  - `badge.tsx` - Status indicators and labels
  - `alert.tsx` - Warnings and informational messages
  - `table.tsx` - Data tables with sorting/filtering

#### Brazilian Input Components (`components/ui/brazilian-inputs.tsx`)
- **CPF Input**: Automatic formatting (000.000.000-00) with digit verification
- **Brazilian Phone**: Mobile (00) 00000-0000 and landline formatting
- **CEP Input**: Postal code validation (00000-000)
- **Date Input**: Brazilian date format (DD/MM/YYYY)

#### Auth Components (`components/auth/`)
- **Purpose**: Authentication and role-based access control
- **Key Components**:
  - `LoginForm.tsx` - User authentication with CPF support
  - `AuthGuard.tsx` - Route protection with 5-role RBAC
  - `ProtectedRoute.tsx` - Client-side route authorization
  - `PermissionChecker.tsx` - Component-level permission gates

#### Layout Components (`components/layout/`)
- **Purpose**: Application structure and navigation
- **Key Components**:
  - `Sidebar.tsx` - Main navigation with educational module structure
  - `Header.tsx` - Top navigation with user context
  - `Footer.tsx` - Footer with municipality information
  - `MobileNav.tsx` - Mobile-optimized navigation
  - `Breadcrumb.tsx` - Page location indicator

### 2. Feature-Specific Components (Domain-Focused)

#### Attendance Components (`components/attendance/`)
- **Purpose**: Complete "Abrir aula" three-phase workflow
- **Key Components**:
  - **`AbrirAulaWorkflow.tsx`** (1030 lines) - Main orchestration component
    - Three-phase workflow: PLANEJADA → ABERTA → FECHADA
    - Real-time Supabase subscriptions
    - Auto-save and session recovery
    - 18:00 auto-closure warnings (São Paulo timezone)
    - Tutorial system integration
    - Mobile-optimized touch interface

  - **`AttendanceGrid.tsx`** (450+ lines) - Touch-friendly attendance marking
    - Bulk selection for present/absent
    - Individual student attendance toggles
    - Real-time updates via Supabase
    - Performance optimization (<1s per student)
    - Accessibility keyboard navigation

  - **`FecharAulaDialog.tsx`** - Session closure with legal hash
    - Content validation (required)
    - SHA-256 hash generation
    - "Não existe o esquecer" enforcement
    - Audit trail creation

  - **`AulaStatusIndicator.tsx`** - Visual status display
    - Phase indicators (PLANEJADA, ABERTA, FECHADA)
    - Time until auto-closure countdown
    - Legal compliance badges

#### Student Components (`components/students/`)
- **Purpose**: Student registration and enrollment management
- **Key Components**:
  - `StudentForm.tsx` - INEP-compliant registration form
  - `StudentList.tsx` - Student directory with search/filters
  - `StudentProfile.tsx` - Complete student information view
  - `EnrollmentManager.tsx` - Class enrollment and transfers
  - `GuardianManager.tsx` - Multi-guardian family structure

#### Class Components (`components/classes/`)
- **Purpose**: Class/turma management with teacher assignments
- **Key Components**:
  - `ClassForm.tsx` - Class creation with academic calendar
  - `ClassList.tsx` - Class directory with filters
  - `TeacherAssignment.tsx` - Teacher-class relationships
  - `ClassSchedule.tsx` - Weekly schedule management

#### Reports Components (`components/reports/`)
- **Purpose**: Analytics, exports, and government reporting
- **Key Components**:
  - `AttendanceReport.tsx` - Frequency reports (daily, weekly, monthly)
  - `ComplianceReport.tsx` - INEP and Educacenso exports
  - `BolsaFamiliaAlert.tsx` - <80% attendance warnings
  - `PerformanceChart.tsx` - Visual analytics (Recharts)

### 3. Brazilian Compliance Components

#### Compliance Components (`components/compliance/`)
- **Purpose**: INEP, Educacenso, LGPD, and government requirements
- **Key Components**:
  - `INEPExporter.tsx` - Educacenso data export (Stage 1 & 2)
  - `LGPDConsent.tsx` - Data protection consent management
  - `BolsaFamiliaIntegration.tsx` - Social program integration
  - `AuditTrailViewer.tsx` - Complete change tracking display
  - `ComplianceChecklist.tsx` - Municipal compliance validation

---

## Shared Component Patterns

### 1. Component Structure Template

All major components follow this structure:

```typescript
/**
 * Component Name
 * Brief description of purpose and Brazilian educational context
 */

'use client' // For client-side components in Next.js App Router

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Types
interface ComponentProps {
  required: string
  optional?: string
}

interface DataType {
  id: string
  // ... other fields
}

export function ComponentName({ required, optional }: ComponentProps) {
  // State
  const [data, setData] = useState<DataType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Hooks
  const router = useRouter()

  // Data fetching with error handling
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('table').select('*')

      if (error) throw error

      setData(data || [])
      logger.info('Data loaded successfully')
    } catch (err) {
      logger.error('Error loading data:', { error: err })
      toast.error('Erro ao carregar dados')
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Effects
  useEffect(() => {
    loadData()
  }, [loadData])

  // Event handlers
  const handleAction = async () => {
    // Implementation
  }

  // Render states
  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} />
  if (!data.length) return <EmptyState />

  return (
    <div>
      {/* Component JSX */}
    </div>
  )
}
```

### 2. Brazilian Validation Pattern

```typescript
// CPF Validation with Digit Verification
const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/[^\d]/g, '')
  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false

  // First digit verification
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false

  // Second digit verification
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  return remainder === parseInt(cleanCPF.charAt(10))
}

// CPF Formatting (000.000.000-00)
const formatCPF = (value: string): string => {
  const cleanValue = value.replace(/[^\d]/g, '')
  return cleanValue
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

// Brazilian Phone Formatting
const formatPhone = (value: string): string => {
  const cleanValue = value.replace(/[^\d]/g, '')
  if (cleanValue.length <= 10) {
    // Landline: (00) 0000-0000
    return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  // Mobile: (00) 00000-0000
  return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}
```

### 3. Real-time Subscription Pattern

```typescript
// Supabase real-time subscription for attendance updates
useEffect(() => {
  const subscription = supabase
    .channel(`session_${turmaId}_${dataAula}`)
    .on('postgres_changes', {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'sessoes_aula',
      filter: `turma_id=eq.${turmaId}`
    }, (payload) => {
      if (payload.new && (payload.new as any).data_aula === dataAula) {
        setSession(payload.new as Session)
        onSessionChange?.(payload.new as Session)
      }
    })
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}, [turmaId, dataAula, onSessionChange])
```

### 4. Auto-Save Pattern

```typescript
// Auto-save with debounce for form content
const autoSaveRef = useRef<NodeJS.Timeout>()

const saveContentLocally = useCallback((content: string) => {
  if (autoSaveRef.current) {
    clearTimeout(autoSaveRef.current)
  }

  autoSaveRef.current = setTimeout(() => {
    localStorage.setItem(`content_${turmaId}_${dataAula}`, content)
    setAutoSaveContent(content)
    logger.info('Content auto-saved')
  }, 2000) // Save after 2 seconds of no typing
}, [turmaId, dataAula])

// Auto-restore on component mount
useEffect(() => {
  const savedContent = localStorage.getItem(`content_${turmaId}_${dataAula}`)
  if (savedContent && !session?.conteudo_ministrado) {
    setAutoSaveContent(savedContent)
    toast.info('Conteúdo recuperado automaticamente', {
      action: {
        label: 'Restaurar',
        onClick: () => setConteudoMinistrado(savedContent)
      }
    })
  }
}, [turmaId, dataAula, session])
```

---

## Brazilian Educational Components

### Enhanced Form System (`components/forms/enhanced-form-system.tsx`)

**Purpose**: Reusable form system with progressive validation, auto-save, and Brazilian compliance

**Features**:
- **Progressive Validation**: Real-time field validation with visual feedback
- **Auto-Save**: Automatic draft saving every 3 seconds
- **Session Timeout**: Warning 2 minutes before session expiry
- **Brazilian Validation**: CPF, phone, date formats
- **INEP Compliance**: Required field indicators for government reporting
- **Accessibility**: WCAG 2.1 AA keyboard navigation
- **Progress Indicator**: Visual completion percentage
- **Educational Context**: Field-specific help text for Brazilian education

**Key Components**:

```typescript
interface FormFieldConfig {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'tel' | 'cpf' | 'date' | 'select' | 'textarea'
  placeholder?: string
  helpText?: string
  required?: boolean
  validation?: z.ZodSchema
  options?: { value: string; label: string }[]
  educationalContext?: string // Brazilian educational explanation
  inepRequired?: boolean // Required for INEP reporting
  autoComplete?: string
  maxLength?: number
  formatOnChange?: (value: string) => string
}

interface EnhancedFormProps<TFormData extends FormData = FormData> {
  formId: string
  title: string
  subtitle?: string
  fields: FormFieldConfig[]
  schema: z.ZodSchema<TFormData>
  onSubmit: (data: TFormData) => Promise<void>
  onAutoSave?: (data: TFormData) => Promise<void>
  defaultValues?: Partial<TFormData>
  showProgress?: boolean
  allowDrafts?: boolean
  educationalCompliance?: {
    inepRequired?: boolean
    lgpdConsent?: boolean
    municipalCompliance?: boolean
  }
  sessionTimeout?: number // minutes
  className?: string
}
```

**Usage Example**:

```typescript
<EnhancedFormSystem<StudentRegistrationData>
  formId="student-registration"
  title="Matrícula de Aluno"
  subtitle="Cadastro de novo aluno na rede municipal de Fronteira/MG"
  fields={[
    {
      name: 'nome_completo',
      label: 'Nome Completo do Aluno',
      type: 'text',
      required: true,
      educationalContext: 'Nome deve corresponder exatamente ao da certidão de nascimento',
      inepRequired: true
    },
    {
      name: 'cpf',
      label: 'CPF do Aluno',
      type: 'cpf',
      required: true,
      educationalContext: 'CPF necessário para programas sociais como Bolsa Família',
      inepRequired: true
    }
  ]}
  schema={studentSchema}
  onSubmit={handleSubmit}
  onAutoSave={handleAutoSave}
  showProgress={true}
  allowDrafts={true}
  educationalCompliance={{
    inepRequired: true,
    lgpdConsent: true,
    municipalCompliance: true
  }}
  sessionTimeout={30}
/>
```

---

## Form System Architecture

### React Hook Form + Zod Integration

All forms use React Hook Form with Zod validation for type-safe, performant form handling.

**Pattern**:

```typescript
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Zod schema with Brazilian validation
const studentSchema = z.object({
  nome_completo: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().refine(validateCPF, 'CPF inválido'),
  data_nascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  responsavel_nome: z.string().min(3, 'Nome do responsável é obrigatório'),
  responsavel_telefone: z.string().min(10, 'Telefone inválido'),
  endereco: z.string().min(10, 'Endereço deve ser completo')
})

// Infer TypeScript type from schema
type StudentFormData = z.infer<typeof studentSchema>

// Form hook with resolver
const methods = useForm<StudentFormData>({
  resolver: zodResolver(studentSchema),
  defaultValues: {},
  mode: 'onChange' // Progressive validation
})

// Form submission with type safety
const onSubmit = async (data: StudentFormData) => {
  try {
    const { error } = await supabase.from('alunos').insert(data)
    if (error) throw error
    toast.success('Aluno cadastrado com sucesso!')
  } catch (error) {
    logger.error('Student registration error:', { error })
    toast.error('Erro ao cadastrar aluno')
  }
}
```

---

## Attendance Workflow Components

### Three-Phase Attendance System

The attendance system implements Brazilian educational compliance with a three-phase workflow:

**Phase 1: PLANEJADA (Planned)**
- Session created but not yet started
- Teacher can set content and planning
- Can be cancelled with justification

**Phase 2: ABERTA (Open)**
- Active attendance marking period
- Students can be marked present/absent
- Real-time updates via Supabase subscriptions
- Auto-closes at 18:00 São Paulo time
- Performance target: <1s per student, <5s batch 30 students

**Phase 3: FECHADA (Closed)**
- Session locked and immutable
- SHA-256 legal hash generated
- "Não existe o esquecer" enforcement
- Audit trail created
- Content required for closure

### AbrirAulaWorkflow Component (Main Orchestrator)

**File**: `components/attendance/AbrirAulaWorkflow.tsx` (1030 lines)

**Responsibilities**:
1. Session lifecycle management (create, open, close, cancel)
2. Real-time Supabase subscriptions for session updates
3. Auto-save content with local storage recovery
4. 18:00 auto-closure countdown and warnings
5. Tutorial system integration for first-time users
6. Mobile-optimized touch interface
7. Legal compliance enforcement

**Key Features**:

```typescript
interface AbrirAulaWorkflowProps {
  turmaId: string
  professorId: string
  dataAula?: string // YYYY-MM-DD format
  showTutorial?: boolean
  onSessionChange?: (session: Session | null) => void
}

// Session interface with all phases
interface Session {
  id: string
  turma_id: string
  professor_id: string
  disciplina_id?: string
  data_aula: string
  status: 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'CANCELADA'
  criada_em: string
  aberta_em?: string
  fechada_em?: string
  cancelada_em?: string
  conteudo_ministrado?: string
  observacoes_fechamento?: string
  hash_legal?: string // SHA-256 for legal compliance
  tempo_total_aula?: string // GENERATED STORED column
  auto_fechamento_agendado: string // 18:00 São Paulo time
  turmas: {
    id: string
    nome: string
    ano_letivo: string
  }
  disciplinas?: {
    id: string
    nome: string
    codigo: string
  }
}
```

**Session Actions**:

```typescript
// Create new session (PLANEJADA status)
const createSession = async () => {
  const { data, error } = await supabase
    .from('sessoes_aula')
    .insert({
      turma_id: turmaId,
      professor_id: professorId,
      disciplina_id: disciplinaId,
      data_aula: dataAula,
      status: 'PLANEJADA',
      auto_fechamento_agendado: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    })
    .select('*')
    .single()
}

// Open session (PLANEJADA → ABERTA)
const openSession = async () => {
  const { data, error } = await supabase
    .from('sessoes_aula')
    .update({
      status: 'ABERTA',
      aberta_em: new Date().toISOString()
    })
    .eq('id', session.id)
    .select('*')
    .single()
}

// Close session (ABERTA → FECHADA)
const closeSession = async () => {
  const response = await fetch(`/api/sessoes-aula/${session.id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'FECHADA',
      conteudo_ministrado: conteudoMinistrado.trim()
    })
  })
  // Database trigger generates hash_legal and audit trail
}
```

### AttendanceGrid Component (Frequency Marking)

**File**: `components/attendance/AttendanceGrid.tsx` (450+ lines)

**Purpose**: Touch-friendly interface for marking student attendance

**Features**:
- Individual student attendance toggles
- Bulk selection (all present, all absent)
- Real-time updates via Supabase
- Performance optimization with virtualization
- Accessibility keyboard navigation
- Mobile-optimized touch targets (44px minimum)
- Visual confirmation feedback

**Interface**:

```typescript
interface AttendanceGridProps {
  sessionId: string
  turmaId: string
  onAttendanceChange?: () => void
}

// Student with attendance status
interface StudentAttendance {
  id: string
  nome_completo: string
  status_presenca: 'presente' | 'falta' | 'justificada' | 'atestado_medico'
  observacoes?: string
}
```

---

## UI Components (shadcn/ui)

### Component Library

The project uses **shadcn/ui** (50+ components) built on Radix UI primitives for:
- Accessibility compliance (WCAG 2.1 AA)
- Consistent design system
- Theme support (light/dark mode)
- TypeScript type safety

### Core UI Components

**Navigation & Layout**:
- `accordion.tsx` - Collapsible sections
- `tabs.tsx` - Content organization
- `breadcrumb.tsx` - Page location
- `sidebar.tsx` - Main navigation
- `navigation-menu.tsx` - Header navigation

**Data Display**:
- `table.tsx` - Data tables with sorting
- `card.tsx` - Content containers
- `badge.tsx` - Status indicators
- `avatar.tsx` - User images
- `separator.tsx` - Visual dividers

**Forms & Inputs**:
- `input.tsx` - Text inputs
- `textarea.tsx` - Multi-line inputs
- `checkbox.tsx` - Boolean selection
- `radio-group.tsx` - Single selection
- `select.tsx` - Dropdown selection
- `calendar.tsx` - Date picker
- `form.tsx` - Form wrapper with React Hook Form

**Feedback**:
- `alert.tsx` - Informational messages
- `toast.tsx` - Temporary notifications (Sonner integration)
- `dialog.tsx` - Modal dialogs
- `alert-dialog.tsx` - Confirmation dialogs
- `progress.tsx` - Loading indicators
- `skeleton.tsx` - Loading placeholders

**Actions**:
- `button.tsx` - Primary actions
- `dropdown-menu.tsx` - Contextual menus
- `context-menu.tsx` - Right-click menus
- `command.tsx` - Command palette (Cmd+K)

### Brazilian-Specific UI Components

**Enhanced Brazilian Inputs** (`components/ui/enhanced-brazilian-inputs.tsx`):

```typescript
// CPF Input with validation and formatting
<CPFInput
  value={cpf}
  onChange={setCpf}
  onValidationChange={(isValid) => console.log('CPF valid:', isValid)}
  placeholder="000.000.000-00"
  required
/>

// Brazilian Phone Input (mobile/landline)
<BrazilianPhoneInput
  value={phone}
  onChange={setPhone}
  onValidationChange={(isValid) => console.log('Phone valid:', isValid)}
  placeholder="(00) 00000-0000"
  required
/>

// CEP Input with address lookup
<CEPInput
  value={cep}
  onChange={setCep}
  onAddressFound={(address) => {
    setEndereco(address.logradouro)
    setBairro(address.bairro)
    setCidade(address.cidade)
  }}
  placeholder="00000-000"
/>
```

---

## State Management Patterns

### 1. Zustand Global State

Used for application-wide state (auth, theme, settings):

```typescript
// stores/useAuthStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isAuthenticated: false,
      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
        set({ user: data.user, isAuthenticated: true })
      },
      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, isAuthenticated: false })
      },
      refreshProfile: async () => {
        const { data } = await supabase
          .from('users')
          .select('*')
          .single()
        set({ profile: data })
      }
    }),
    { name: 'auth-storage' }
  )
)
```

### 2. TanStack Query (React Query) for Server State

Used for data fetching, caching, and synchronization:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Query with automatic caching and refetching
export function useStudents(turmaId: string) {
  return useQuery({
    queryKey: ['students', turmaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', turmaId)
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Mutation with optimistic updates
export function useMarkAttendance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: MarkAttendanceParams) => {
      const { data, error } = await supabase
        .from('frequencia')
        .upsert(params)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    }
  })
}
```

### 3. Local Component State

Used for UI-specific state that doesn't need sharing:

```typescript
// useState for simple state
const [isOpen, setIsOpen] = useState(false)
const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

// useReducer for complex state logic
type State = {
  phase: 'idle' | 'loading' | 'success' | 'error'
  data: Data | null
  error: string | null
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Data }
  | { type: 'FETCH_ERROR'; payload: string }

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'FETCH_START':
      return { phase: 'loading', data: null, error: null }
    case 'FETCH_SUCCESS':
      return { phase: 'success', data: action.payload, error: null }
    case 'FETCH_ERROR':
      return { phase: 'error', data: null, error: action.payload }
    default:
      return state
  }
}

const [state, dispatch] = useReducer(reducer, {
  phase: 'idle',
  data: null,
  error: null
})
```

---

## Component Usage Examples

### Example 1: Student Registration Form

```typescript
import { EnhancedFormSystem } from '@/components/forms/enhanced-form-system'
import { z } from 'zod'

const studentSchema = z.object({
  nome_completo: z.string().min(3),
  cpf: z.string().refine(validateCPF, 'CPF inválido'),
  data_nascimento: z.string(),
  responsavel_nome: z.string(),
  responsavel_telefone: z.string()
})

type StudentData = z.infer<typeof studentSchema>

export function StudentRegistrationPage() {
  const handleSubmit = async (data: StudentData) => {
    const { error } = await supabase.from('alunos').insert(data)
    if (error) throw error
  }

  return (
    <EnhancedFormSystem<StudentData>
      formId="student-registration"
      title="Matrícula de Aluno"
      fields={[...]} // Field configurations
      schema={studentSchema}
      onSubmit={handleSubmit}
      showProgress
      educationalCompliance={{ inepRequired: true }}
    />
  )
}
```

### Example 2: Attendance Workflow

```typescript
import { AbrirAulaWorkflow } from '@/components/attendance/AbrirAulaWorkflow'

export function AttendancePage({ turmaId, professorId }: Props) {
  const [session, setSession] = useState<Session | null>(null)

  return (
    <AbrirAulaWorkflow
      turmaId={turmaId}
      professorId={professorId}
      dataAula={new Date().toISOString().split('T')[0]}
      showTutorial={false}
      onSessionChange={setSession}
    />
  )
}
```

### Example 3: Protected Admin Component

```typescript
import { AuthGuard } from '@/components/auth/AuthGuard'

export function AdminDashboard() {
  return (
    <AuthGuard requiredRoles={['admin', 'diretor']}>
      <div>
        {/* Admin content */}
      </div>
    </AuthGuard>
  )
}
```

---

## Best Practices

### 1. Component Organization

- **One component per file** with descriptive names
- **Co-locate related files** (component, styles, tests)
- **Export from index files** for cleaner imports
- **Use TypeScript interfaces** for all props and state

### 2. Performance

- **React.memo** for expensive components that rarely update
- **useCallback** for functions passed as props
- **useMemo** for expensive calculations
- **Code splitting** with dynamic imports for large components
- **Virtualization** for long lists (react-window)

```typescript
// Lazy loading heavy components
const HeavyChart = lazy(() => import('@/components/charts/HeavyChart'))

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HeavyChart data={data} />
    </Suspense>
  )
}

// Memoization for expensive components
const MemoizedStudentList = React.memo(StudentList, (prevProps, nextProps) => {
  return prevProps.students === nextProps.students
})
```

### 3. Accessibility

- **Semantic HTML** (button, nav, main, article)
- **ARIA labels** for screen readers
- **Keyboard navigation** (Tab, Enter, Space, Arrow keys)
- **Focus management** (trap focus in modals, restore on close)
- **Color contrast** (WCAG AA minimum 4.5:1)

```typescript
<button
  onClick={handleClick}
  aria-label="Marcar aluno como presente"
  aria-pressed={isPresent}
  className="min-h-[44px] min-w-[44px]" // Touch target size
>
  {isPresent ? 'Presente' : 'Ausente'}
</button>
```

### 4. Error Handling

- **Error boundaries** for component crashes
- **Try-catch blocks** for async operations
- **User-friendly error messages** (not technical jargon)
- **Logging** for debugging (structured logs with context)

```typescript
try {
  await saveAttendance(data)
  toast.success('Frequência salva com sucesso!')
} catch (error) {
  logger.error('Attendance save error:', {
    error,
    sessionId,
    userId,
    timestamp: new Date().toISOString()
  })

  if (error instanceof SupabaseError && error.code === 'PGRST116') {
    toast.error('Sessão bloqueada. Não é possível modificar frequência.')
  } else {
    toast.error('Erro ao salvar frequência. Tente novamente.')
  }
}
```

### 5. Brazilian Educational Context

- **INEP compliance indicators** (badges for required fields)
- **Educational help text** (explain why data is needed)
- **Legal compliance warnings** ("não existe o esquecer")
- **Government reporting context** (Educacenso, Bolsa Família)

```typescript
<FormField
  name="cpf"
  label="CPF do Aluno"
  inepRequired
  educationalContext="CPF necessário para programas sociais como Bolsa Família e relatórios INEP/Educacenso"
  helpText="Apenas números. Será formatado automaticamente."
/>
```

---

## Performance Optimization

### 1. Bundle Optimization

- **Code splitting** by route with Next.js dynamic imports
- **Tree shaking** with ES modules
- **Component lazy loading** for below-the-fold content
- **Image optimization** with Next.js Image component

### 2. Render Optimization

- **Virtual scrolling** for attendance grids (react-window)
- **Debouncing** for search inputs (300ms delay)
- **Throttling** for scroll events (100ms interval)
- **Memoization** for expensive calculations

```typescript
// Virtual list for 500+ students
import { FixedSizeList } from 'react-window'

function StudentList({ students }: Props) {
  return (
    <FixedSizeList
      height={600}
      itemCount={students.length}
      itemSize={60}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <StudentRow student={students[index]} />
        </div>
      )}
    </FixedSizeList>
  )
}
```

### 3. Data Fetching Optimization

- **TanStack Query caching** (5-minute stale time)
- **Optimistic updates** for instant feedback
- **Prefetching** for predictable navigation
- **Pagination** for large datasets (20 items per page)

```typescript
// Prefetch next page on hover
function StudentListItem({ student, prefetchNextPage }: Props) {
  return (
    <Link
      href={`/students/${student.id}`}
      onMouseEnter={prefetchNextPage}
    >
      {student.nome_completo}
    </Link>
  )
}
```

### 4. Real-time Performance

- **Supabase subscriptions** for live updates
- **Debounced state updates** (200ms for rapid changes)
- **Connection status indicators** for offline detection
- **Retry logic** with exponential backoff

```typescript
// Real-time with performance optimization
useEffect(() => {
  let updateTimeout: NodeJS.Timeout

  const subscription = supabase
    .channel('attendance_updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'frequencia',
      filter: `sessao_aula_id=eq.${sessionId}`
    }, (payload) => {
      // Debounce rapid updates
      clearTimeout(updateTimeout)
      updateTimeout = setTimeout(() => {
        setAttendance(prev => updateAttendance(prev, payload.new))
      }, 200)
    })
    .subscribe()

  return () => {
    clearTimeout(updateTimeout)
    subscription.unsubscribe()
  }
}, [sessionId])
```

---

## Component Maintenance Guidelines

### 1. Documentation

- **JSDoc comments** for complex components
- **Inline comments** for non-obvious logic
- **README files** for component directories
- **Storybook stories** for UI components (planned)

### 2. Testing

- **Unit tests** for utility functions (Jest)
- **Component tests** for user interactions (React Testing Library)
- **E2E tests** for critical workflows (Playwright)
- **Visual regression tests** for UI consistency (planned)

### 3. Refactoring

- **Extract reusable logic** into custom hooks
- **Split large components** (>500 lines) into smaller ones
- **Remove dead code** regularly
- **Update dependencies** quarterly with testing

### 4. Code Review Checklist

- ✅ TypeScript strict mode compliance
- ✅ Accessibility (WCAG 2.1 AA)
- ✅ Performance (no unnecessary re-renders)
- ✅ Error handling (try-catch, error boundaries)
- ✅ Brazilian validation (CPF, phone, dates)
- ✅ Mobile-responsive (44px touch targets)
- ✅ Documentation (JSDoc, inline comments)
- ✅ Tests (unit, integration, E2E)

---

## Conclusion

This component architecture provides a solid foundation for the Sistema de Gestão Educacional with:

- **145+ components** organized by feature and domain
- **Brazilian educational compliance** built-in (INEP, LGPD, Educacenso)
- **Production-ready patterns** (auth, forms, real-time, performance)
- **Accessibility compliance** (WCAG 2.1 AA)
- **Mobile-optimized** for classroom tablet use
- **Type-safe** with TypeScript strict mode
- **Maintainable** with clear patterns and documentation

The system is **90% production-ready** with comprehensive component coverage for student registration, attendance workflows, reporting, and administrative functions.

---

**Next Steps for 100% Production Readiness**:
1. Complete remaining attendance workflow edge cases
2. Add comprehensive E2E test coverage
3. Implement Storybook for component documentation
4. Performance optimization for large schools (1000+ students)
5. Enhanced offline support with service workers

**Maintained By**: Development Team
**For Questions**: See `docs/PROJECT_INDEX.md` and `docs/API_REFERENCE.md`
