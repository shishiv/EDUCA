# Barrel Exports - Usage Guide

## Overview

Barrel exports simplificam o processo de importação de componentes relacionados. Em vez de fazer múltiplos imports de um mesmo diretório, você pode fazer um único import de componentes relacionados.

---

## Module: `components/attendance`

### O que é exportado?

```typescript
// Componentes principais
export { FrequenciaWorkflow } from './FrequenciaWorkflow'
export { AbrirAulaWorkflow } from './AbrirAulaWorkflow'
export { AttendanceGrid } from './AttendanceGrid'
export { FecharAulaDialog } from './FecharAulaDialog'

// Tipos
export type { AbrirAulaWorkflowProps } from './AbrirAulaWorkflow'
export type { AttendanceGridProps } from './AttendanceGrid'
export type { FecharAulaDialogProps } from './FecharAulaDialog'
```

### Exemplo 1: Componente simples

**Antes (imports múltiplos)**:
```typescript
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid'
import { FecharAulaDialog } from '@/components/attendance/FecharAulaDialog'
import { AbrirAulaWorkflow } from '@/components/attendance/AbrirAulaWorkflow'

export function MyComponent() {
  // ...
}
```

**Depois (barrel export)**:
```typescript
import { AttendanceGrid, FecharAulaDialog, AbrirAulaWorkflow } from '@/components/attendance'

export function MyComponent() {
  // ...
}
```

### Exemplo 2: Com tipos

**Antes**:
```typescript
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid'
import type { AttendanceGridProps } from '@/components/attendance/AttendanceGrid'

interface MyProps extends AttendanceGridProps {
  // custom props
}
```

**Depois**:
```typescript
import { AttendanceGrid, type AttendanceGridProps } from '@/components/attendance'

interface MyProps extends AttendanceGridProps {
  // custom props
}
```

### Exemplo 3: Página completa de frequência

```typescript
'use client'

import { useState } from 'react'
import { FrequenciaWorkflow, AttendanceGrid, FecharAulaDialog, AbrirAulaWorkflow } from '@/components/attendance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function FrequenciaPage() {
  const [turmaId] = useState('turma-123')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequência da Turma</CardTitle>
      </CardHeader>
      <CardContent>
        <FrequenciaWorkflow />
      </CardContent>
    </Card>
  )
}
```

---

## Module: `components/students`

### O que é exportado?

```typescript
// Componentes principais
export { StudentRegistrationForm } from './student-registration-form'
export { EnhancedStudentRegistrationForm } from './enhanced-student-registration-form'
export { StudentRegistrationWizard } from './student-registration-wizard'

// Wizard steps
export { PersonalInfoStep } from './wizard-steps/personal-info-step'
export { ContactInfoStep } from './wizard-steps/contact-info-step'
export { EducationalInfoStep } from './wizard-steps/educational-info-step'
export { FamilyInfoStep } from './wizard-steps/family-info-step'
export { HealthInfoStep } from './wizard-steps/health-info-step'
export { ReviewStep } from './wizard-steps/review-step'

// Tipos
export type { StudentFormData } from '@/lib/validators/brazilian'
```

### Exemplo 1: Registro rápido de aluno

**Antes**:
```typescript
import { StudentRegistrationForm } from '@/components/students/student-registration-form'

export function QuickRegistration() {
  return <StudentRegistrationForm />
}
```

**Depois**:
```typescript
import { StudentRegistrationForm } from '@/components/students'

export function QuickRegistration() {
  return <StudentRegistrationForm />
}
```

### Exemplo 2: Wizard completo com todas as etapas

**Antes**:
```typescript
import { StudentRegistrationWizard } from '@/components/students/student-registration-wizard'
import { PersonalInfoStep } from '@/components/students/wizard-steps/personal-info-step'
import { ContactInfoStep } from '@/components/students/wizard-steps/contact-info-step'
import { EducationalInfoStep } from '@/components/students/wizard-steps/educational-info-step'
import { FamilyInfoStep } from '@/components/students/wizard-steps/family-info-step'
import { HealthInfoStep } from '@/components/students/wizard-steps/health-info-step'
import { ReviewStep } from '@/components/students/wizard-steps/review-step'
```

**Depois**:
```typescript
import {
  StudentRegistrationWizard,
  PersonalInfoStep,
  ContactInfoStep,
  EducationalInfoStep,
  FamilyInfoStep,
  HealthInfoStep,
  ReviewStep
} from '@/components/students'
```

### Exemplo 3: Escolher entre formulário simples ou wizard

```typescript
'use client'

import { StudentRegistrationForm, StudentRegistrationWizard } from '@/components/students'
import { useState } from 'react'

export function StudentRegistrationPage() {
  const [useWizard, setUseWizard] = useState(false)

  return (
    <>
      {useWizard ? (
        <StudentRegistrationWizard />
      ) : (
        <StudentRegistrationForm />
      )}
      <button onClick={() => setUseWizard(!useWizard)}>
        Alternar para {useWizard ? 'Formulário' : 'Wizard'}
      </button>
    </>
  )
}
```

