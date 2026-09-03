'use client'
import { useTranslations } from 'next-intl'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Edit2,
  School,
  MapPin,
  Phone,
  Mail,
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Building2,
  AlertCircle,
  Info,
  Eye
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import Link from 'next/link'

interface Escola {
  id: string
  nome: string
  codigo: string
  endereco: string | null
  telefone: string | null
  email: string | null
  tipo: string
  diretor_id: string | null
  ativo: boolean | null
  created_at: string | null
  diretor?: {
    nome: string
    email: string | null
  } | null
}

interface StatsData {
  totalAlunos: number
  totalTurmas: number
  totalProfessores: number
  matriculasAtivas: number
}

interface Turma {
  id: string
  nome: string
  serie: string
  turno: string
  capacidade: number
  ano_letivo: number
  professor?: {
    nome: string
  } | null
  _count?: {
    matriculas: number
  }
}

export default function EscolaDetailsPage() {
  const t = useTranslations('registry')
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [escola, setEscola] = useState<Escola | null>(null)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [stats, setStats] = useState<StatsData>({
    totalAlunos: 0,
    totalTurmas: 0,
    totalProfessores: 0,
    matriculasAtivas: 0
  })

  useEffect(() => {
    if (id) {
      loadEscolaDetails()
    }
  }, [id])

  const loadEscolaDetails = async () => {
    setLoading(true)
    try {
      // Load school data
      const { data: escolaData, error: escolaError } = await supabase
        .from('escolas')
        .select(`
          *,
          diretor:users!fk_escolas_diretor (
            nome,
            email
          )
        `)
        .eq('id', id)
        .single()

      if (escolaError) throw escolaError
      if (!escolaData) {
        toast.error(t('labels.escola-nao-encontrada'))
        router.push('/dashboard/escolas')
        return
      }

      setEscola(escolaData)

      // Load turmas
      const { data: turmasData, error: turmasError } = await supabase
        .from('turmas')
        .select(`
          id,
          nome,
          serie,
          turno,
          capacidade,
          ano_letivo,
          professor:users (nome)
        `)
        .eq('escola_id', id)
        .eq('ativo', true)
        .order('ano_letivo', { ascending: false })
        .order('nome')

      if (turmasError) {
        logger.error('Erro ao carregar turmas:', turmasError)
      } else {
        setTurmas((turmasData || []).map(turma => ({
          ...turma,
          capacidade: turma.capacidade ?? 0,
        })))
      }

      // Calculate statistics
      await calculateStats(id)
    } catch (error: any) {
      logger.error('Erro ao carregar escola:', error)
      toast.error(t('ui.erro-ao-carregar-detalhes-da-escola'))
      router.push('/dashboard/escolas')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = async (escolaId: string) => {
    try {
      // Get total turmas
      const { count: totalTurmas } = await supabase
        .from('turmas')
        .select('*', { count: 'exact', head: true })
        .eq('escola_id', escolaId)
        .eq('ativo', true)

      // Get total professores
      const { count: totalProfessores } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('escola_id', escolaId)
        .eq('tipo_usuario', 'professor')
        .eq('ativo', true)

      // Get active matriculas count
      const { data: matriculasData } = await supabase
        .from('matriculas')
        .select(`
          id,
          turmas!inner (escola_id)
        `)
        .eq('turmas.escola_id', escolaId)
        .eq('situacao', 'ativa')

      const matriculasAtivas = matriculasData?.length || 0

      // Get unique alunos count from active matriculas
      const { data: alunosData } = await supabase
        .from('matriculas')
        .select(`
          aluno_id,
          turmas!inner (escola_id)
        `)
        .eq('turmas.escola_id', escolaId)
        .eq('situacao', 'ativa')

      const uniqueAlunos = new Set(alunosData?.map(m => m.aluno_id) || [])
      const totalAlunos = uniqueAlunos.size

      setStats({
        totalAlunos,
        totalTurmas: totalTurmas || 0,
        totalProfessores: totalProfessores || 0,
        matriculasAtivas
      })
    } catch (error: any) {
      logger.error('Erro ao calcular estatísticas:', error)
    }
  }

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      creche: 'Creche',
      pre_escola: 'Pré-Escola',
      fundamental: 'Fundamental',
      medio: 'Médio'
    }
    return labels[tipo] || tipo
  }

  const getTurnoLabel = (turno: string) => {
    const labels: Record<string, string> = {
      matutino: 'Manhã',
      vespertino: 'Tarde',
      integral: t('labels.integral'),
      noturno: 'Noite'
    }
    return labels[turno] || turno
  }

  const formatPhone = (phone: string | null) => {
    if (!phone) return '-'
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!escola) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{t('labels.escola-nao-encontrada')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/escolas">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('ui.voltar')}
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{escola.nome}</h1>
            <p className="text-gray-600 mt-1">
              {t('ui.informacoes-completas-e-estatisticas-da-escola')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={escola.ativo ? 'default' : 'secondary'}>
            {escola.ativo ? t('labels.ativa') : t('ui.inativa')}
          </Badge>
          <Button onClick={() => router.push(`/dashboard/escolas/${id}/editar`)} variant="outline">
            <Edit2 className="h-4 w-4 mr-2" />
            {t('ui.editar')}
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>{t('labels.codigo-inep-3')}</strong> {escola.codigo}
          {' '}• <strong>{t('labels.tipo-2')}</strong> {getTipoLabel(escola.tipo)}
        </AlertDescription>
      </Alert>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">{t('labels.total-de-alunos')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">{stats.totalAlunos}</span>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
            <p className="text-xs text-gray-600 mt-1">{t('labels.matriculas-ativas-2')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">{t('labels.turmas')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">{stats.totalTurmas}</span>
              <BookOpen className="h-8 w-8 text-green-400" />
            </div>
            <p className="text-xs text-gray-600 mt-1">{t('labels.turmas-ativas')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">{t('labels.professores')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-purple-600">{stats.totalProfessores}</span>
              <GraduationCap className="h-8 w-8 text-purple-400" />
            </div>
            <p className="text-xs text-gray-600 mt-1">{t('labels.ativos-no-sistema')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">{t('labels.matriculas')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-orange-600">{stats.matriculasAtivas}</span>
              <TrendingUp className="h-8 w-8 text-orange-400" />
            </div>
            <p className="text-xs text-gray-600 mt-1">{t('labels.ativas-este-ano')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <CardTitle>{t('labels.informacoes-basicas')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-600">{t('labels.nome-da-escola')}</Label>
              <p className="font-medium text-lg">{escola.nome}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">{t('labels.codigo-inep')}</Label>
                <p className="font-medium font-mono">{escola.codigo}</p>
              </div>
              <div>
                <Label className="text-gray-600">{t('labels.tipo')}</Label>
                <Badge variant="outline">{getTipoLabel(escola.tipo)}</Badge>
              </div>
            </div>
            <div>
              <Label className="text-gray-600">{t('labels.status')}</Label>
              <div className="mt-1">
                <Badge variant={escola.ativo ? 'default' : 'secondary'}>
                  {escola.ativo ? t('labels.ativa') : t('ui.inativa')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-green-600" />
              <CardTitle>{t('labels.dados-de-contato')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-600">{t('labels.telefone')}</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Phone className="h-4 w-4 text-gray-400" />
                <p className="font-medium">{formatPhone(escola.telefone)}</p>
              </div>
            </div>
            <div>
              <Label className="text-gray-600">{t('labels.e-mail')}</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Mail className="h-4 w-4 text-gray-400" />
                <p className="font-medium">{escola.email || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-red-600" />
              <CardTitle>{t('labels.endereco')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">
              {escola.endereco || 'Endereço não cadastrado'}
            </p>
          </CardContent>
        </Card>

        {/* Director Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <CardTitle>{t('labels.direcao')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {escola.diretor ? (
              <>
                <div>
                  <Label className="text-gray-600">{t('labels.diretor-a')}</Label>
                  <p className="font-medium">{escola.diretor.nome}</p>
                </div>
                <div>
                  <Label className="text-gray-600">{t('labels.e-mail-do-diretor')}</Label>
                  <p className="text-sm text-gray-600">{escola.diretor.email}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">{t('labels.nenhum-diretor-atribuido')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <CardTitle>{t('labels.turmas-da-escola')}</CardTitle>
            </div>
            <CardDescription>
              {turmas.length} {t('ui.turmas-ativas')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {turmas.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">{t('labels.nenhuma-turma-cadastrada-para-esta-escola')}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/dashboard/turmas/nova')}
              >
                {t('ui.criar-nova-turma')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('labels.turma')}</TableHead>
                    <TableHead>{t('labels.serie')}</TableHead>
                    <TableHead>{t('labels.turno')}</TableHead>
                    <TableHead>{t('labels.professor')}</TableHead>
                    <TableHead>{t('labels.capacidade')}</TableHead>
                    <TableHead>{t('labels.ano-letivo')}</TableHead>
                    <TableHead className="text-right">{t('labels.acoes')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turmas.map((turma) => (
                    <TableRow key={turma.id}>
                      <TableCell className="font-medium">{turma.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{turma.serie}</Badge>
                      </TableCell>
                      <TableCell>{getTurnoLabel(turma.turno)}</TableCell>
                      <TableCell>{turma.professor?.nome || '-'}</TableCell>
                      <TableCell>{turma.capacidade} {t('ui.alunos-258311')}</TableCell>
                      <TableCell>{turma.ano_letivo}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/turmas/${turma.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
