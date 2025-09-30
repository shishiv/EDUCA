# Next.js 15 Style Guide

## App Router Structure

Use Next.js 15 App Router exclusively with the following file conventions:

### Core App Directory Structure
```
app/
├── (auth)/              # Route groups for authentication
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx
├── (dashboard)/         # Route groups for authenticated app
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── error.tsx
│   └── layout.tsx
├── api/                 # API routes
│   └── route.ts
├── globals.css          # Global styles
├── layout.tsx           # Root layout
└── page.tsx             # Home page
```

### File Naming Conventions
- **Pages**: `page.tsx` (never `index.tsx`)
- **Layouts**: `layout.tsx`
- **Loading States**: `loading.tsx`
- **Error Boundaries**: `error.tsx`
- **Not Found**: `not-found.tsx`
- **API Routes**: `route.ts`

## Component Patterns

### Server Components (Default)
Use Server Components by default for better performance:

```tsx
// ✅ Server Component (default)
import { StudentList } from '@/components/students/student-list'

export default async function StudentsPage() {
  const students = await getStudents()

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Lista de Alunos</h1>
      <StudentList students={students} />
    </div>
  )
}
```

### Client Components (When Needed)
Add `'use client'` directive only when necessary:

```tsx
// ✅ Client Component (when interactivity needed)
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function AttendanceMarker({ studentId }: { studentId: string }) {
  const [isPresent, setIsPresent] = useState(false)

  const toggleAttendance = () => {
    setIsPresent(!isPresent)
    // Handle attendance logic
  }

  return (
    <Button
      variant={isPresent ? 'default' : 'outline'}
      onClick={toggleAttendance}
      className="touch-manipulation min-h-[44px]"
    >
      {isPresent ? 'Presente' : 'Ausente'}
    </Button>
  )
}
```

## Data Fetching Patterns

### Server-Side Data Fetching
Use native `fetch` with Next.js caching in Server Components:

```tsx
// ✅ Server Component data fetching
async function getStudentData(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/alunos?id=eq.${id}`, {
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    // Cache for 1 hour, revalidate every 30 minutes
    next: { revalidate: 1800 }
  })

  if (!res.ok) {
    throw new Error('Failed to fetch student data')
  }

  return res.json()
}

