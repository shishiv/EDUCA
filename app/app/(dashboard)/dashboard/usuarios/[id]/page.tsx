'use client'
import { useTranslations } from 'next-intl'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { usersApi, UserWithSchool } from '@/lib/api/users'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Shield,
  School,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface UserActivity {
  id: string
  type: 'login' | 'logout' | 'create' | 'update' | 'delete'
  description: string
  timestamp: string
  ip_address: string
  user_agent: string
}

const mockActivities: UserActivity[] = [
  {
    id: '1',
    type: 'login',
    description: 'Login realizado com sucesso',
    timestamp: '2024-01-28T14:30:00Z',
    ip_address: '192.168.1.100',
    user_agent: 'Chrome 120.0.0.0'
  },
  {
    id: '2',
    type: 'update',
    description: 'Atualizou dados do aluno Pedro Silva Santos',
    timestamp: '2024-01-28T13:45:00Z',
    ip_address: '192.168.1.100',
    user_agent: 'Chrome 120.0.0.0'
  },
  {
    id: '3',
    type: 'create',
    description: 'Cadastrou novo aluno: Ana Carolina Ferreira',
    timestamp: '2024-01-28T11:20:00Z',
    ip_address: '192.168.1.100',
    user_agent: 'Chrome 120.0.0.0'
  },
  {
    id: '4',
    type: 'login',
    description: 'Login realizado com sucesso',
    timestamp: '2024-01-28T08:15:00Z',
    ip_address: '192.168.1.100',
    user_agent: 'Chrome 120.0.0.0'
  },
  {
    id: '5',
    type: 'logout',
    description: 'Logout realizado',
    timestamp: '2024-01-27T17:30:00Z',
    ip_address: '192.168.1.100',
    user_agent: 'Chrome 120.0.0.0'
  }
]