---

## Module: `components/dashboard`

### O que é exportado?

```typescript
// Componentes principais
export { RoleSpecificDashboards } from './role-specific-dashboards'
export { TeacherDashboardEnhanced } from './teacher-dashboard-enhanced'
export { StatsCard } from './stats-card'

// Tipos
export type { StatsCardProps } from './stats-card'
export type { TeacherDashboardEnhancedProps } from './teacher-dashboard-enhanced'
```

### Exemplo 1: Dashboard com múltiplos stats cards

**Antes**:
```typescript
import { StatsCard } from '@/components/dashboard/stats-card'
import { Users, School, GraduationCap } from 'lucide-react'

export function MainDashboard() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatsCard title="Alunos" value={250} icon={Users} variant="primary" />
      <StatsCard title="Escolas" value={5} icon={School} variant="secondary" />
      <StatsCard title="Turmas" value={18} icon={GraduationCap} variant="accent" />
    </div>
  )
}
```

**Depois**:
```typescript
import { StatsCard, type StatsCardProps } from '@/components/dashboard'
import { Users, School, GraduationCap } from 'lucide-react'

export function MainDashboard() {
  const stats: StatsCardProps[] = [
    { title: "Alunos", value: 250, icon: Users, variant: "primary" },
    { title: "Escolas", value: 5, icon: School, variant: "secondary" },
    { title: "Turmas", value: 18, icon: GraduationCap, variant: "accent" },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat, idx) => (
        <StatsCard key={idx} {...stat} />
      ))}
    </div>
  )
}
```

### Exemplo 2: Dashboard com role específico

```typescript
'use client'

import { TeacherDashboardEnhanced } from '@/components/dashboard'
import { useAuth } from '@/hooks/use-auth'

export function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  if (user.role === 'professor') {
    return <TeacherDashboardEnhanced professorId={user.id} />
  }

  return <div>Dashboard não disponível para este papel</div>
}
```

### Exemplo 3: StatsCard com trend (tendência)

```typescript
import { StatsCard, type StatsCardProps } from '@/components/dashboard'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function AdvancedDashboard() {
  const stats: StatsCardProps[] = [
    {
      title: "Frequência Média",
      value: "87%",
      icon: TrendingUp,
      trend: { value: 5, isPositive: true },
      variant: "emerald"
    },
    {
      title: "Taxa de Evasão",
      value: "3%",
      icon: TrendingDown,
      trend: { value: 1, isPositive: true },
      variant: "rose"
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, idx) => (
        <StatsCard key={idx} {...stat} />
      ))}
    </div>
  )
}
```

---

## Module: `components/layout`

### O que é exportado?

```typescript
// Main layout components
export { Sidebar } from './sidebar'
export { EnhancedSidebar } from './enhanced-sidebar'
export { Header } from './header'
export { MobileHeader } from './mobile-header'

// Navigation and breadcrumbs
export { EnhancedBreadcrumbs, PageHeader } from './enhanced-breadcrumbs'

// Navigation provider
export { NavigationProvider, useNavigation } from './navigation-provider'

// Mobile responsive components
export { MobileSidebar } from './mobile-sidebar'

// Authentication and access control
export { AuthGuard } from './auth-guard'

// Tipos
export type { AuthGuardProps } from './auth-guard'
```

### Exemplo 1: Layout completo da aplicação

**Antes**:
```typescript
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { NavigationProvider } from '@/components/layout/navigation-provider'
import { AuthGuard } from '@/components/layout/auth-guard'

export default function DashboardLayout({ children }) {
  return (
    <NavigationProvider>
      <AuthGuard allowedRoles={['admin', 'diretor', 'secretario', 'professor']}>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </AuthGuard>
    </NavigationProvider>
  )
}
```

**Depois**:
```typescript
import { Header, Sidebar, NavigationProvider, AuthGuard } from '@/components/layout'

export default function DashboardLayout({ children }) {
  return (
    <NavigationProvider>
      <AuthGuard allowedRoles={['admin', 'diretor', 'secretario', 'professor']}>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </AuthGuard>
    </NavigationProvider>
  )
}
```

### Exemplo 2: Usando breadcrumbs

**Antes**:
```typescript
import { EnhancedBreadcrumbs, PageHeader } from '@/components/layout/enhanced-breadcrumbs'

export function AlunosPage() {
  return (
    <>
      <PageHeader title="Alunos" description="Gerenciar alunos da escola" />
      <EnhancedBreadcrumbs />
      {/* conteúdo */}
    </>
  )
}
```

**Depois**:
```typescript
import { EnhancedBreadcrumbs, PageHeader } from '@/components/layout'

export function AlunosPage() {
  return (
    <>
      <PageHeader title="Alunos" description="Gerenciar alunos da escola" />
      <EnhancedBreadcrumbs />
      {/* conteúdo */}
    </>
  )
}
```

### Exemplo 3: Proteção de rota com tipos

