'use client'

/**
 * Class Diary List Component
 * Brazilian Educational Context: Lista de Aulas do Diário de Classe
 *
 * Displays a table of class sessions with:
 * - Date, Turma, Professor, Attendance stats
 * - Sortable columns
 * - Pagination
 * - Click to open detail view
 * - Loading skeleton
 * - Responsive design (mobile collapses to cards)
 */

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowUpDown,
  BookOpen,
  Users,
  CheckCircle2,
  XCircle,
  Lock,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { ClassDiaryEntry } from '@/lib/api/class-diary'

interface ClassDiaryListProps {
  entries: ClassDiaryEntry[]
  loading?: boolean
  onEntryClick: (entry: ClassDiaryEntry) => void
  onPageChange?: (page: number) => void
  currentPage?: number
  totalPages?: number
}

export function ClassDiaryList({
  entries,
  loading = false,
  onEntryClick,
  onPageChange,
  currentPage = 1,
  totalPages = 1,
}: ClassDiaryListProps) {
  const [sortColumn, setSortColumn] = useState<keyof ClassDiaryEntry>('data_aula')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Handle column header click for sorting
  const handleSort = (column: keyof ClassDiaryEntry) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort entries based on current sort settings
  const sortedEntries = [...entries].sort((a, b) => {
    const aValue = a[sortColumn]
    const bValue = b[sortColumn]

    if (aValue === bValue) return 0
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    const comparison = aValue < bValue ? -1 : 1
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Get phase badge color
  const getFaseBadge = (fase: string) => {
    const badgeMap = {
      planejamento: { label: 'Planejamento', variant: 'secondary' as const },
      chamada: { label: 'Chamada', variant: 'default' as const },
      finalizada: { label: 'Finalizada', variant: 'outline' as const },
      bloqueada: { label: 'Bloqueada', variant: 'destructive' as const },
    }

    return badgeMap[fase as keyof typeof badgeMap] || badgeMap.planejamento
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  // Calculate attendance percentage
  const getAttendancePercentage = (entry: ClassDiaryEntry) => {
    if (entry.total_alunos === 0) return 0
    return Math.round((entry.total_presentes / entry.total_alunos) * 100)
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <Card className="py-12">
        <CardContent>
          <div className="text-center space-y-3">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Nenhuma aula encontrada</h3>
            <p className="text-sm text-muted-foreground">
              Não há registros de aulas para os filtros selecionados.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('data_aula')}
                >
                  Data
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('turma_nome')}
                >
                  Turma
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Professor</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Presentes</TableHead>
              <TableHead className="text-center">Ausentes</TableHead>
              <TableHead className="text-center">Freq. %</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEntries.map((entry) => {
              const badge = getFaseBadge(entry.fase)
              const percentage = getAttendancePercentage(entry)

              return (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onEntryClick(entry)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(entry.data_aula), 'dd/MM/yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{entry.turma_nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.turma_serie}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{entry.professor_nome}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">{entry.total_presentes}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">{entry.total_ausentes}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`font-semibold ${
                        percentage >= 75 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {percentage}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {entry.bloqueado && <Lock className="h-4 w-4 text-muted-foreground" />}
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sortedEntries.map((entry) => {
          const badge = getFaseBadge(entry.fase)
          const percentage = getAttendancePercentage(entry)

          return (
            <Card
              key={entry.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onEntryClick(entry)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header: Date and Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">
                        {format(new Date(entry.data_aula), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>

                  {/* Turma and Professor */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{entry.turma_nome}</span>
                      <span className="text-xs text-muted-foreground">
                        ({entry.turma_serie})
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      Prof. {entry.professor_nome}
                    </p>
                  </div>

                  {/* Attendance Stats */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {entry.total_presentes}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {entry.total_ausentes}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          percentage >= 75 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {percentage}% freq.
                      </span>
                      {entry.bloqueado && (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}
