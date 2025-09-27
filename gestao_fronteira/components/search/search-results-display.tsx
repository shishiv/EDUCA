/**
 * Search Results Display Component
 * Optimized display of search results with various view modes and actions
 * Supports students, teachers, classes, and other educational entities
 */

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  User,
  GraduationCap,
  School,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Eye,
  Edit,
  Download,
  MoreHorizontal,
  Grid3X3,
  List,
  Table,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

// Types
interface SearchResult {
  id: string
  type: 'student' | 'teacher' | 'class' | 'school'
  data: any
  relevanceScore: number
  matchedFields: string[]
  lastUpdated: Date
  status?: 'active' | 'inactive' | 'pending'
  priority?: 'high' | 'medium' | 'low'
}

interface SearchResultsDisplayProps {
  results: SearchResult[]
  loading?: boolean
  totalCount?: number
  currentPage?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onResultSelect?: (result: SearchResult) => void
  onBulkAction?: (action: string, results: SearchResult[]) => void
  viewMode?: 'grid' | 'list' | 'table'
  onViewModeChange?: (mode: 'grid' | 'list' | 'table') => void
  showActions?: boolean
  className?: string
}

export function SearchResultsDisplay({
  results,
  loading = false,
  totalCount,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
  onResultSelect,
  onBulkAction,
  viewMode = 'list',
  onViewModeChange,
  showActions = true,
  className
}: SearchResultsDisplayProps) {
  const router = useRouter()
  const [selectedResults, setSelectedResults] = React.useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = React.useState('relevance')
  const [filterByType, setFilterByType] = React.useState<string>('all')

  // Get unique result types
  const resultTypes = Array.from(new Set(results.map(r => r.type)))

  // Filter and sort results
  const filteredResults = React.useMemo(() => {
    let filtered = results

    if (filterByType !== 'all') {
      filtered = filtered.filter(r => r.type === filterByType)
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore
        case 'name':
          const nameA = a.data.nome_completo || a.data.name || ''
          const nameB = b.data.nome_completo || b.data.name || ''
          return nameA.localeCompare(nameB, 'pt-BR')
        case 'date':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        case 'type':
          return a.type.localeCompare(b.type)
        default:
          return 0
      }
    })
  }, [results, filterByType, sortBy])

  // Handle bulk selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedResults(new Set(filteredResults.map(r => r.id)))
    } else {
      setSelectedResults(new Set())
    }
  }

  const handleSelectResult = (resultId: string, checked: boolean) => {
    const newSelected = new Set(selectedResults)
    if (checked) {
      newSelected.add(resultId)
    } else {
      newSelected.delete(resultId)
    }
    setSelectedResults(newSelected)
  }

  // Get status indicator
  const getStatusIndicator = (result: SearchResult) => {
    switch (result.status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'inactive':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return null
    }
  }

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'student':
        return <User className="h-4 w-4" />
      case 'teacher':
        return <GraduationCap className="h-4 w-4" />
      case 'class':
        return <Users className="h-4 w-4" />
      case 'school':
        return <School className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'student':
        return 'Estudante'
      case 'teacher':
        return 'Professor'
      case 'class':
        return 'Turma'
      case 'school':
        return 'Escola'
      default:
        return type
    }
  }

  // Render student card
  const renderStudentCard = (result: SearchResult, compact = false) => {
    const student = result.data
    return (
      <Card
        className={cn(
          "cursor-pointer transition-colors hover:bg-muted/50",
          compact && "p-3"
        )}
        onClick={() => onResultSelect?.(result)}
      >
        <CardContent className={cn("p-4", compact && "p-3")}>
          <div className="flex items-start gap-3">
            {showActions && (
              <Checkbox
                checked={selectedResults.has(result.id)}
                onCheckedChange={(checked) => handleSelectResult(result.id, checked as boolean)}
                onClick={(e) => e.stopPropagation()}
              />
            )}

            <Avatar className="h-10 w-10">
              <AvatarImage src={student.foto_url} />
              <AvatarFallback>
                {student.nome_completo?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{student.nome_completo}</h4>
                {getStatusIndicator(result)}
                <Badge variant="outline" className="text-xs">
                  {getTypeLabel(result.type)}
                </Badge>
                <Badge variant={result.relevanceScore > 0.8 ? 'default' : 'secondary'} className="text-xs">
                  {Math.round(result.relevanceScore * 100)}%
                </Badge>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-4">
                  <span>CPF: {student.cpf}</span>
                  <span>Série: {student.serie_ano}</span>
                  <span>Turno: {student.turno}</span>
                </div>

                {!compact && (
                  <>
                    <div className="flex items-center gap-2">
                      <School className="h-3 w-3" />
                      <span>{student.escola}</span>
                    </div>

                    {student.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{student.telefone}</span>
                      </div>
                    )}

                    {student.endereco && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{student.endereco}, {student.bairro}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {result.matchedFields.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {result.matchedFields.map((field) => (
                    <Badge key={field} variant="secondary" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                Atualizado: {format(result.lastUpdated, 'dd/MM', { locale: ptBR })}
              </div>
              {showActions && (
                <Button variant="ghost" size="sm" className="mt-1">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render teacher card
  const renderTeacherCard = (result: SearchResult, compact = false) => {
    const teacher = result.data
    return (
      <Card
        className={cn(
          "cursor-pointer transition-colors hover:bg-muted/50",
          compact && "p-3"
        )}
        onClick={() => onResultSelect?.(result)}
      >
        <CardContent className={cn("p-4", compact && "p-3")}>
          <div className="flex items-start gap-3">
            {showActions && (
              <Checkbox
                checked={selectedResults.has(result.id)}
                onCheckedChange={(checked) => handleSelectResult(result.id, checked as boolean)}
                onClick={(e) => e.stopPropagation()}
              />
            )}

            <Avatar className="h-10 w-10">
              <AvatarImage src={teacher.foto_url} />
              <AvatarFallback>
                <GraduationCap className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{teacher.nome_completo}</h4>
                {getStatusIndicator(result)}
                <Badge variant="outline" className="text-xs">
                  Professor
                </Badge>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-4">
                  <span>CPF: {teacher.cpf}</span>
                  <span>Disciplina: {teacher.disciplina}</span>
                </div>

                {!compact && (
                  <>
                    <div className="flex items-center gap-2">
                      <School className="h-3 w-3" />
                      <span>{teacher.escola}</span>
                    </div>

                    {teacher.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{teacher.telefone}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="text-right">
              <Badge variant={result.relevanceScore > 0.8 ? 'default' : 'secondary'} className="text-xs">
                {Math.round(result.relevanceScore * 100)}%
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {format(result.lastUpdated, 'dd/MM', { locale: ptBR })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render result based on type
  const renderResult = (result: SearchResult, mode: 'grid' | 'list' | 'table' = 'list') => {
    const compact = mode === 'grid'

    switch (result.type) {
      case 'student':
        return renderStudentCard(result, compact)
      case 'teacher':
        return renderTeacherCard(result, compact)
      default:
        return renderStudentCard(result, compact) // Fallback
    }
  }

  // Calculate pagination
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : Math.ceil(filteredResults.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredResults.length)
  const currentResults = filteredResults.slice(startIndex, endIndex)

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-muted rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (filteredResults.length === 0) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhum resultado encontrado. Tente ajustar os termos de busca ou filtros.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Results Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Resultados da Busca
              <Badge variant="secondary">
                {totalCount || filteredResults.length}
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              {onViewModeChange && (
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onViewModeChange('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onViewModeChange('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onViewModeChange('table')}
                  >
                    <Table className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Sort Options */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <ArrowUpDown className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevância</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="type">Tipo</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={filterByType} onValueChange={setFilterByType}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {resultTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {showActions && selectedResults.size > 0 && (
            <div className="flex items-center gap-2 pt-3 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedResults.size} selecionado(s)
              </span>
              <Button variant="outline" size="sm" onClick={() => onBulkAction?.('export', [])}>
                <Download className="h-4 w-4 mr-1" />
                Exportar
              </Button>
              <Button variant="outline" size="sm" onClick={() => onBulkAction?.('delete', [])}>
                Remover
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {/* Select All */}
          {showActions && (
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                checked={selectedResults.size === filteredResults.length && filteredResults.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Selecionar todos os resultados
              </span>
            </div>
          )}

          {/* Results Grid/List */}
          <div className={cn(
            "space-y-3",
            viewMode === 'grid' && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-0"
          )}>
            {currentResults.map((result) => (
              <div key={result.id}>
                {renderResult(result, viewMode)}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1}-{endIndex} de {totalCount || filteredResults.length} resultados
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, currentPage - 2) + i
                    if (page > totalPages) return null

                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onPageChange?.(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}