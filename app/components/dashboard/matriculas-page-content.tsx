'use client'
import { useTranslations } from 'next-intl'
import { z } from 'zod'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Eye, Edit, Trash2, Calendar, Download } from 'lucide-react'
import { toast } from 'sonner'
import type { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'

const matriculaSchema = z.object({
  id: z.string().catch(''),
  aluno: z.object({
    id: z.string().catch(''),
    nome_completo: z.string().catch('Aluno desconhecido'),
    data_nascimento: z.string().catch(''),
    cpf: z.string().optional().catch(undefined),
    sexo: z.enum(['M', 'F']).optional().catch(undefined),
  }).catch({
    id: '',
    nome_completo: 'Aluno desconhecido',
    data_nascimento: '',
    cpf: undefined,
    sexo: undefined,
  }),
  turma: z.object({
    id: z.string().catch(''),
    nome: z.string().catch('Turma desconhecida'),
    serie: z.string().catch(''),
    escola: z.object({
      nome: z.string().catch('Escola desconhecida'),
    }).catch({ nome: 'Escola desconhecida' }),
    professor: z.object({
      nome: z.string().catch(''),
    }).optional().catch(undefined),
  }).catch({
    id: '',
    nome: 'Turma desconhecida',
    serie: '',
    escola: { nome: 'Escola desconhecida' },
    professor: undefined,
  }),
  ano_letivo: z.number(),
  data_matricula: z.string().catch(''),
  situacao: z.string().catch(''),
  observacoes: z.string().optional().catch(undefined),
  created_at: z.string().nullable().catch(null),
})

type Matricula = z.infer<typeof matriculaSchema>

const matriculasSchema = z.array(matriculaSchema).catch([])
const databaseErrorSchema = z.object({ code: z.string().optional() })

function parseMatriculas(value: z.input<typeof matriculasSchema>): Matricula[] {
  return matriculasSchema.parse(value)
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function calculateAge(birthDate: string | undefined | null) {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return null
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--

  return age
}

const STUDENT_SEX_LABELS = {
  M: 'Masculino',
  F: 'Feminino',
} as const

function studentDetails(aluno: Matricula['aluno'], unavailableAgeLabel: string): string {
  const age = calculateAge(aluno.data_nascimento)
  const ageLabel = age === null ? unavailableAgeLabel : `${age} anos`
  const sexLabel = aluno.sexo ? STUDENT_SEX_LABELS[aluno.sexo] : undefined
  const cpfLabel = aluno.cpf ? `CPF: ${aluno.cpf}` : undefined

  return [ageLabel, sexLabel, cpfLabel].filter((detail): detail is string => detail !== undefined).join(' • ')
}

function MatriculaStudentCell({ aluno }: { aluno: Matricula['aluno'] }) {
  const t = useTranslations('registry')
  const details = studentDetails(aluno, t('ui.idade-nao-informada'))

  return (
    <TableCell>
      <div className="flex items-center space-x-3">
        <Avatar>
          <AvatarFallback>{getInitials(aluno.nome_completo)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{aluno.nome_completo}</div>
          <div className="text-sm text-gray-500">{details}</div>
        </div>
      </div>
    </TableCell>
  )
}

function MatriculaClassCell({ turma }: { turma: Matricula['turma'] }) {
  return (
    <TableCell>
      <div className="space-y-1">
        <div className="font-medium">{turma?.nome || 'Turma desconhecida'}</div>
        <div className="text-sm text-gray-500">
          {turma?.serie || '-'} • {turma?.escola?.nome || '-'}
        </div>
        {turma?.professor && (
          <div className="text-xs text-gray-400">Prof. {turma.professor.nome}</div>
        )}
      </div>
    </TableCell>
  )
}

type SituationBadge = {
  variant: 'default' | 'secondary' | 'outline' | 'destructive'
  label: string
}

function resolveSituation(
  situations: {
    ativa: SituationBadge
    transferida: SituationBadge
    concluida: SituationBadge
    cancelada: SituationBadge
  },
  situation: string,
): SituationBadge {
  switch (situation) {
    case 'ativa': return situations.ativa
    case 'transferida': return situations.transferida
    case 'concluida': return situations.concluida
    case 'cancelada': return situations.cancelada
    default: return { variant: 'outline', label: situation }
  }
}

function MatriculaSituationCell({ matricula }: { matricula: Matricula }) {
  const t = useTranslations('registry')
  const situations = {
    ativa: { variant: 'default', label: t('labels.ativa') },
    transferida: { variant: 'secondary', label: t('labels.transferida') },
    concluida: { variant: 'outline', label: t('labels.concluida') },
    cancelada: { variant: 'destructive', label: t('labels.cancelada') },
  } satisfies {
    ativa: SituationBadge
    transferida: SituationBadge
    concluida: SituationBadge
    cancelada: SituationBadge
  }
  const situation = resolveSituation(situations, matricula.situacao)

  return (
    <TableCell>
      <Badge variant={situation.variant}>{situation.label}</Badge>
      {matricula.observacoes && (
        <div className="text-xs text-gray-500 mt-1 max-w-32 truncate">
          {matricula.observacoes}
        </div>
      )}
    </TableCell>
  )
}

function MatriculaActionsCell({
  matricula,
  onDelete,
}: {
  matricula: Matricula
  onDelete: (matriculaId: string, alunoNome: string) => void
}) {
  const t = useTranslations('registry')

  return (
    <TableCell className="text-right">
      <div className="flex items-center justify-end space-x-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/matriculas/${matricula.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/matriculas/${matricula.id}`}>
            <Edit className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700"
          onClick={() => onDelete(
            matricula.id,
            matricula.aluno?.nome_completo || t('labels.aluno')
          )}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </TableCell>
  )
}

function MatriculaTableRow({
  matricula,
  onDelete,
}: {
  matricula: Matricula
  onDelete: (matriculaId: string, alunoNome: string) => void
}) {
  return (
    <TableRow>
      <MatriculaStudentCell aluno={matricula.aluno} />
      <MatriculaClassCell turma={matricula.turma} />
      <TableCell>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{matricula.ano_letivo}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {new Date(matricula.data_matricula).toLocaleDateString('pt-BR')}
        </div>
      </TableCell>
      <MatriculaSituationCell matricula={matricula} />
      <MatriculaActionsCell matricula={matricula} onDelete={onDelete} />
    </TableRow>
  )
}

type MatriculaFilters = {
  search: string
  situacao: string
  ano: string
  escola: string
}

function matchesMatriculaSearch(matricula: Matricula, search: string): boolean {
  const normalizedSearch = search.toLowerCase()
  const searchableValues = [
    matricula.aluno.nome_completo,
    matricula.aluno.cpf ?? '',
    matricula.turma.nome,
    matricula.turma.escola.nome,
  ]

  return searchableValues.some(value => value.toLowerCase().includes(normalizedSearch))
}

function matchesMatriculaFilters(matricula: Matricula, filters: MatriculaFilters): boolean {
  return matchesMatriculaSearch(matricula, filters.search) &&
    (filters.situacao === 'todas' || matricula.situacao === filters.situacao) &&
    (filters.ano === 'todos' || matricula.ano_letivo.toString() === filters.ano) &&
    (filters.escola === 'todas' || matricula.turma.escola.nome === filters.escola)
}

function deletionFailureMessage(
  errorCode: string | undefined,
  fallbackMessage: string,
  messages: { attendance: string; permission: string },
): string {
  if (errorCode === '23503') return messages.attendance
  if (errorCode === '42501' || fallbackMessage.includes('permission')) return messages.permission
  return `Erro ao cancelar matrícula: ${fallbackMessage || 'Tente novamente.'}`
}

export type MatriculasDependencies = { supabaseClient: Pick<typeof supabase, 'from'> }

export function MatriculasPageContent({ supabaseClient }: MatriculasDependencies) {
  const t = useTranslations('registry')

  const [matriculas, setMatriculas] = useState<Matricula[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [situacaoFilter, setSituacaoFilter] = useState('todas')
  const [anoFilter, setAnoFilter] = useState('todos')
  const [escolaFilter, setEscolaFilter] = useState('todas')

  const loadMatriculas = useCallback(async () => {
    try {
      const { data, error } = await supabaseClient
        .from('matriculas')
        .select(`
          *,
          aluno:alunos(id, nome_completo, data_nascimento),
          turma:turmas(id, nome, serie, ano_letivo, escola:escolas(id, nome))
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setMatriculas(parseMatriculas(data))
    } catch (error) {
      logger.error('Error loading matriculas', error instanceof Error ? error : new Error(String(error)))
      toast.error(t('ui.erro-ao-carregar-lista-de-matriculas'))
      setMatriculas([])
    } finally {
      setLoading(false)
    }
  }, [supabaseClient, t])

  useEffect(() => {
    void loadMatriculas()
  }, [loadMatriculas])

  const handleDeleteMatricula = async (matriculaId: string, alunoNome: string) => {
    if (isDemoSandboxEnabled()) {
      toast.error(t('ui.acao-bloqueada-no-sandbox-publico-de-demonstracao'))
      return
    }

    if (!confirm(`Tem certeza que deseja cancelar a matrícula de "${alunoNome}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      const { error } = await supabaseClient
        .from('matriculas')
        .delete()
        .eq('id', matriculaId)

      if (error) throw error

      toast.success(`Matrícula de "${alunoNome}" cancelada com sucesso!`)
      await loadMatriculas() // Reload the list
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error))
      const databaseError = databaseErrorSchema.safeParse(error)
      logger.error('Error deleting matricula', normalizedError, {
        metadata: {
          errorMessage: normalizedError.message || 'Unknown error',
          matriculaId,
          alunoNome
        }
      })

      toast.error(deletionFailureMessage(
        databaseError.success ? databaseError.data.code : undefined,
        normalizedError.message,
        {
          attendance: t('ui.nao-e-possivel-cancelar-esta-matricula-pois-existem-registros-de-frequen'),
          permission: t('ui.voce-nao-tem-permissao-para-cancelar-esta-matricula'),
        },
      ))
    }
  }

  const filteredMatriculas = matriculas.filter(matricula => matchesMatriculaFilters(matricula, {
    search,
    situacao: situacaoFilter,
    ano: anoFilter,
    escola: escolaFilter,
  }))

  const totalMatriculas = matriculas.length
  const matriculasAtivas = matriculas.filter(m => m.situacao === 'ativa').length
  const matriculasTransferidas = matriculas.filter(m => m.situacao === 'transferida').length
  const matriculasConcluidas = matriculas.filter(m => m.situacao === 'concluida').length

  const anos = Array.from(new Set(matriculas.map(m => m.ano_letivo))).sort((a, b) => b - a)
  const escolas = Array.from(new Set(matriculas.map(m => m.turma.escola?.nome).filter(Boolean)))

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
          <h1 className="text-3xl font-bold text-gray-900">{t('labels.matriculas')}</h1>
          <p className="text-gray-600 mt-1">
            {t('ui.gerencie-as-matriculas-dos-alunos-na-rede-municipal')}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            {t('labels.exportar')}
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/matriculas/nova">
              <Plus className="h-4 w-4" />
              {t('labels.nova-matricula')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{totalMatriculas}</div>
            <div className="text-sm text-gray-600">{t('labels.total-de-matriculas')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{matriculasAtivas}</div>
            <div className="text-sm text-gray-600">{t('labels.matriculas-ativas')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{matriculasTransferidas}</div>
            <div className="text-sm text-gray-600">{t('labels.transferidas')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{matriculasConcluidas}</div>
            <div className="text-sm text-gray-600">{t('labels.concluidas')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>{t('labels.filtros')}</CardTitle>
          <CardDescription>
            {t('ui.use-os-filtros-abaixo-para-encontrar-matriculas-especificas')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('labels.buscar-por-aluno-cpf-turma-ou-escola')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={situacaoFilter} onValueChange={setSituacaoFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder={t('labels.situacao')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">{t('labels.todas')}</SelectItem>
                <SelectItem value="ativa">{t('labels.ativas')}</SelectItem>
                <SelectItem value="transferida">{t('labels.transferidas')}</SelectItem>
                <SelectItem value="concluida">{t('labels.concluidas')}</SelectItem>
                <SelectItem value="cancelada">{t('labels.canceladas')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={anoFilter} onValueChange={setAnoFilter}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder={t('labels.ano')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{t('labels.todos')}</SelectItem>
                {anos.map((ano) => (
                  <SelectItem key={ano} value={ano.toString()}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={escolaFilter} onValueChange={setEscolaFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder={t('labels.escola')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">{t('labels.todas')}</SelectItem>
                {escolas.map((escola) => escola && (
                  <SelectItem key={escola} value={escola}>
                    {escola}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Matrículas */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ui.lista-de-matriculas')}{filteredMatriculas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="responsive-stack-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('labels.aluno')}</TableHead>
                  <TableHead>{t('labels.turma-escola')}</TableHead>
                  <TableHead>{t('labels.ano-letivo')}</TableHead>
                  <TableHead>{t('labels.data-matricula')}</TableHead>
                  <TableHead>{t('labels.situacao')}</TableHead>
                  <TableHead className="text-right">{t('labels.acoes')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatriculas.map((matricula) => (
                  <MatriculaTableRow
                    key={matricula.id}
                    matricula={matricula}
                    onDelete={handleDeleteMatricula}
                  />
                ))}
                {filteredMatriculas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {t('ui.nenhuma-matricula-encontrada-com-os-filtros-aplicados')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
