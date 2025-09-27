'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Check, X, Users, Search, Eye, AlertCircle, Info, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SkipLinks } from '@/components/accessibility/skip-links'
import { HighContrastMode } from '@/components/accessibility/high-contrast-mode'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface Student {
  aluno_id: string
  numero_chamada: number
  student: {
    id: string
    nome_completo: string
    numero_matricula: string
    data_nascimento: string
  }
  attendance: {
    id?: string
    presente: boolean
    observacoes?: string
    is_locked: boolean
  } | null
  marked: boolean
  can_modify: boolean
}

interface WCAGCompliantAttendanceGridProps {
  sessionId: string
  session: {
    id: string
    turma_nome: string
    bloqueado: boolean
  }
  students: Student[]
  onAttendanceUpdate: (students: Student[]) => void
  className?: string
}

interface ScreenReaderAnnouncement {
  message: string
  priority: 'polite' | 'assertive'
  timestamp: number
}

export default function WCAGCompliantAttendanceGrid({
  sessionId,
  session,
  students: initialStudents,
  onAttendanceUpdate,
  className
}: WCAGCompliantAttendanceGridProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'unmarked'>('all')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [focusedStudent, setFocusedStudent] = useState<string | null>(null)
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [screenReaderMode, setScreenReaderMode] = useState(false)
  const [announcements, setAnnouncements] = useState<ScreenReaderAnnouncement[]>([])

  // Refs for keyboard navigation
  const gridRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const studentRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const liveRegionRef = useRef<HTMLDivElement>(null)

  // Detect user preferences
  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    const handleChange = () => setReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    // Check for high contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    setHighContrast(highContrastQuery.matches)

    const handleContrastChange = () => setHighContrast(highContrastQuery.matches)
    highContrastQuery.addEventListener('change', handleContrastChange)

    // Detect screen reader usage
    const hasScreenReader = window.navigator.userAgent.includes('NVDA') ||
                           window.navigator.userAgent.includes('JAWS') ||
                           window.speechSynthesis

    setScreenReaderMode(!!hasScreenReader)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
      highContrastQuery.removeEventListener('change', handleContrastChange)
    }
  }, [])

  // Screen reader announcements
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement: ScreenReaderAnnouncement = {
      message,
      priority,
      timestamp: Date.now()
    }

    setAnnouncements(prev => [...prev.slice(-4), announcement])

    // Also use the live region
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = ''
        }
      }, 1000)
    }
  }, [])

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const studentIds = filteredStudents.map(s => s.aluno_id)
    const currentIndex = focusedStudent ? studentIds.indexOf(focusedStudent) : -1

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        const nextIndex = Math.min(currentIndex + 1, studentIds.length - 1)
        const nextStudentId = studentIds[nextIndex]
        if (nextStudentId) {
          setFocusedStudent(nextStudentId)
          studentRefs.current.get(nextStudentId)?.focus()
          announce(`Estudante ${nextIndex + 1} de ${studentIds.length}: ${students.find(s => s.aluno_id === nextStudentId)?.student.nome_completo}`)
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        const prevIndex = Math.max(currentIndex - 1, 0)
        const prevStudentId = studentIds[prevIndex]
        if (prevStudentId) {
          setFocusedStudent(prevStudentId)
          studentRefs.current.get(prevStudentId)?.focus()
          announce(`Estudante ${prevIndex + 1} de ${studentIds.length}: ${students.find(s => s.aluno_id === prevStudentId)?.student.nome_completo}`)
        }
        break

      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedStudent) {
          markAttendance(focusedStudent, true)
        }
        break

      case 'x':
      case 'X':
        e.preventDefault()
        if (focusedStudent) {
          markAttendance(focusedStudent, false)
        }
        break

      case 'Escape':
        e.preventDefault()
        setSelectedStudents(new Set())
        setFocusedStudent(null)
        announce('Seleção cancelada')
        break

      case 'Home':
        e.preventDefault()
        if (studentIds.length > 0) {
          setFocusedStudent(studentIds[0])
          studentRefs.current.get(studentIds[0])?.focus()
          announce(`Primeiro estudante: ${students.find(s => s.aluno_id === studentIds[0])?.student.nome_completo}`)
        }
        break

      case 'End':
        e.preventDefault()
        if (studentIds.length > 0) {
          const lastId = studentIds[studentIds.length - 1]
          setFocusedStudent(lastId)
          studentRefs.current.get(lastId)?.focus()
          announce(`Último estudante: ${students.find(s => s.aluno_id === lastId)?.student.nome_completo}`)
        }
        break

      case '/':
        e.preventDefault()
        searchRef.current?.focus()
        announce('Campo de busca focado')
        break
    }
  }, [focusedStudent, filteredStudents, students])

  const markAttendance = useCallback(async (studentId: string, presente: boolean) => {
    if (session.bloqueado) {
      announce('Ação não permitida. Sessão bloqueada para edição.', 'assertive')
      toast({
        title: 'Ação Não Permitida',
        description: 'Sessão bloqueada para edição',
        variant: 'destructive'
      })
      return
    }

    const student = students.find(s => s.aluno_id === studentId)
    if (!student || !student.can_modify) {
      announce('Não é possível modificar a frequência deste estudante.', 'assertive')
      return
    }

    // Update local state
    const updatedStudents = students.map(s => {
      if (s.aluno_id === studentId) {
        return {
          ...s,
          attendance: {
            id: s.attendance?.id,
            presente,
            observacoes: s.attendance?.observacoes,
            is_locked: false
          },
          marked: true
        }
      }
      return s
    })

    setStudents(updatedStudents)
    onAttendanceUpdate(updatedStudents)

    // Announce the action
    const statusText = presente ? 'presente' : 'ausente'
    announce(`${student.student.nome_completo} marcado como ${statusText}`, 'polite')

    toast({
      title: presente ? 'Marcado como Presente' : 'Marcado como Ausente',
      description: student.student.nome_completo,
      duration: 2000
    })
  }, [students, session.bloqueado, onAttendanceUpdate, announce])

  // Filtered students with memoization
  const filteredStudents = useMemo(() => {
    return students
      .filter(student => {
        if (searchTerm) {
          return student.student.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 student.student.numero_matricula.includes(searchTerm)
        }
        return true
      })
      .filter(student => {
        switch (filter) {
          case 'present':
            return student.attendance?.presente === true
          case 'absent':
            return student.attendance?.presente === false
          case 'unmarked':
            return !student.marked
          default:
            return true
        }
      })
      .sort((a, b) => a.numero_chamada - b.numero_chamada)
  }, [students, searchTerm, filter])

  const stats = useMemo(() => ({
    total: students.length,
    present: students.filter(s => s.attendance?.presente === true).length,
    absent: students.filter(s => s.attendance?.presente === false).length,
    pending: students.filter(s => !s.marked).length
  }), [students])

  // Student row component with full accessibility
  const AccessibleStudentRow = ({ student, index }: { student: Student; index: number }) => {
    const isSelected = selectedStudents.has(student.aluno_id)
    const isFocused = focusedStudent === student.aluno_id

    const studentName = student.student.nome_completo
    const studentNumber = student.numero_chamada
    const isMarked = student.marked
    const isPresent = student.attendance?.presente
    const canModify = student.can_modify && !session.bloqueado

    // Generate unique IDs for ARIA
    const presentButtonId = `present-${student.aluno_id}`
    const absentButtonId = `absent-${student.aluno_id}`
    const studentRowId = `student-row-${student.aluno_id}`

    return (
      <div
        ref={(el) => {
          if (el) {
            studentRefs.current.set(student.aluno_id, el)
          }
        }}
        id={studentRowId}
        role="row"
        tabIndex={isFocused ? 0 : -1}
        className={cn(
          'flex items-center justify-between p-4 border-b transition-colors focus:outline-none',
          'border-gray-200', // WCAG AA compliant border
          isFocused && 'bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          isSelected && 'bg-blue-50',
          highContrast && 'border-black',
          !reducedMotion && 'transition-all duration-200'
        )}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocusedStudent(student.aluno_id)}
        aria-label={`${studentName}, número ${studentNumber}. ${
          isMarked
            ? `Frequência: ${isPresent ? 'presente' : 'ausente'}`
            : 'Frequência não marcada'
        }`}
        aria-describedby={`${studentRowId}-status`}
        aria-selected={isSelected}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Student number with high contrast */}
          <div
            className={cn(
              'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg',
              highContrast
                ? 'bg-black text-white border-2 border-white'
                : 'bg-gray-100 text-gray-800 border border-gray-300'
            )}
            role="img"
            aria-label={`Número ${studentNumber}`}
          >
            {studentNumber}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'font-semibold truncate text-lg',
              highContrast ? 'text-black' : 'text-gray-900'
            )}>
              {studentName}
            </h3>
            <p className={cn(
              'text-sm truncate',
              highContrast ? 'text-black' : 'text-gray-600'
            )}>
              Matrícula: {student.student.numero_matricula}
            </p>
          </div>

          {/* Status indicator with screen reader support */}
          <div id={`${studentRowId}-status`} className="sr-only">
            {isMarked
              ? `Frequência marcada como ${isPresent ? 'presente' : 'ausente'}`
              : 'Frequência ainda não foi marcada'
            }
          </div>
        </div>

        {/* Attendance controls */}
        <div className="flex items-center gap-3" role="group" aria-label="Controles de frequência">
          {isMarked ? (
            <Badge
              className={cn(
                'text-base px-4 py-2 font-semibold',
                isPresent
                  ? highContrast
                    ? 'bg-black text-white border-2 border-green-500'
                    : 'bg-green-100 text-green-800 border border-green-300'
                  : highContrast
                    ? 'bg-black text-white border-2 border-red-500'
                    : 'bg-red-100 text-red-800 border border-red-300'
              )}
              role="status"
              aria-label={`Estudante marcado como ${isPresent ? 'presente' : 'ausente'}`}
            >
              {isPresent ? (
                <>
                  <Check className="h-5 w-5 mr-2" aria-hidden="true" />
                  PRESENTE
                </>
              ) : (
                <>
                  <X className="h-5 w-5 mr-2" aria-hidden="true" />
                  AUSENTE
                </>
              )}
            </Badge>
          ) : (
            <>
              <Button
                id={presentButtonId}
                onClick={() => markAttendance(student.aluno_id, true)}
                disabled={!canModify}
                className={cn(
                  'h-12 px-6 text-base font-semibold min-w-[120px]',
                  highContrast
                    ? 'bg-black text-white border-2 border-green-500 hover:bg-green-800'
                    : 'bg-green-600 hover:bg-green-700 text-white',
                  'focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                )}
                aria-describedby={`${presentButtonId}-desc`}
              >
                <Check className="h-5 w-5 mr-2" aria-hidden="true" />
                PRESENTE
              </Button>
              <div id={`${presentButtonId}-desc`} className="sr-only">
                Marcar {studentName} como presente
              </div>

              <Button
                id={absentButtonId}
                onClick={() => markAttendance(student.aluno_id, false)}
                disabled={!canModify}
                className={cn(
                  'h-12 px-6 text-base font-semibold min-w-[120px]',
                  highContrast
                    ? 'bg-black text-white border-2 border-red-500 hover:bg-red-800'
                    : 'bg-red-600 hover:bg-red-700 text-white',
                  'focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                )}
                aria-describedby={`${absentButtonId}-desc`}
              >
                <X className="h-5 w-5 mr-2" aria-hidden="true" />
                AUSENTE
              </Button>
              <div id={`${absentButtonId}-desc`} className="sr-only">
                Marcar {studentName} como ausente
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Skip Links for keyboard navigation */}
      <SkipLinks />

      {/* High Contrast Toggle */}
      <HighContrastMode
        enabled={highContrast}
        onToggle={setHighContrast}
      />

      {/* Screen reader live region */}
      <div
        ref={liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      />

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcements.slice(-1).map((announcement, index) => (
          <div key={`${announcement.timestamp}-${index}`}>
            {announcement.message}
          </div>
        ))}
      </div>

      {/* Keyboard shortcuts help */}
      <div className="sr-only">
        <h2>Atalhos de teclado disponíveis:</h2>
        <ul>
          <li>Setas para cima/baixo: navegar entre estudantes</li>
          <li>Enter ou Espaço: marcar como presente</li>
          <li>X: marcar como ausente</li>
          <li>Home: ir para o primeiro estudante</li>
          <li>End: ir para o último estudante</li>
          <li>Escape: cancelar seleção</li>
          <li>/ (barra): focar campo de busca</li>
        </ul>
      </div>

      <Card className={cn(highContrast && 'border-black border-2')}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={cn(
              'flex items-center gap-2 text-xl',
              highContrast ? 'text-black' : 'text-gray-900'
            )}>
              <Users className="h-6 w-6" aria-hidden="true" />
              Frequência - {session.turma_nome}
            </CardTitle>

            <Button
              variant="outline"
              size="sm"
              onClick={() => announce(`Total: ${stats.total} estudantes. Presentes: ${stats.present}. Ausentes: ${stats.absent}. Pendentes: ${stats.pending}`)}
              className="focus:ring-2 focus:ring-blue-500"
              aria-label="Anunciar estatísticas da turma"
            >
              <Info className="h-4 w-4 mr-1" />
              Estatísticas
            </Button>
          </div>

          {/* Stats with ARIA labels */}
          <div className="grid grid-cols-4 gap-4 text-center" role="table" aria-label="Estatísticas de frequência">
            <div role="cell" className={cn('p-3 rounded', highContrast ? 'bg-black text-white' : 'bg-gray-50')}>
              <div className="text-2xl font-bold" aria-label={`${stats.total} estudantes no total`}>
                {stats.total}
              </div>
              <div className={cn('text-sm', highContrast ? 'text-white' : 'text-gray-600')}>
                Total
              </div>
            </div>
            <div role="cell" className={cn('p-3 rounded', highContrast ? 'bg-black text-white border-2 border-green-500' : 'bg-green-50')}>
              <div className={cn('text-2xl font-bold', highContrast ? 'text-white' : 'text-green-600')} aria-label={`${stats.present} estudantes presentes`}>
                {stats.present}
              </div>
              <div className={cn('text-sm', highContrast ? 'text-white' : 'text-gray-600')}>
                Presentes
              </div>
            </div>
            <div role="cell" className={cn('p-3 rounded', highContrast ? 'bg-black text-white border-2 border-red-500' : 'bg-red-50')}>
              <div className={cn('text-2xl font-bold', highContrast ? 'text-white' : 'text-red-600')} aria-label={`${stats.absent} estudantes ausentes`}>
                {stats.absent}
              </div>
              <div className={cn('text-sm', highContrast ? 'text-white' : 'text-gray-600')}>
                Ausentes
              </div>
            </div>
            <div role="cell" className={cn('p-3 rounded', highContrast ? 'bg-black text-white border-2 border-orange-500' : 'bg-orange-50')}>
              <div className={cn('text-2xl font-bold', highContrast ? 'text-white' : 'text-orange-600')} aria-label={`${stats.pending} estudantes pendentes`}>
                {stats.pending}
              </div>
              <div className={cn('text-sm', highContrast ? 'text-white' : 'text-gray-600')}>
                Pendentes
              </div>
            </div>
          </div>

          {/* Search with accessibility */}
          <div className="space-y-2">
            <Label htmlFor="student-search" className={cn('text-base font-medium', highContrast ? 'text-black' : 'text-gray-900')}>
              Buscar estudante
            </Label>
            <div className="relative">
              <Search className={cn('absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5', highContrast ? 'text-black' : 'text-gray-400')} aria-hidden="true" />
              <Input
                ref={searchRef}
                id="student-search"
                placeholder="Digite o nome ou matrícula do estudante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  'pl-10 h-12 text-base',
                  highContrast && 'border-black border-2 bg-white text-black'
                )}
                aria-describedby="search-help"
                role="searchbox"
                aria-expanded="false"
                aria-controls="student-list"
              />
              <div id="search-help" className="sr-only">
                Digite para filtrar a lista de estudantes por nome ou matrícula
              </div>
            </div>
          </div>

          {/* Filter buttons with accessibility */}
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtros de visualização">
            {(['all', 'present', 'absent', 'unmarked'] as const).map((filterType) => {
              const labels = {
                all: 'Todos',
                present: 'Presentes',
                absent: 'Ausentes',
                unmarked: 'Não marcados'
              }

              return (
                <Button
                  key={filterType}
                  variant={filter === filterType ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(filterType)}
                  className={cn(
                    'focus:ring-2 focus:ring-blue-500',
                    filter === filterType && highContrast && 'bg-black text-white border-2 border-blue-500'
                  )}
                  aria-pressed={filter === filterType}
                  aria-label={`Filtrar por ${labels[filterType]}`}
                >
                  {labels[filterType]}
                </Button>
              )
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {session.bloqueado && (
            <Alert className={cn('m-4', highContrast ? 'border-black border-2 bg-white' : 'border-red-200 bg-red-50')} role="alert">
              <AlertCircle className={cn('h-4 w-4', highContrast ? 'text-black' : 'text-red-600')} />
              <AlertDescription className={cn(highContrast ? 'text-black' : 'text-red-800')}>
                <strong>Sessão Bloqueada:</strong> Esta sessão está bloqueada e a frequência não pode ser modificada.
              </AlertDescription>
            </Alert>
          )}

          {/* Student list with full accessibility */}
          <ScrollArea className="h-[500px]">
            <div
              id="student-list"
              ref={gridRef}
              role="table"
              aria-label="Lista de estudantes para marcação de frequência"
              aria-rowcount={filteredStudents.length}
              aria-describedby="keyboard-instructions"
              onKeyDown={handleKeyDown}
              tabIndex={-1}
            >
              <div id="keyboard-instructions" className="sr-only">
                Use as setas para navegar, Enter para marcar presente, X para ausente
              </div>

              {filteredStudents.length > 0 ? (
                filteredStudents.map((student, index) => (
                  <AccessibleStudentRow
                    key={student.aluno_id}
                    student={student}
                    index={index}
                  />
                ))
              ) : (
                <div
                  className="flex items-center justify-center h-32 text-center"
                  role="status"
                  aria-live="polite"
                >
                  <div>
                    <Users className={cn('h-12 w-12 mx-auto mb-2 opacity-50', highContrast ? 'text-black' : 'text-gray-400')} aria-hidden="true" />
                    <p className={cn(highContrast ? 'text-black' : 'text-gray-500')}>
                      {searchTerm ? 'Nenhum estudante encontrado com esse filtro' : 'Nenhum estudante na turma'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Accessible summary */}
          <div className={cn('p-4 border-t', highContrast ? 'border-black' : 'border-gray-200')}>
            <div className="text-sm text-center" role="status" aria-live="polite">
              Mostrando {filteredStudents.length} de {stats.total} estudantes
              {searchTerm && ` (filtrados por "${searchTerm}")`}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Required Label component for accessibility
function Label({ htmlFor, className, children, ...props }: {
  htmlFor?: string
  className?: string
  children: React.ReactNode
  [key: string]: any
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={className}
      {...props}
    >
      {children}
    </label>
  )
}