'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  CheckCircle,
  Crown,
  Download,
  Eye,
  GraduationCap,
  Plus,
  Search as SearchIcon,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatsBar } from '@/components/dashboard'
import { InlineFilters } from '@/components/filters'
import { TableEmptyState } from '@/components/ui/table-empty-state'
import { formatDateTimeBR } from '@/lib/date-utils'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'
import { recordDemoClientAction } from '@/lib/demo-sandbox/demo-audit-client'
import { logger } from '@/lib/logger'
import { usersApi, type UserWithSchool } from '@/lib/api/users'

interface UserTableProps {
  users: UserWithSchool[]
  hasFilters: boolean
  clearFilters: () => void
  toggleStatus: (id: string) => Promise<void>
}

function getInitials(name: string) {
  return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2)
}

function getRoleBadgeVariant(role: string): BadgeProps['variant'] {
  if (role === 'admin') return 'default'
  if (role === 'diretor' || role === 'professor') return 'secondary'
  return 'outline'
}

function matchesStatus(user: UserWithSchool, status: string) {
  if (status === 'todos') return true
  if (status === 'ativo') return user.ativo === true
  if (status === 'inativo') return user.ativo !== true
  return false
}

function matchesFilters(user: UserWithSchool, search: string, role: string, status: string) {
  const normalizedSearch = search.toLocaleLowerCase('pt-BR')
  const matchesSearch = user.nome.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    || (user.email ?? '').toLocaleLowerCase('pt-BR').includes(normalizedSearch)
  const matchesRole = role === 'todos' || user.tipo_usuario === role
  return matchesSearch && matchesRole && matchesStatus(user, status)
}

function roleLabel(role: string, directorLabel: string, guardianLabel: string) {
  if (role === 'admin') return 'Administrador'
  if (role === 'diretor') return directorLabel
  if (role === 'secretario') return 'Secretário(a)'
  if (role === 'professor') return 'Professor(a)'
  if (role === 'responsavel') return guardianLabel
  return role
}

function LoadingUsers() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-16 bg-gray-200 rounded" />)}
        </div>
      </div>
    </div>
  )
}

function UserRow({ user, toggleStatus }: {
  user: UserWithSchool
  toggleStatus: (id: string) => Promise<void>
}) {
  const t = useTranslations('registry')
  const createdAt = user.created_at ? formatDateTimeBR(user.created_at) : 'Nunca acessou'
  const statusLabel = user.ativo ? t('ui.ativo') : t('labels.inativo')
  const statusActionClass = user.ativo
    ? 'text-orange-600 hover:text-orange-700'
    : 'text-green-600 hover:text-green-700'
  const StatusIcon = user.ativo ? UserX : UserCheck

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center space-x-3">
          <Avatar><AvatarFallback>{getInitials(user.nome)}</AvatarFallback></Avatar>
          <div><div className="font-medium">{user.nome}</div><div className="text-sm text-gray-500">{user.email}</div></div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={getRoleBadgeVariant(user.tipo_usuario)}>
          {roleLabel(user.tipo_usuario, t('labels.diretor-a'), t('labels.responsavel'))}
        </Badge>
      </TableCell>
      <TableCell><div className="text-sm">{user.escola?.nome ?? 'Todas as escolas'}</div></TableCell>
      <TableCell><div className="text-sm">{createdAt}</div></TableCell>
      <TableCell><Badge variant={user.ativo ? 'default' : 'secondary'}>{statusLabel}</Badge></TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/usuarios/${user.id}`} aria-label={`Ver detalhes de ${user.nome}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void toggleStatus(user.id)}
            className={statusActionClass}
            aria-label={`${user.ativo ? 'Desativar' : 'Ativar'} ${user.nome}`}
          >
            <StatusIcon className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function UsersTable({ users, hasFilters, clearFilters, toggleStatus }: UserTableProps) {
  const t = useTranslations('registry')
  const emptyTitle = hasFilters ? t('ui.nenhum-usuario-encontrado') : t('ui.nenhum-usuario-cadastrado')
  const emptyDescription = hasFilters
    ? t('ui.tente-ajustar-os-filtros-para-encontrar-o-que-procura')
    : t('ui.comece-adicionando-o-primeiro-usuario-do-sistema')
  const emptyActions = hasFilters
    ? [{ label: 'Limpar filtros', variant: 'outline' as const, onClick: clearFilters }]
    : [{ label: t('labels.novo-usuario'), href: '/dashboard/usuarios/novo', icon: UserPlus }]

  return (
    <Table className="responsive-stack-table">
      <TableHeader>
        <TableRow>
          <TableHead>{t('labels.usuario')}</TableHead>
          <TableHead>{t('labels.tipo')}</TableHead>
          <TableHead>{t('labels.escola')}</TableHead>
          <TableHead>{t('labels.ultimo-acesso')}</TableHead>
          <TableHead>{t('labels.status')}</TableHead>
          <TableHead className="text-right">{t('labels.acoes')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(user => <UserRow key={user.id} user={user} toggleStatus={toggleStatus} />)}
        {users.length === 0 && (
          <TableEmptyState
            colSpan={6}
            icon={hasFilters ? SearchIcon : Users}
            title={emptyTitle}
            description={emptyDescription}
            actions={emptyActions}
          />
        )}
      </TableBody>
    </Table>
  )
}

