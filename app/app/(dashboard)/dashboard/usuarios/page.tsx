'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usersApi, UserWithSchool } from '@/lib/api/users'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Eye, Edit, Trash2, UserCheck, UserX, Download, Users, CheckCircle, GraduationCap, Crown, UserPlus, Search as SearchIcon } from 'lucide-react'
import { StatsBar } from '@/components/dashboard'
import { InlineFilters } from '@/components/filters'
import { TableEmptyState } from '@/components/ui/table-empty-state'
import { formatDateTimeBR } from '@/lib/date-utils'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UserWithSchool[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')

  useEffect(() => {
    loadUsuarios()
  }, [])

  const loadUsuarios = async () => {
    try {
      logger.info('Loading usuarios...')
      // Simple query without joins first
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('ativo', true)

      if (error) {
        logger.error('Supabase error:', error)
        throw error
      }

      logger.info('Success! Users found', { metadata: { count: data?.length } })
      logger.info('Users data', { metadata: { data } })
      setUsuarios(data || [])
    } catch (error) {
      logger.error('Erro ao carregar usuários:', error as any)
      toast.error('Erro ao carregar lista de usuários')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    try {
      await usersApi.delete(id)
      setUsuarios(usuarios.filter(u => u.id !== id))
      toast.success('Usuário excluído com sucesso!')
    } catch (error) {
      toast.error('Erro ao excluir usuário')
    }
  }

  const toggleUserStatus = async (id: string) => {
    try {
      const user = usuarios.find(u => u.id === id)
      if (user) {
        // No need to create updatedUser, API handles the update
        await usersApi.updateUserStatus(id, !user.ativo)
        setUsuarios(usuarios.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u))
        toast.success(`Usuário ${!user.ativo ? 'ativado' : 'desativado'} com sucesso!`)
      }
    } catch (error) {
      toast.error('Erro ao alterar status do usuário')
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

  const getRoleLabel = (role: string) => {
    const roles = {
      admin: 'Administrador',
      diretor: 'Diretor(a)',
      secretario: 'Secretário(a)',
      professor: 'Professor(a)',
      responsavel: 'Responsável'
    }
    return roles[role as keyof typeof roles] || role
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default'
      case 'diretor': return 'secondary'
      case 'secretario': return 'outline'
      case 'professor': return 'secondary'
      default: return 'outline'
    }
  }

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.nome.toLowerCase().includes(search.toLowerCase()) ||
                         (usuario.email?.toLowerCase() || "").includes(search.toLowerCase())
    
    const matchesTipo = tipoFilter === 'todos' || usuario.tipo_usuario === tipoFilter
    const matchesStatus = statusFilter === 'todos' || 
                         (statusFilter === 'ativo' && usuario.ativo) ||
                         (statusFilter === 'inativo' && !usuario.ativo)

    return matchesSearch && matchesTipo && matchesStatus
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600 mt-1">
            Gerencie os usuários e permissões do sistema
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/usuarios/novo">
              <Plus className="h-4 w-4" />
              Novo Usuário
            </Link>
          </Button>
        </div>
      </div>

      {/* Estatísticas compactas */}
      <StatsBar
        stats={[
          { label: 'Total', value: usuarios.length, icon: Users },
          { label: 'Ativos', value: usuarios.filter(u => u.ativo).length, icon: CheckCircle, variant: 'success' },
          { label: 'Professores', value: usuarios.filter(u => u.tipo_usuario === 'professor').length, icon: GraduationCap, variant: 'info' },
          { label: 'Diretores', value: usuarios.filter(u => u.tipo_usuario === 'diretor').length, icon: Crown, variant: 'warning' },
        ]}
      />

      {/* Lista de Usuários */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg">Usuários ({filteredUsuarios.length})</CardTitle>
          </div>
          <InlineFilters
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Buscar por nome ou email...',
            }}
            filters={[
              {
                id: 'tipo',
                placeholder: 'Tipo',
                value: tipoFilter,
                options: [
                  { value: 'todos', label: 'Todos os tipos' },
                  { value: 'admin', label: 'Administrador' },
                  { value: 'diretor', label: 'Diretor' },
                  { value: 'secretario', label: 'Secretário' },
                  { value: 'professor', label: 'Professor' },
                ],
                onChange: setTipoFilter,
                width: 'w-full sm:w-44',
              },
              {
                id: 'status',
                placeholder: 'Status',
                value: statusFilter,
                options: [
                  { value: 'todos', label: 'Todos' },
                  { value: 'ativo', label: 'Ativos' },
                  { value: 'inativo', label: 'Inativos' },
                ],
                onChange: setStatusFilter,
                width: 'w-full sm:w-32',
              },
            ]}
            onClearAll={() => {
              setSearch('')
              setTipoFilter('todos')
              setStatusFilter('todos')
            }}
          />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Escola</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(usuario.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{usuario.nome}</div>
                          <div className="text-sm text-gray-500">{usuario.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(usuario.tipo_usuario)}>
                        {getRoleLabel(usuario.tipo_usuario)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {usuario.escola?.nome || 'Todas as escolas'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {usuario.created_at ? formatDateTimeBR(usuario.created_at) : 'Nunca acessou'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={usuario.ativo ? 'default' : 'secondary'}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/usuarios/${usuario.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/usuarios/${usuario.id}/editar`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleUserStatus(usuario.id)}
                          className={usuario.ativo ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                        >
                          {usuario.ativo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o usuário "{usuario.nome}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteUser(usuario.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsuarios.length === 0 && (
                  <TableEmptyState
                    colSpan={6}
                    icon={search || tipoFilter !== 'todos' || statusFilter !== 'todos' ? SearchIcon : Users}
                    title={
                      search || tipoFilter !== 'todos' || statusFilter !== 'todos'
                        ? 'Nenhum usuário encontrado'
                        : 'Nenhum usuário cadastrado'
                    }
                    description={
                      search || tipoFilter !== 'todos' || statusFilter !== 'todos'
                        ? 'Tente ajustar os filtros para encontrar o que procura.'
                        : 'Comece adicionando o primeiro usuário do sistema.'
                    }
                    actions={
                      search || tipoFilter !== 'todos' || statusFilter !== 'todos'
                        ? [
                            {
                              label: 'Limpar filtros',
                              variant: 'outline',
                              onClick: () => {
                                setSearch('')
                                setTipoFilter('todos')
                                setStatusFilter('todos')
                              },
                            },
                          ]
                        : [
                            {
                              label: 'Novo Usuário',
                              href: '/dashboard/usuarios/novo',
                              icon: UserPlus,
                            },
                          ]
                    }
                  />
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}