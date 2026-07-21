/**
 * Responsive Data Table Components
 * Mobile-first design with card views for small screens and tables for desktop
 * Optimized for Brazilian educational data and classroom tablet use
 */

'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (item: T) => React.ReactNode
  className?: string
  sortable?: boolean
  width?: string
  mobileLabel?: string // Label for mobile card view
  hideOnMobile?: boolean // Hide this column on mobile
}

interface Action<T> {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: (item: T) => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  href?: string
  show?: (item: T) => boolean
}

interface ResponsiveDataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  actions?: Action<T>[]
  loading?: boolean
  emptyMessage?: string
  className?: string
  cardClassName?: string
  mobileCardTemplate?: (item: T, actions?: Action<T>[]) => React.ReactNode
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

/**
 * Responsive Data Table Component
 * Automatically switches between table view (desktop/tablet) and card view (mobile)
 */
export function ResponsiveDataTable<T extends { id: string }>({
  data,
  columns,
  actions = [],
  loading = false,
  emptyMessage = 'Nenhum item encontrado.',
  className,
  cardClassName,
  mobileCardTemplate
}: ResponsiveDataTableProps<T>) {
  const [viewMode, setViewMode] = React.useState<'auto' | 'table' | 'cards'>('auto')

  // Actions dropdown for mobile
  const ActionsDropdown = ({ item }: { item: T }) => {
    const visibleActions = actions.filter(action => action.show ? action.show(item) : true)

    if (visibleActions.length === 0) return null

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Abrir ações">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {visibleActions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={() => action.onClick(item)}
              className={cn(
                "flex items-center gap-2",
                action.variant === 'destructive' && "text-red-600 focus:text-red-600"
              )}
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Default mobile card template
  const DefaultMobileCard = ({ item }: { item: T }) => {
    const primaryColumn = columns.find(col => !col.hideOnMobile) || columns[0]
    const secondaryColumns = columns.filter(col => !col.hideOnMobile && col !== primaryColumn).slice(0, 2)

    return (
      <Card className={cn("mb-3 hover:shadow-md transition-shadow", cardClassName)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {/* Primary content */}
              <div className="font-medium text-base mb-2">
                {primaryColumn.render
                  ? primaryColumn.render(item)
                  : getNestedValue(item, primaryColumn.key as string)
                }
              </div>

              {/* Secondary content */}
              <div className="space-y-1">
                {secondaryColumns.map((column, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <span className="font-medium mr-2">{column.mobileLabel || column.label}:</span>
                    <span className="flex-1">
                      {column.render
                        ? column.render(item)
                        : getNestedValue(item, column.key as string)
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {actions.length > 0 && (
              <div className="ml-3 flex-shrink-0">
                <ActionsDropdown item={item} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          {emptyMessage}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Desktop/Tablet Table View */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead
                    key={index}
                    className={cn(column.className)}
                    style={{ width: column.width }}
                  >
                    {column.label}
                  </TableHead>
                ))}
                {actions.length > 0 && (
                  <TableHead className="text-right">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((column, index) => (
                    <TableCell key={index} className={column.className}>
                      {column.render
                        ? column.render(item)
                        : getNestedValue(item, column.key as string)
                      }
                    </TableCell>
                  ))}
                  {actions.length > 0 && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {actions.filter(action => action.show ? action.show(item) : true).map((action, actionIndex) => (
                          <Button
                            key={actionIndex}
                            variant="ghost"
                            size="sm"
                            onClick={() => action.onClick(item)}
                            aria-label={action.label}
                            className={cn(
                              action.variant === 'destructive' && "text-red-600 hover:text-red-700"
                            )}
                          >
                            {action.icon && <action.icon className="h-4 w-4" />}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden">
        {data.map((item) =>
          mobileCardTemplate ? (
            <div key={item.id}>
              {mobileCardTemplate(item, actions)}
            </div>
          ) : (
            <DefaultMobileCard key={item.id} item={item} />
          )
        )}
      </div>
    </div>
  )
}

/**
 * Student Data Table Component
 * Specialized for Brazilian educational student data
 */
interface StudentTableProps {
  students: any[]
  loading?: boolean
  onView?: (student: any) => void
  onEdit?: (student: any) => void
  onDelete?: (student: any) => void
  className?: string
}

export function StudentDataTable({
  students,
  loading = false,
  onView,
  onEdit,
  onDelete,
  className
}: StudentTableProps) {
  const columns: Column<any>[] = [
    {
      key: 'nome_completo',
      label: 'Aluno',
      mobileLabel: 'Nome',
      render: (student) => (
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={student.foto_url} />
            <AvatarFallback>
              {student.nome_completo.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{student.nome_completo}</div>
            <div className="text-sm text-gray-500">
              {student.sexo === 'M' ? 'Masculino' : 'Feminino'}
              {student.cpf && ` • CPF: ${student.cpf}`}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'idade',
      label: 'Idade',
      mobileLabel: 'Idade',
      render: (student) => {
        const age = new Date().getFullYear() - new Date(student.data_nascimento).getFullYear()
        return (
          <div>
            <div>{age} anos</div>
            <div className="text-sm text-gray-500">
              {new Date(student.data_nascimento).toLocaleDateString('pt-BR')}
            </div>
          </div>
        )
      }
    },
    {
      key: 'responsaveis.nome',
      label: 'Responsável',
      mobileLabel: 'Responsável',
      hideOnMobile: true,
      render: (student) => (
        <div>
          <div className="font-medium">
            {student.responsaveis?.nome || 'Não informado'}
          </div>
          {student.telefone && (
            <div className="text-sm text-gray-500">{student.telefone}</div>
          )}
        </div>
      )
    },
    {
      key: 'escola',
      label: 'Escola Atual',
      mobileLabel: 'Escola',
      render: (student) => {
        const activeEnrollment = student.matriculas?.find((m: any) => m.situacao === 'ativa')
        return (
          <div>
            <div className="font-medium">
              {activeEnrollment?.turmas?.escolas?.nome || 'Não matriculado'}
            </div>
            {activeEnrollment?.turmas?.nome && (
              <div className="text-sm text-gray-500">
                {activeEnrollment.turmas.nome}
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Status',
      mobileLabel: 'Status',
      render: (student) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={student.ativo ? 'default' : 'secondary'}>
            {student.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
          {student.necessidades_especiais && (
            <Badge variant="outline" className="text-xs">
              NEE
            </Badge>
          )}
        </div>
      )
    }
  ]

  const actions: Action<any>[] = [
    {
      label: 'Visualizar',
      icon: Eye,
      onClick: onView || (() => {}),
      show: () => !!onView
    },
    {
      label: 'Editar',
      icon: Edit,
      onClick: onEdit || (() => {}),
      show: () => !!onEdit
    },
    {
      label: 'Excluir',
      icon: Trash2,
      onClick: onDelete || (() => {}),
      variant: 'destructive' as const,
      show: () => !!onDelete
    }
  ].filter(action => action.show())

  return (
    <ResponsiveDataTable
      data={students}
      columns={columns}
      actions={actions}
      loading={loading}
      emptyMessage="Nenhum aluno encontrado com os filtros aplicados."
      className={className}
    />
  )
}

// Components are already exported inline above