export default async function StudentPage({ params }: { params: { id: string } }) {
  const student = await getStudentData(params.id)

  return (
    <div>
      {/* Student details */}
    </div>
  )
}
```

### Server Actions for Mutations
Use Server Actions for form submissions and data mutations:

```tsx
// ✅ Server Actions pattern
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateStudentAttendance(formData: FormData) {
  const studentId = formData.get('studentId') as string
  const isPresent = formData.get('isPresent') === 'true'

  // Update attendance in Supabase
  const { error } = await supabase
    .from('frequencia')
    .upsert({
      aluno_id: studentId,
      data: new Date().toISOString().split('T')[0],
      presente: isPresent,
      updated_at: new Date().toISOString()
    })

  if (error) {
    throw new Error('Failed to update attendance')
  }

  // Revalidate the attendance page
  revalidatePath('/dashboard/attendance')
  redirect('/dashboard/attendance')
}
```

### Client-Side Data Fetching
Use TanStack Query for client-side data fetching when needed:

```tsx
// ✅ Client-side data fetching with TanStack Query
'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function LiveAttendanceCounter({ classId }: { classId: string }) {
  const { data: attendanceCount, isLoading } = useQuery({
    queryKey: ['attendance-count', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('frequencia')
        .select('presente')
        .eq('turma_id', classId)
        .eq('data', new Date().toISOString().split('T')[0])

      if (error) throw error

      return data.filter(record => record.presente).length
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  if (isLoading) return <div>Carregando...</div>

  return (
    <div className="text-lg font-semibold">
      Presentes: {attendanceCount}
    </div>
  )
}
```

## Routing and Navigation

### Dynamic Routes
Use folder structure with square brackets for dynamic routes:

```
app/
├── students/
│   ├── [id]/
│   │   ├── page.tsx          # /students/123
│   │   └── edit/
│   │       └── page.tsx      # /students/123/edit
│   └── page.tsx              # /students
```

### Navigation with Link Component
Always use Next.js `Link` component for internal navigation:

```tsx
// ✅ Internal navigation
import Link from 'next/link'

export function StudentCard({ student }: { student: Student }) {
  return (
    <div className="card">
      <h3>{student.nome}</h3>
      <div className="flex gap-2 mt-4">
        <Link
          href={`/students/${student.id}`}
          className="btn-primary"
        >
          Ver Detalhes
        </Link>
        <Link
          href={`/students/${student.id}/edit`}
          className="btn-secondary"
        >
          Editar
        </Link>
      </div>
    </div>
  )
}
```

### Programmatic Navigation
Use `useRouter` for programmatic navigation in Client Components:

```tsx
// ✅ Programmatic navigation
'use client'

import { useRouter } from 'next/navigation'

export function CreateStudentForm() {
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    // Create student logic
    const newStudentId = await createStudent(formData)

    // Navigate to new student page
    router.push(`/students/${newStudentId}`)
  }

  return (
    <form action={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

## Error Handling and Loading States

### Error Boundaries
Create `error.tsx` files for error handling:

```tsx
// ✅ Error boundary (error.tsx)
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Student page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <h2 className="text-xl font-semibold mb-4">
        Algo deu errado!
      </h2>
      <p className="text-muted-foreground mb-6">
        Erro ao carregar os dados dos alunos.
      </p>
      <Button onClick={reset}>
        Tentar Novamente
      </Button>
    </div>
  )
}
```

### Loading States
Create `loading.tsx` files for loading UI:

```tsx
// ✅ Loading state (loading.tsx)
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="container mx-auto py-6">
      <Skeleton className="h-8 w-64 mb-6" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Metadata and SEO

### Static Metadata
Export metadata for static pages:

```tsx
// ✅ Static metadata
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lista de Alunos | Sistema Educacional',
  description: 'Gerencie e visualize informações dos alunos matriculados.',
  keywords: ['educação', 'alunos', 'gestão escolar'],
}

export default function StudentsPage() {
  return (
    <div>
      {/* Page content */}
    </div>
  )
}
```

### Dynamic Metadata
Use `generateMetadata` for dynamic pages:

```tsx
// ✅ Dynamic metadata
import type { Metadata } from 'next'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const student = await getStudent(params.id)

  return {
    title: `${student.nome} | Sistema Educacional`,
    description: `Perfil do aluno ${student.nome} - Turma ${student.turma}`,
  }
}

export default async function StudentPage({ params }: Props) {
  const student = await getStudent(params.id)

  return (
    <div>
      {/* Student details */}
    </div>
  )
}
```

## Performance Optimization

### Image Optimization
Always use Next.js `Image` component:

```tsx
// ✅ Optimized images
import Image from 'next/image'

export function StudentAvatar({ student }: { student: Student }) {
  return (
    <div className="relative w-16 h-16">
      <Image
        src={student.avatarUrl || '/default-avatar.png'}
        alt={`Foto de ${student.nome}`}
        fill
        className="rounded-full object-cover"
        sizes="64px"
        priority={false} // Only set to true for above-the-fold images
      />
    </div>
  )
}
```

### Dynamic Imports
Use dynamic imports for code splitting:

```tsx
// ✅ Dynamic imports for heavy components
import dynamic from 'next/dynamic'

const AttendanceChart = dynamic(
  () => import('@/components/charts/attendance-chart'),
  {
    loading: () => <div>Carregando gráfico...</div>,
    ssr: false // Client-side only component
  }
)

export function AttendanceReports() {
  return (
    <div>
      <h2>Relatórios de Frequência</h2>
      <AttendanceChart />
    </div>
  )
}
```

### Parallel Data Fetching
Fetch data in parallel when possible:

```tsx
// ✅ Parallel data fetching
export default async function DashboardPage() {
  // Fetch data in parallel
  const [students, classes, reports] = await Promise.all([
    getStudents(),
    getClasses(),
    getReports(),
  ])

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <StudentsOverview data={students} />
      <ClassesOverview data={classes} />
      <ReportsOverview data={reports} />
    </div>
  )
}
```

## Route Handlers (API Routes)

### API Route Structure
Create API routes in the `app/api/` directory:

```tsx
// ✅ API route (app/api/students/route.ts)
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validatedData = studentSchema.parse(body)

    const { data, error } = await supabase
      .from('alunos')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    )
  }
}
```

## Brazilian Educational Context

### Educational Route Organization
Organize routes based on Brazilian educational workflows:

```
app/
├── (auth)/
├── (dashboard)/
│   ├── alunos/              # Students management
│   ├── frequencia/          # Attendance ("Abrir aula" workflow)
│   ├── turmas/              # Classes management
│   ├── relatorios/          # Reports (INEP compliance)
│   └── configuracoes/       # Settings
```

### Form Actions for Educational Workflows
Implement Server Actions for educational processes:

```tsx
// ✅ "Abrir aula" workflow Server Action
'use server'

import { revalidatePath } from 'next/cache'

export async function abrirAula(formData: FormData) {
  const turmaId = formData.get('turmaId') as string
  const professorId = formData.get('professorId') as string
  const data = new Date().toISOString().split('T')[0]

  // Check if class is already open
  const { data: existingSession } = await supabase
    .from('sessoes_aula')
    .select('id')
    .eq('turma_id', turmaId)
    .eq('data', data)
    .eq('status', 'aberta')
    .single()

  if (existingSession) {
    throw new Error('Aula já foi aberta para hoje')
  }

  // Create new class session
  const { error } = await supabase
    .from('sessoes_aula')
    .insert({
      turma_id: turmaId,
      professor_id: professorId,
      data,
      status: 'aberta',
      horario_abertura: new Date().toISOString()
    })

  if (error) {
    throw new Error('Erro ao abrir aula: ' + error.message)
  }

  revalidatePath('/dashboard/frequencia')
}
```

Remember: Always prioritize Brazilian educational compliance, performance for classroom environments, and accessibility in all Next.js implementations.