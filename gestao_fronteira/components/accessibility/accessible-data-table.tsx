'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, ArrowUpDown, Search, Filter } from 'lucide-react'

// Educational data table with full accessibility support
interface AccessibleDataTableProps<T> {
  data: T[]
  columns: ColumnDefinition<T>[]
  caption: string
  summary?: string
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
  className?: string
  onSort?: (columnKey: keyof T, direction: 'asc' | 'desc') => void
  onFilter?: (filters: Record<string, any>) => void
  onSearch?: (query: string) => void
  currentSort?: { column: keyof T; direction: 'asc' | 'desc' }
  loading?: boolean
  emptyMessage?: string
  pageSize?: number
  currentPage?: number
  totalItems?: number
  onPageChange?: (page: number) => void
}

interface ColumnDefinition<T> {
  key: keyof T
  header: string
  headerDescription?: string
  sortable?: boolean
  filterable?: boolean
  type?: 'text' | 'number' | 'date' | 'boolean' | 'status'
  render?: (value: any, row: T, index: number) => React.ReactNode
  ariaLabel?: (value: any, row: T) => string
  width?: string
  align?: 'left' | 'center' | 'right'
}

export function AccessibleDataTable<T extends Record<string, any>>({
  data,
  columns,
  caption,
  summary,
  sortable = true,
  filterable = false,
  searchable = false,
  className,
  onSort,
  onFilter,
  onSearch,
  currentSort,
  loading = false,
  emptyMessage = 'Nenhum dado disponível',
  pageSize = 10,
  currentPage = 1,
  totalItems,
  onPageChange
}: AccessibleDataTableProps<T>) {
  const tableId = React.useId()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeFilters, setActiveFilters] = React.useState<Record<string, any>>({})

  // Calculate pagination
  const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : Math.ceil(data.length / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems || data.length)

  const handleSort = (columnKey: keyof T) => {
    if (!sortable || !onSort) return

    const newDirection = currentSort?.column === columnKey && currentSort.direction === 'asc' ? 'desc' : 'asc'
    onSort(columnKey, newDirection)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleFilter = (columnKey: string, value: any) => {
    const newFilters = { ...activeFilters, [columnKey]: value }
    setActiveFilters(newFilters)
    onFilter?.(newFilters)
  }

  const getSortIcon = (columnKey: keyof T) => {
    if (!currentSort || currentSort.column !== columnKey) {
      return <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
    }
    return currentSort.direction === 'asc'
      ? <ChevronUp className="h-4 w-4" aria-hidden="true" />
      : <ChevronDown className="h-4 w-4" aria-hidden="true" />
  }

  const getSortAriaLabel = (column: ColumnDefinition<T>) => {
    if (!currentSort || currentSort.column !== column.key) {
      return `Ordenar por ${column.header}`
    }
    const direction = currentSort.direction === 'asc' ? 'decrescente' : 'crescente'
    return `Ordenar ${column.header} em ordem ${direction}`
  }

  const getAriaSort = (columnKey: keyof T) => {
    if (!currentSort || currentSort.column !== columnKey) return 'none'
    return currentSort.direction === 'asc' ? 'ascending' : 'descending'
  }

  if (loading) {
    return (
      <div
        className={cn('data-table-loading', className)}
        role="status"
        aria-label="Carregando dados da tabela"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('accessible-data-table-container', className)}>
      {/* Table controls */}
      {(searchable || filterable) && (
        <div className="table-controls mb-4 space-y-4">
          {searchable && (
            <div className="search-control">
              <label htmlFor={`${tableId}-search`} className="sr-only">
                Buscar na tabela {caption}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input
                  id={`${tableId}-search`}
                  type="text"
                  placeholder={`Buscar em ${caption.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent"
                  aria-describedby={`${tableId}-search-desc`}
                />
              </div>
              <div id={`${tableId}-search-desc`} className="sr-only">
                Use este campo para filtrar os resultados da tabela em tempo real
              </div>
            </div>
          )}

          {filterable && (
            <div className="filter-controls flex flex-wrap gap-2">
              <Filter className="h-4 w-4 text-muted-foreground mt-1" aria-hidden="true" />
              <span className="text-sm font-medium">Filtros:</span>
              {columns.filter(col => col.filterable).map((column) => (
                <div key={String(column.key)} className="filter-control">
                  <label htmlFor={`${tableId}-filter-${String(column.key)}`} className="sr-only">
                    Filtrar por {column.header}
                  </label>
                  <select
                    id={`${tableId}-filter-${String(column.key)}`}
                    value={activeFilters[String(column.key)] || ''}
                    onChange={(e) => handleFilter(String(column.key), e.target.value)}
                    className="px-2 py-1 text-sm border border-input rounded focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Todos {column.header}</option>
                    {/* Add filter options based on column type */}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table wrapper for horizontal scrolling */}
      <div className="table-wrapper overflow-x-auto border border-border rounded-lg">
        <table
          id={tableId}
          className="table w-full border-collapse"
          role="table"
          aria-label={caption}
          aria-describedby={summary ? `${tableId}-summary` : undefined}
        >
          <caption className="table-caption text-left p-4 font-semibold text-lg border-b border-border">
            {caption}
            {summary && (
              <div id={`${tableId}-summary`} className="table-summary text-sm font-normal text-muted-foreground mt-2">
                {summary}
              </div>
            )}
          </caption>

          <thead className="table-header bg-muted">
            <tr role="row">
              {columns.map((column, index) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  className={cn(
                    'table-header-cell px-4 py-3 text-left font-semibold text-sm border-b border-border',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    sortable && column.sortable !== false && 'cursor-pointer hover:bg-muted/80'
                  )}
                  style={{ width: column.width }}
                  aria-sort={sortable && column.sortable !== false ? getAriaSort(column.key) : undefined}
                  onClick={() => sortable && column.sortable !== false && handleSort(column.key)}
                  aria-describedby={column.headerDescription ? `${tableId}-header-desc-${index}` : undefined}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.header}</span>
                    {sortable && column.sortable !== false && (
                      <span aria-label={getSortAriaLabel(column)}>
                        {getSortIcon(column.key)}
                      </span>
                    )}
                  </div>
                  {column.headerDescription && (
                    <div id={`${tableId}-header-desc-${index}`} className="sr-only">
                      {column.headerDescription}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="table-body">
            {data.length === 0 ? (
              <tr role="row">
                <td
                  colSpan={columns.length}
                  className="table-empty-cell px-4 py-8 text-center text-muted-foreground"
                  role="cell"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  role="row"
                  className={cn(
                    'table-row border-b border-border hover:bg-muted/50',
                    rowIndex % 2 === 0 && 'bg-background',
                    rowIndex % 2 === 1 && 'bg-muted/20'
                  )}
                >
                  {columns.map((column, colIndex) => {
                    const cellValue = row[column.key]
                    const renderedValue = column.render ? column.render(cellValue, row, rowIndex) : cellValue

                    return (
                      <td
                        key={String(column.key)}
                        role="cell"
                        className={cn(
                          'table-cell px-4 py-3 text-sm',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                        aria-label={column.ariaLabel ? column.ariaLabel(cellValue, row) : undefined}
                      >
                        {renderedValue}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination and table info */}
      {totalPages > 1 && (
        <div className="table-footer mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="table-info text-sm text-muted-foreground">
            Mostrando {startItem} a {endItem} de {totalItems || data.length} registros
          </div>

          <nav
            role="navigation"
            aria-label={`Paginação da tabela ${caption}`}
            className="pagination"
          >
            <ul className="flex items-center space-x-1">
              <li>
                <button
                  onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={cn(
                    'pagination-button px-3 py-2 text-sm border border-input rounded-md',
                    'focus:ring-2 focus:ring-ring focus:border-transparent',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'hover:bg-muted'
                  )}
                  aria-label="Página anterior"
                >
                  Anterior
                </button>
              </li>

              {[...Array(Math.min(7, totalPages))].map((_, index) => {
                let pageNumber
                if (totalPages <= 7) {
                  pageNumber = index + 1
                } else {
                  // Show pages around current page
                  const start = Math.max(1, currentPage - 3)
                  pageNumber = start + index
                  if (pageNumber > totalPages) pageNumber = totalPages - (6 - index)
                }

                return (
                  <li key={pageNumber}>
                    <button
                      onClick={() => onPageChange?.(pageNumber)}
                      className={cn(
                        'pagination-button px-3 py-2 text-sm border border-input rounded-md',
                        'focus:ring-2 focus:ring-ring focus:border-transparent',
                        'hover:bg-muted',
                        pageNumber === currentPage && 'bg-primary text-primary-foreground border-primary'
                      )}
                      aria-label={`Página ${pageNumber}`}
                      aria-current={pageNumber === currentPage ? 'page' : undefined}
                    >
                      {pageNumber}
                    </button>
                  </li>
                )
              })}

              <li>
                <button
                  onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={cn(
                    'pagination-button px-3 py-2 text-sm border border-input rounded-md',
                    'focus:ring-2 focus:ring-ring focus:border-transparent',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'hover:bg-muted'
                  )}
                  aria-label="Próxima página"
                >
                  Próxima
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  )
}

// Student data table with educational-specific accessibility
interface StudentTableData {
  id: string
  nome: string
  idade: number
  turma: string
  situacao: 'ativo' | 'inativo' | 'transferido'
  frequencia: number
  responsavel: string
  telefone: string
}

export function AccessibleStudentDataTable({
  students,
  className,
  ...props
}: {
  students: StudentTableData[]
  className?: string
} & Partial<AccessibleDataTableProps<StudentTableData>>) {
  const columns: ColumnDefinition<StudentTableData>[] = [
    {
      key: 'nome',
      header: 'Nome do Aluno',
      headerDescription: 'Nome completo do aluno matriculado',
      sortable: true,
      ariaLabel: (value, row) => `Aluno: ${value}, Turma: ${row.turma}`
    },
    {
      key: 'idade',
      header: 'Idade',
      headerDescription: 'Idade atual do aluno em anos',
      type: 'number',
      sortable: true,
      align: 'center',
      ariaLabel: (value) => `${value} anos de idade`
    },
    {
      key: 'turma',
      header: 'Turma',
      headerDescription: 'Turma em que o aluno está matriculado',
      sortable: true,
      filterable: true,
      ariaLabel: (value) => `Matriculado na turma ${value}`
    },
    {
      key: 'situacao',
      header: 'Situação',
      headerDescription: 'Status atual da matrícula do aluno',
      type: 'status',
      sortable: true,
      filterable: true,
      render: (value) => {
        const statusConfig = {
          ativo: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
          inativo: { label: 'Inativo', color: 'bg-red-100 text-red-800' },
          transferido: { label: 'Transferido', color: 'bg-blue-100 text-blue-800' }
        }
        const config = statusConfig[value as keyof typeof statusConfig]
        return (
          <span
            className={cn('px-2 py-1 rounded-full text-xs font-medium', config.color)}
            role="status"
            aria-label={`Situação: ${config.label}`}
          >
            {config.label}
          </span>
        )
      },
      ariaLabel: (value) => `Situação da matrícula: ${value}`
    },
    {
      key: 'frequencia',
      header: 'Frequência (%)',
      headerDescription: 'Percentual de frequência do aluno',
      type: 'number',
      sortable: true,
      align: 'center',
      render: (value) => {
        const percentage = Number(value)
        const color = percentage >= 80 ? 'text-green-600' : percentage >= 75 ? 'text-yellow-600' : 'text-red-600'
        return (
          <span className={cn('font-medium', color)} aria-label={`Frequência de ${percentage}%`}>
            {percentage}%
          </span>
        )
      },
      ariaLabel: (value) => `Frequência de ${value}%${value < 75 ? ' - Abaixo do mínimo exigido' : ''}`
    },
    {
      key: 'responsavel',
      header: 'Responsável',
      headerDescription: 'Nome do responsável pelo aluno',
      sortable: true
    },
    {
      key: 'telefone',
      header: 'Telefone',
      headerDescription: 'Número de telefone para contato',
      ariaLabel: (value) => `Telefone para contato: ${value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}`
    }
  ]

  return (
    <AccessibleDataTable
      data={students}
      columns={columns}
      caption="Lista de Alunos Matriculados"
      summary="Tabela contendo informações dos alunos, incluindo nome, idade, turma, situação da matrícula, frequência, responsável e telefone para contato."
      className={className}
      searchable={true}
      filterable={true}
      emptyMessage="Nenhum aluno encontrado com os critérios de busca aplicados"
      {...props}
    />
  )
}