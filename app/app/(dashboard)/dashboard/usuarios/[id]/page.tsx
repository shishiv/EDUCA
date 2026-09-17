'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Activity, AlertCircle, ArrowLeft, Calendar, CheckCircle, Mail, Pencil, Save, School, Shield, User } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { schoolsApi } from '@/lib/api/schools'
import { usersApi, type UserWithSchool } from '@/lib/api/users'
import { canAccessRoute } from '@/lib/route-policy'

interface UserActivity {
  id: string
  type: 'login' | 'logout' | 'create' | 'update' | 'delete'
  description: string
  timestamp: string
  ip_address: string
  user_agent: string
}

interface SchoolOption {
  id: string
  nome: string
}

interface ManagedUserForm {
  nome: string
  email: string
  tipo_usuario: 'diretor' | 'professor'
  escola_id: string
}

interface PermissionItem {
  modulo: string
  acesso: boolean
  descricao: string
}

const emptyForm: ManagedUserForm = { nome: '', email: '', tipo_usuario: 'professor', escola_id: '' }

function isManagedRole(role: string): role is ManagedUserForm['tipo_usuario'] {
  return role === 'diretor' || role === 'professor'
}

function formForUser(user: UserWithSchool): ManagedUserForm {
  return {
    nome: user.nome,
    email: user.email ?? '',
    tipo_usuario: isManagedRole(user.tipo_usuario) ? user.tipo_usuario : 'professor',
    escola_id: user.escola_id ?? '',
  }
}

function getInitials(name: string) {
  return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2)
}

function roleLabel(role: string, directorLabel: string, guardianLabel: string) {
  if (role === 'admin') return 'Administrador'
  if (role === 'diretor') return directorLabel
  if (role === 'secretario') return 'Secretário(a)'
  if (role === 'professor') return 'Professor(a)'
  if (role === 'responsavel') return guardianLabel
  return role
}

function roleBadgeVariant(role: string): BadgeProps['variant'] {
  if (role === 'admin') return 'default'
  if (role === 'diretor' || role === 'professor') return 'secondary'
  return 'outline'
}

function activityIcon(type: UserActivity['type']) {
  if (type === 'logout' || type === 'delete') return AlertCircle
  return CheckCircle
}

function activityColor(type: UserActivity['type']) {
  if (type === 'login') return 'bg-green-100'
  if (type === 'create') return 'bg-blue-100'
  if (type === 'update') return 'bg-orange-100'
  if (type === 'delete') return 'bg-red-100'
  return 'bg-gray-100'
}

function UserSummary({ user, activities }: { user: UserWithSchool; activities: UserActivity[] }) {
  const t = useTranslations('registry')
  const actionTypes: UserActivity['type'][] = ['create', 'update', 'delete']
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="h-24 w-24"><AvatarFallback className="text-2xl bg-primary text-white">{getInitials(user.nome)}</AvatarFallback></Avatar>
          </div>
          <CardTitle>{user.nome}</CardTitle>
          <CardDescription><Badge variant={roleBadgeVariant(user.tipo_usuario)}>{roleLabel(user.tipo_usuario, t('labels.diretor-a'), t('labels.responsavel'))}</Badge></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 text-sm"><Mail className="h-4 w-4 text-gray-500" /><span>{user.email}</span></div>
          {user.escola?.nome && <div className="flex items-center space-x-3 text-sm"><School className="h-4 w-4 text-gray-500" /><span>{user.escola.nome}</span></div>}
          <div className="flex items-center space-x-3 text-sm"><Calendar className="h-4 w-4 text-gray-500" /><span>Criado em {createdAt}</span></div>
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('labels.status')}</span>
              <Badge variant={user.ativo ? 'default' : 'secondary'}>{user.ativo ? t('ui.ativo') : t('labels.inativo')}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center space-x-2"><Activity className="h-5 w-5" /><span>{t('labels.estatisticas')}</span></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><span className="text-sm text-gray-600">{t('labels.total-de-logins')}</span><span className="font-semibold">{activities.filter(item => item.type === 'login').length}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-gray-600">{t('labels.acoes-realizadas')}</span><span className="font-semibold">{activities.filter(item => actionTypes.includes(item.type)).length}</span></div>
        </CardContent>
      </Card>
    </div>
  )
}