export default function UsuariosPage() {
  const t = useTranslations('registry')
  const [usuarios, setUsuarios] = useState<UserWithSchool[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')

  const loadUsuarios = useCallback(async () => {
    try {
      logger.info('Loading usuarios...')
      const data = await usersApi.getUsersWithSchool()
      logger.info('Success! Users found', { metadata: { count: data.length } })
      setUsuarios(data)
    } catch (error) {
      logger.error('Erro ao carregar usuários:', error instanceof Error ? error : 'Unexpected user list failure')
      toast.error(t('ui.erro-ao-carregar-lista-de-usuarios'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void loadUsuarios() }, [loadUsuarios])

  const toggleUserStatus = async (id: string) => {
    const user = usuarios.find(candidate => candidate.id === id)
    if (!user) return

    try {
      if (isDemoSandboxEnabled()) {
        await recordDemoClientAction({ operation: 'demo.user.status_update', entityId: id })
      } else {
        await usersApi.updateUserStatus(id, !user.ativo)
      }
      setUsuarios(current => current.map(candidate => candidate.id === id ? { ...candidate, ativo: !candidate.ativo } : candidate))
      const suffix = isDemoSandboxEnabled() ? ' no demo (simulado)' : ' com sucesso!'
      toast.success(`Usuário ${!user.ativo ? 'ativado' : 'desativado'}${suffix}`)
    } catch {
      toast.error(t('ui.erro-ao-alterar-status-do-usuario'))
    }
  }

  const clearFilters = () => {
    setSearch('')
    setTipoFilter('todos')
    setStatusFilter('todos')
  }
  const filteredUsuarios = usuarios.filter(user => matchesFilters(user, search, tipoFilter, statusFilter))
  const hasFilters = search.length > 0 || tipoFilter !== 'todos' || statusFilter !== 'todos'

  if (loading) return <LoadingUsers />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('labels.usuarios')}</h1>
          <p className="text-gray-600 mt-1">{t('ui.gerencie-os-usuarios-e-permissoes-do-sistema')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />{t('labels.exportar')}</Button>
          <Button asChild className="gap-2"><Link href="/dashboard/usuarios/novo"><Plus className="h-4 w-4" />{t('labels.novo-usuario')}</Link></Button>
        </div>
      </div>

      <StatsBar stats={[
        { label: t('labels.total'), value: usuarios.length, icon: Users },
        { label: 'Ativos', value: usuarios.filter(user => user.ativo).length, icon: CheckCircle, variant: 'success' },
        { label: t('labels.professores'), value: usuarios.filter(user => user.tipo_usuario === 'professor').length, icon: GraduationCap, variant: 'info' },
        { label: 'Diretores', value: usuarios.filter(user => user.tipo_usuario === 'diretor').length, icon: Crown, variant: 'warning' },
      ]} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('ui.usuarios')} ({filteredUsuarios.length})</CardTitle>
          <InlineFilters
            search={{ value: search, onChange: setSearch, placeholder: 'Buscar por nome ou email...' }}
            filters={[
              {
                id: 'tipo', placeholder: t('labels.tipo'), value: tipoFilter, onChange: setTipoFilter, width: 'w-full sm:w-44',
                options: [
                  { value: 'todos', label: 'Todos os tipos' }, { value: 'admin', label: 'Administrador' },
                  { value: 'diretor', label: t('labels.diretor') }, { value: 'secretario', label: t('labels.secretario') },
                  { value: 'professor', label: t('labels.professor') },
                ],
              },
              {
                id: 'status', placeholder: t('labels.status'), value: statusFilter, onChange: setStatusFilter, width: 'w-full sm:w-32',
                options: [{ value: 'todos', label: t('labels.todos') }, { value: 'ativo', label: 'Ativos' }, { value: 'inativo', label: 'Inativos' }],
              },
            ]}
            onClearAll={clearFilters}
          />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <UsersTable users={filteredUsuarios} hasFilters={hasFilters} clearFilters={clearFilters} toggleStatus={toggleUserStatus} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