```typescript
import { AuthGuard, type AuthGuardProps } from '@/components/layout'

export function AdminPage({ children }: { children: React.ReactNode }) {
  const config: AuthGuardProps = {
    allowedRoles: ['admin'],
    fallbackPath: '/dashboard',
  }

  return (
    <AuthGuard {...config}>
      {children}
    </AuthGuard>
  )
}
```

### Exemplo 4: Usando o hook de navegação

```typescript
'use client'

import { useNavigation, Sidebar } from '@/components/layout'

export function SidebarWithNavigation() {
  const { activeRoute, navigate } = useNavigation()

  return (
    <Sidebar>
      <button onClick={() => navigate('/dashboard/alunos')}>
        Alunos {activeRoute === '/dashboard/alunos' && '✓'}
      </button>
    </Sidebar>
  )
}
```

---

## Best Practices

### 1. ✅ Use Barrel Exports para Imports Múltiplos

```typescript
// ✅ BOM - Vários componentes do mesmo módulo
import { StatsCard, TeacherDashboardEnhanced } from '@/components/dashboard'

// ❌ RUIM - Importar cada um separadamente
import { StatsCard } from '@/components/dashboard/stats-card'
import { TeacherDashboardEnhanced } from '@/components/dashboard/teacher-dashboard-enhanced'
```

### 2. ✅ Importe Tipos Corretamente

```typescript
// ✅ BOM - Tipos e componentes juntos
import { StatsCard, type StatsCardProps } from '@/components/dashboard'

// ✅ TAMBÉM BOM - Separar se necessário
import type { StatsCardProps } from '@/components/dashboard'
import { StatsCard } from '@/components/dashboard'
```

### 3. ✅ Use Desestruturação para Múltiplos Componentes

```typescript
// ✅ BOM
import { AttendanceGrid, FecharAulaDialog, FrequenciaWorkflow } from '@/components/attendance'

// ❌ EVITAR - Import alojado
import * as Attendance from '@/components/attendance'
// Attendance.AttendanceGrid // mais verboso
```

### 4. ✅ Organize Imports Semanticamente

```typescript
// ✅ BOM - Agrupar logicamente
import { StatsCard, TeacherDashboardEnhanced } from '@/components/dashboard'
import { StudentRegistrationWizard, PersonalInfoStep } from '@/components/students'
import { Header, Sidebar } from '@/components/layout'

// ❌ RUIM - Ordem aleatória
import { Sidebar, StudentRegistrationWizard } from '@/components/layout'
import { StatsCard } from '@/components/dashboard'
import { PersonalInfoStep } from '@/components/students'
```

---

## Migração Incremental

Você **NÃO precisa** migrar todos os imports de uma vez. A abordagem recomendada:

1. **Novos componentes**: Use barrel exports imediatamente
2. **Refatoração gradual**: Migre conforme trabalha em cada módulo
3. **Pull Requests**: Agrupe mudanças relacionadas na mesma PR

**Exemplo - PR para página de alunos**:
```typescript
// Antes (pull request X)
import { StudentRegistrationWizard } from '@/components/students/student-registration-wizard'

// Depois (PR atual)
import { StudentRegistrationWizard } from '@/components/students'
```

---

## Troubleshooting

### Erro: "Cannot find module"

**Causa**: Arquivo `index.ts` não foi criado corretamente

**Solução**: Verificar se o arquivo existe:
```bash
ls gestao_fronteira/components/attendance/index.ts
ls gestao_fronteira/components/students/index.ts
ls gestao_fronteira/components/dashboard/index.ts
ls gestao_fronteira/components/layout/index.ts
```

### Erro: "Default export is not exported"

**Causa**: Tentando importar default export de barrel export

**Solução**: Barrel exports exportam named exports, não default exports
```typescript
// ✅ CORRETO
import { StatsCard } from '@/components/dashboard'

// ❌ ERRADO
import StatsCard from '@/components/dashboard'
```

### Erro: Tipo não encontrado

**Causa**: Tipo não está sendo exportado do barrel

**Solução**: Verificar se está exportado no index.ts
```typescript
// No index.ts, confirmando export
export type { StatsCardProps } from './stats-card'

// Uso correto
import type { StatsCardProps } from '@/components/dashboard'
```

---

## Summary

✅ **Benefícios dos Barrel Exports**:
- Imports mais limpas e legíveis
- Menos verbosidade nos componentes
- Interface clara do módulo
- Facilita refatoração futura
- Padrão consistente em toda a aplicação

✅ **Módulos com Barrel Exports**:
- `components/attendance/index.ts`
- `components/students/index.ts`
- `components/dashboard/index.ts`
- `components/layout/index.ts`

✅ **Próximos Passos Opcionais**:
- Migrar imports existentes (gradualmente)
- Criar barrel exports para outros módulos (`forms/`, `admin/`, etc.)
- Documentar padrão no CONTRIBUTING.md

---

**Para mais detalhes**, veja `BARREL_EXPORTS_SUMMARY.md`