function ActivityTab({ activities }: { activities: UserActivity[] }) {
  const t = useTranslations('registry')
  return (
    <TabsContent value="atividades">
      <Card>
        <CardHeader><CardTitle>{t('labels.historico-de-atividades')}</CardTitle><CardDescription>{t('ui.ultimas-acoes-realizadas-pelo-usuario-no-sistema')}</CardDescription></CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade disponível.</p>
          ) : (
            <div className="space-y-4">
              {activities.map(item => {
                const ActivityIcon = activityIcon(item.type)
                return (
                  <div key={item.id} className="flex items-start space-x-4 p-4 rounded-lg border">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${activityColor(item.type)}`}><ActivityIcon className="h-4 w-4 text-gray-600" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-900">{item.description}</p><p className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString('pt-BR')}</p></div>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500"><span>IP: {item.ip_address}</span><span>{item.user_agent}</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  )
}

function permissionsFor(user: UserWithSchool, labels: { users: string; schools: string; enrollments: string; classes: string; settings: string }): PermissionItem[] {
  return [
    { modulo: 'Dashboard', acesso: canAccessRoute('/dashboard', user.tipo_usuario), descricao: 'Acessar a visão geral do sistema' },
    { modulo: 'Alunos', acesso: canAccessRoute('/dashboard/alunos', user.tipo_usuario), descricao: 'Acessar o cadastro de alunos' },
    { modulo: labels.users, acesso: canAccessRoute('/dashboard/usuarios', user.tipo_usuario), descricao: 'Acessar a área de usuários' },
    { modulo: labels.schools, acesso: canAccessRoute('/dashboard/escolas', user.tipo_usuario), descricao: 'Acessar as unidades escolares' },
    { modulo: labels.enrollments, acesso: canAccessRoute('/dashboard/matriculas', user.tipo_usuario), descricao: 'Acessar as matrículas' },
    { modulo: labels.classes, acesso: canAccessRoute('/dashboard/turmas', user.tipo_usuario), descricao: 'Acessar turmas e classes' },
    { modulo: 'Frequência', acesso: canAccessRoute('/dashboard/turmas', user.tipo_usuario), descricao: 'Acessar frequência pelas turmas' },
    { modulo: 'Notas', acesso: canAccessRoute('/dashboard/notas', user.tipo_usuario), descricao: 'Acessar notas' },
    { modulo: 'Relatórios', acesso: canAccessRoute('/dashboard/relatorios', user.tipo_usuario), descricao: 'Acessar relatórios' },
    { modulo: labels.settings, acesso: canAccessRoute('/dashboard/configuracoes', user.tipo_usuario), descricao: 'Acessar configurações' },
  ]
}

function PermissionsTab({ user }: { user: UserWithSchool }) {
  const t = useTranslations('registry')
  const permissions = permissionsFor(user, {
    users: t('labels.usuarios'), schools: t('labels.escolas'), enrollments: t('labels.matriculas'),
    classes: t('labels.turmas'), settings: t('labels.configuracoes'),
  })
  return (
    <TabsContent value="permissoes">
      <Card>
        <CardHeader><CardTitle>{t('labels.permissoes-do-usuario')}</CardTitle><CardDescription>{t('ui.modulos-e-funcionalidades-que-o-usuario-tem-acesso')}</CardDescription></CardHeader>
        <CardContent><div className="space-y-4">{permissions.map(permission => (
          <div key={permission.modulo} className="flex items-center justify-between p-3 border rounded-lg">
            <div><div className="font-medium">{permission.modulo}</div><div className="text-sm text-gray-500">{permission.descricao}</div></div>
            <Badge variant={permission.acesso ? 'default' : 'secondary'}>{permission.acesso ? 'Permitido' : 'Negado'}</Badge>
          </div>
        ))}</div></CardContent>
      </Card>
    </TabsContent>
  )
}

function SettingsTab({ user, editing, saving, errorMessage, escolas, formData, setEditing, setFormData, submit }: {
  user: UserWithSchool
  editing: boolean
  saving: boolean
  errorMessage: string
  escolas: SchoolOption[]
  formData: ManagedUserForm
  setEditing: (editing: boolean) => void
  setFormData: React.Dispatch<React.SetStateAction<ManagedUserForm>>
  submit: (event: React.FormEvent) => Promise<void>
}) {
  const t = useTranslations('registry')
  return (
    <TabsContent value="configuracoes">
      <Card>
        <CardHeader><CardTitle>{t('labels.configuracoes-da-conta')}</CardTitle><CardDescription>{t('ui.configuracoes-especificas-do-usuario')}</CardDescription></CardHeader>
        <CardContent>
          {editing ? (
            <form className="space-y-6" onSubmit={event => void submit(event)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="edit-nome">Nome completo</Label><Input id="edit-nome" value={formData.nome} onChange={event => setFormData(current => ({ ...current, nome: event.target.value }))} minLength={2} maxLength={160} required /></div>
                <div className="space-y-2"><Label htmlFor="edit-email">E-mail</Label><Input id="edit-email" type="email" value={formData.email} onChange={event => setFormData(current => ({ ...current, email: event.target.value }))} required /></div>
                <div className="space-y-2">
                  <Label htmlFor="edit-tipo-usuario">Tipo de usuário</Label>
                  <Select value={formData.tipo_usuario} onValueChange={tipo_usuario => {
                    if (isManagedRole(tipo_usuario)) setFormData(current => ({ ...current, tipo_usuario }))
                  }} disabled>
                    <SelectTrigger id="edit-tipo-usuario"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="professor">Professor(a)</SelectItem><SelectItem value="diretor">Diretor(a)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-escola">Escola</Label>
                  <Select value={formData.escola_id} onValueChange={escola_id => setFormData(current => ({ ...current, escola_id }))} disabled>
                    <SelectTrigger id="edit-escola"><SelectValue placeholder="Selecione a escola" /></SelectTrigger>
                    <SelectContent>{escolas.map(escola => <SelectItem key={escola.id} value={escola.id}>{escola.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {errorMessage && <p role="alert" className="text-sm text-red-600">{errorMessage}</p>}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium text-gray-700">{t('labels.id-do-usuario')}</label><div className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">{user.id}</div></div>
                <div className="space-y-2"><label className="text-sm font-medium text-gray-700">{t('labels.tipo-de-usuario')}</label><div className="text-sm text-gray-600">{roleLabel(user.tipo_usuario, t('labels.diretor-a'), t('labels.responsavel'))}</div></div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium text-gray-700">{t('labels.email')}</label><div className="text-sm text-gray-600">{user.email}</div></div>
              {user.escola?.nome && <div className="space-y-2"><label className="text-sm font-medium text-gray-700">{t('labels.escola-vinculada')}</label><div className="text-sm text-gray-600">{user.escola.nome}</div></div>}
              <div className="space-y-2"><label className="text-sm font-medium text-gray-700">{t('labels.data-de-criacao')}</label><div className="text-sm text-gray-600">{user.created_at ? new Date(user.created_at).toLocaleString('pt-BR') : ''}</div></div>
              <div className="space-y-2"><label className="text-sm font-medium text-gray-700">{t('labels.status-da-conta')}</label><div className="flex items-center space-x-2"><Badge variant={user.ativo ? 'default' : 'secondary'}>{user.ativo ? t('labels.ativa') : t('ui.inativa')}</Badge></div></div>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  )
}

function LoadingUser() {
  return <div className="space-y-6"><div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/4 mb-4" /><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="h-64 bg-gray-200 rounded" /><div className="lg:col-span-2 h-64 bg-gray-200 rounded" /></div></div></div>
}

export default function UsuarioDetalhesPage() {
  const t = useTranslations('registry')
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [usuario, setUsuario] = useState<UserWithSchool | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('atividades')
  const [errorMessage, setErrorMessage] = useState('')
  const [escolas, setEscolas] = useState<SchoolOption[]>([])
  const [formData, setFormData] = useState<ManagedUserForm>(emptyForm)
  const activities: UserActivity[] = []

  const loadUsuario = useCallback(async () => {
    try {
      const data = await usersApi.getUserWithSchool(id)
      if (!data) {
        toast.error(t('labels.usuario-nao-encontrado'))
        router.push('/dashboard/usuarios')
        return
      }
      setUsuario(data)
      setFormData(formForUser(data))
    } catch {
      toast.error(t('ui.erro-ao-carregar-dados-do-usuario'))
    } finally {
      setLoading(false)
    }
  }, [id, router, t])

  useEffect(() => { void schoolsApi.getAll<SchoolOption>().then(setEscolas).catch(() => undefined) }, [])
  useEffect(() => { void loadUsuario() }, [loadUsuario])

  const handleEdit = () => {
    setEditing(true)
    setErrorMessage('')
    setActiveTab('configuracoes')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    try {
      await usersApi.updateManagedTeacher(id, formData)
      await loadUsuario()
      setEditing(false)
      toast.success('Professor atualizado com sucesso')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar o professor'
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingUser />
  if (!usuario) return <div className="text-center py-8"><p className="text-gray-500">{t('labels.usuario-nao-encontrado')}</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/usuarios"><ArrowLeft className="h-4 w-4 mr-2" />{t('ui.voltar')}</Link></Button>
        <div className="flex-1"><h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('labels.detalhes-do-usuario')}</h1><p className="text-gray-600 mt-1">{t('ui.informacoes-completas-e-historico-de-atividades')}</p></div>
        {isManagedRole(usuario.tipo_usuario) && !editing && <Button type="button" onClick={handleEdit}><Pencil className="h-4 w-4 mr-2" />Editar</Button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UserSummary user={usuario} activities={activities} />
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="atividades" className="flex items-center space-x-2"><Activity className="h-4 w-4" /><span>{t('labels.atividades')}</span></TabsTrigger>
              <TabsTrigger value="permissoes" className="flex items-center space-x-2"><Shield className="h-4 w-4" /><span>{t('labels.permissoes')}</span></TabsTrigger>
              <TabsTrigger value="configuracoes" className="flex items-center space-x-2"><User className="h-4 w-4" /><span>{t('labels.configuracoes')}</span></TabsTrigger>
            </TabsList>
            <ActivityTab activities={activities} />
            <PermissionsTab user={usuario} />
            <SettingsTab user={usuario} editing={editing} saving={saving} errorMessage={errorMessage} escolas={escolas} formData={formData} setEditing={setEditing} setFormData={setFormData} submit={handleSubmit} />
          </Tabs>
        </div>
      </div>
    </div>
  )
}
