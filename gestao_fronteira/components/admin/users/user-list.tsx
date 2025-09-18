'use client'

import { useState } from 'react'
import { useUsersWithSchool, useUsersSubscription, useUserRoleHelpers } from '@/hooks/use-users-query'
import { useAppStore } from '@/lib/stores/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableLoading } from '@/components/ui/loading-states'
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  School
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface UserListProps {
  selectable?: boolean
  compact?: boolean
  onUserSelect?: (userId: string) => void
}

export function UserList({ selectable = false, compact = false, onUserSelect }: UserListProps) {
  const [localSearch, setLocalSearch] = useState('')

  const {
    filters,
    bulkSelection,
    setUserFilters,
    setBulkSelection,
    clearBulkSelection
  } = useAppStore()

  const { getRoleLabel, getRoleColor } = useUserRoleHelpers()

  // Subscribe to real-time updates
  useUsersSubscription()

  // Fetch users with current filters
  const { data: users = [], isLoading, error, refetch } = useUsersWithSchool({
    limit: compact ? 10 : 50,
  })

  const handleSearch = (value: string) => {
    setLocalSearch(value)
    setUserFilters({ searchTerm: value })
  }

  const handleRoleFilter = (roles: string[]) => {
    setUserFilters({ roles })
  }

  const handleStatusFilter = (status: 'all' | 'active' | 'inactive') => {
    setUserFilters({ status })
  }

  const handleSelectAll = () => {
    if (bulkSelection.selectAll) {
      clearBulkSelection()
    } else {
      setBulkSelection({
        selectedIds: users.map(u => u.id),
        selectAll: true,
        entity: 'users'
      })
    }
  }

  const handleSelectUser = (userId: string) => {
    const isSelected = bulkSelection.selectedIds.includes(userId)

    if (isSelected) {
      setBulkSelection({
        selectedIds: bulkSelection.selectedIds.filter(id => id !== userId),
        selectAll: false
      })
    } else {
      setBulkSelection({
        selectedIds: [...bulkSelection.selectedIds, userId],
        selectAll: false,
        entity: 'users'
      })
    }

    if (onUserSelect) {
      onUserSelect(userId)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return <TableLoading rows={compact ? 5 : 10} columns={5} />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar usuários</h3>
            <p className="text-gray-600 mb-4">Ocorreu um erro ao buscar os usuários.</p>
            <Button onClick={() => refetch()} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      {!compact && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários do Sistema
                </CardTitle>
                <CardDescription>
                  Gerencie usuários e suas permissões
                </CardDescription>
              </div>

              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/dashboard/usuarios/novo">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Usuário
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuários..."
                  value={localSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Role Filter */}
              <Select
                value={filters.users.roles.join(',')}
                onValueChange={(value) => handleRoleFilter(value ? value.split(',') : [])}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os cargos</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="diretor">Diretor</SelectItem>
                  <SelectItem value="secretario">Secretário</SelectItem>
                  <SelectItem value="professor">Professor</SelectItem>
                  <SelectItem value="responsavel">Responsável</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={filters.users.status}
                onValueChange={(value) => handleStatusFilter(value as any)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {bulkSelection.selectedIds.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {bulkSelection.selectedIds.length} usuários selecionados
                </span>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  Ativar Selecionados
                </Button>
                <Button size="sm" variant="outline">
                  Desativar Selecionados
                </Button>
                <Button size="sm" variant="outline">
                  Atribuir Escola
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearBulkSelection}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User List */}
      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
              <p className="text-gray-600">
                Tente ajustar os filtros ou criar um novo usuário.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* Header */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 font-medium text-sm text-gray-700">
                {selectable && (
                  <Checkbox
                    checked={bulkSelection.selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                )}
                <div className="flex-1">Usuário</div>
                <div className="w-32">Cargo</div>
                <div className="w-40">Escola</div>
                <div className="w-20">Status</div>
                <div className="w-20">Ações</div>
              </div>

              {/* User Rows */}
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                  {selectable && (
                    <Checkbox
                      checked={bulkSelection.selectedIds.includes(user.id)}
                      onCheckedChange={() => handleSelectUser(user.id)}
                    />
                  )}

                  {/* User Info */}
                  <div className="flex-1 flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-white">
                        {user.nome ? getInitials(user.nome) : 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="font-medium text-gray-900">
                        {user.nome || 'Nome não definido'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="w-32">
                    <Badge className={getRoleColor(user.tipo_usuario)} variant="outline">
                      {getRoleLabel(user.tipo_usuario)}
                    </Badge>
                  </div>

                  {/* School */}
                  <div className="w-40">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <School className="h-3 w-3" />
                      {user.escola?.nome || 'Todas as escolas'}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="w-20">
                    <Badge
                      variant={user.ativo ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {user.ativo ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inativo
                        </>
                      )}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="w-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/usuarios/${user.id}/editar`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {user.ativo ? (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}