export default function UsuarioDetalhesPage() {
  const t = useTranslations('registry')
  const params = useParams()
  const router = useRouter()
  const [usuario, setUsuario] = useState<UserWithSchool | null>(null)
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsuario()
    loadActivities()
  }, [params.id])

  const loadUsuario = async () => {
    try {
      const data = await usersApi.getById(params.id as string) as any
      if (data) {
        setUsuario(data)
      } else {
        toast.error(t('labels.usuario-nao-encontrado'))
        router.push('/dashboard/usuarios')
      }
    } catch (error) {
      // logger.error('Erro ao carregar usuário:', error as any)
      toast.error(t('ui.erro-ao-carregar-dados-do-usuario'))
    } finally {
      setLoading(false)
    }
  }

  const loadActivities = async () => {
    try {
      // Simular carregamento de atividades
      await new Promise(resolve => setTimeout(resolve, 500))
      setActivities(mockActivities)
    } catch (error) {
      // logger.error('Erro ao carregar atividades:', error)
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
      diretor: t('labels.diretor-a'),
      secretario: 'Secretário(a)',
      professor: 'Professor(a)',
      responsavel: t('labels.responsavel')
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'logout': return <AlertCircle className="h-4 w-4 text-gray-600" />
      case 'create': return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'update': return <CheckCircle className="h-4 w-4 text-orange-600" />
      case 'delete': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login': return 'bg-green-100'
      case 'logout': return 'bg-gray-100'
      case 'create': return 'bg-blue-100'
      case 'update': return 'bg-orange-100'
      case 'delete': return 'bg-red-100'
      default: return 'bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="lg:col-span-2 h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!usuario) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('labels.usuario-nao-encontrado')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/usuarios">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('ui.voltar')}
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('labels.detalhes-do-usuario')}</h1>
          <p className="text-gray-600 mt-1">
            {t('ui.informacoes-completas-e-historico-de-atividades')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Usuário */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl bg-primary text-white">
                    {getInitials(usuario.nome)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle>{usuario.nome}</CardTitle>
              <CardDescription>
                <Badge variant={getRoleBadgeVariant(usuario.tipo_usuario)}>
                  {getRoleLabel(usuario.tipo_usuario)}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 text-sm">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{usuario.email}</span>
              </div>
              
              {usuario.escola?.nome && (
                <div className="flex items-center space-x-3 text-sm">
                  <School className="h-4 w-4 text-gray-500" />
                  <span>{usuario.escola?.nome}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>
                  Criado em {usuario.created_at ? new Date(usuario.created_at || "").toLocaleDateString('pt-BR') : 'N/A'}
                </span>
              </div>
              
              {/* Último acesso não está disponível no schema atual */}

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('labels.status')}</span>
                  <Badge variant={usuario.ativo ? 'default' : 'secondary'}>
                    {usuario.ativo ? t('ui.ativo') : t('labels.inativo')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>{t('labels.estatisticas')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('labels.total-de-logins')}</span>
                <span className="font-semibold">
                  {activities.filter(a => a.type === 'login').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('labels.acoes-realizadas')}</span>
                <span className="font-semibold">
                  {activities.filter(a => ['create', 'update', 'delete'].includes(a.type)).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('labels.dias-ativos')}</span>
                <span className="font-semibold">15</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo Principal */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="atividades" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="atividades" className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>{t('labels.atividades')}</span>
              </TabsTrigger>
              <TabsTrigger value="permissoes" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>{t('labels.permissoes')}</span>
              </TabsTrigger>
              <TabsTrigger value="configuracoes" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>{t('labels.configuracoes')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="atividades">
              <Card>
                <CardHeader>
                  <CardTitle>{t('labels.historico-de-atividades')}</CardTitle>
                  <CardDescription>
                    {t('ui.ultimas-acoes-realizadas-pelo-usuario-no-sistema')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg border">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {activity.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(activity.timestamp).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                            <span>IP: {activity.ip_address}</span>
                            <span>{activity.user_agent}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissoes">
              <Card>
                <CardHeader>
                  <CardTitle>{t('labels.permissoes-do-usuario')}</CardTitle>
                  <CardDescription>
                    {t('ui.modulos-e-funcionalidades-que-o-usuario-tem-acesso')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { modulo: 'Dashboard', acesso: true, descricao: 'Visualizar estatísticas gerais' },
                      { modulo: 'Alunos', acesso: true, descricao: 'Gerenciar cadastro de alunos' },
                      { modulo: t('labels.usuarios'), acesso: usuario.tipo_usuario === 'admin', descricao: 'Gerenciar usuários do sistema' },
                      { modulo: t('labels.escolas'), acesso: ['admin', 'secretario'].includes(usuario.tipo_usuario), descricao: 'Gerenciar unidades escolares' },
                      { modulo: t('labels.matriculas'), acesso: true, descricao: 'Processar matrículas' },
                      { modulo: t('labels.turmas'), acesso: true, descricao: 'Gerenciar turmas e classes' },
                      { modulo: 'Frequência', acesso: ['admin', 'diretor', 'professor'].includes(usuario.tipo_usuario), descricao: 'Controlar presença dos alunos' },
                      { modulo: 'Notas', acesso: ['admin', 'diretor', 'professor'].includes(usuario.tipo_usuario), descricao: 'Lançar e gerenciar notas' },
                      { modulo: 'Relatórios', acesso: true, descricao: 'Gerar relatórios do sistema' },
                      { modulo: t('labels.configuracoes'), acesso: usuario.tipo_usuario === 'admin', descricao: 'Configurar parâmetros do sistema' }
                    ].map((permissao, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{permissao.modulo}</div>
                          <div className="text-sm text-gray-500">{permissao.descricao}</div>
                        </div>
                        <Badge variant={permissao.acesso ? 'default' : 'secondary'}>
                          {permissao.acesso ? 'Permitido' : 'Negado'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="configuracoes">
              <Card>
                <CardHeader>
                  <CardTitle>{t('labels.configuracoes-da-conta')}</CardTitle>
                  <CardDescription>
                    {t('ui.configuracoes-especificas-do-usuario')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">{t('labels.id-do-usuario')}</label>
                        <div className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                          {usuario.id}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">{t('labels.tipo-de-usuario')}</label>
                        <div className="text-sm text-gray-600">
                          {getRoleLabel(usuario.tipo_usuario)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">{t('labels.email')}</label>
                      <div className="text-sm text-gray-600">{usuario.email}</div>
                    </div>

                    {usuario.escola?.nome && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">{t('labels.escola-vinculada')}</label>
                        <div className="text-sm text-gray-600">{usuario.escola?.nome}</div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">{t('labels.data-de-criacao')}</label>
                      <div className="text-sm text-gray-600">
                        {new Date(usuario.created_at || "").toLocaleString('pt-BR')}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">{t('labels.status-da-conta')}</label>
                      <div className="flex items-center space-x-2">
                        <Badge variant={usuario.ativo === true ? 'default' : 'secondary'}>
                          {usuario.ativo === true ? t('labels.ativa') : t('ui.inativa')}
                        </Badge>
                        {usuario.ativo !== true && (
                          <span className="text-sm text-gray-500">
                            {t('ui.conta-desativada-pelo-administrador')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}