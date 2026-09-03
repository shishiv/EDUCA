'use client'
import { useTranslations } from 'next-intl'

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
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'

interface Matricula {
  id: string
  aluno: {
    id: string
    nome_completo: string
    data_nascimento: string
    cpf?: string
    sexo?: string
  }
  turma: {
    id: string
    nome: string
    serie: string
    escola?: {
      nome: string
      tipo?: string
    }
    professor?: {
      nome: string
    }
  }
  escola?: {
    id: string
    nome: string
  }
  ano_letivo: number
  data_matricula: string
  situacao: string
  observacoes?: string
  created_at: string | null
}

function getInitials(name: string | undefined | null) {
  if (!name) return '??'
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

function MatriculaStudentCell({ aluno }: { aluno: Matricula['aluno'] }) {
  const t = useTranslations('registry')
  const age = calculateAge(aluno?.data_nascimento)

  return (
    <TableCell>
      <div className="flex items-center space-x-3">
        <Avatar>
          <AvatarFallback>{getInitials(aluno?.nome_completo)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{aluno?.nome_completo || 'Aluno desconhecido'}</div>
          <div className="text-sm text-gray-500">
            {age !== null ? `${age} anos` : t('ui.idade-nao-informada')}
            {aluno?.sexo && (aluno.sexo === 'M' ? ' • Masculino' : ' • Feminino')}
            {aluno?.cpf && ` • CPF: ${aluno.cpf}`}
          </div>
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

function MatriculaSituationCell({ matricula }: { matricula: Matricula }) {
  const t = useTranslations('registry')
  const situations = {
    ativa: { variant: 'default' as const, label: t('labels.ativa') },
    transferida: { variant: 'secondary' as const, label: t('labels.transferida') },
    concluida: { variant: 'outline' as const, label: t('labels.concluida') },
    cancelada: { variant: 'destructive' as const, label: t('labels.cancelada') },
  }
  const situation = situations[matricula.situacao as keyof typeof situations]

  return (
    <TableCell>
      <Badge variant={situation?.variant || 'outline'}>
        {situation?.label || matricula.situacao}
      </Badge>
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

export default function MatriculasPage() {
  const t = useTranslations('registry')

  const [matriculas, setMatriculas] = useState<Matricula[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [situacaoFilter, setSituacaoFilter] = useState('todas')
  const [anoFilter, setAnoFilter] = useState('todos')
  const [escolaFilter, setEscolaFilter] = useState('todas')

  const loadMatriculas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('matriculas')
        .select(`
          *,
          aluno:alunos(id, nome_completo, data_nascimento),
          turma:turmas(id, nome, serie, ano_letivo, escola:escolas(id, nome))
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform data to match component interface
      const formattedMatriculas = data?.map(matricula => ({
        id: matricula.id,
        aluno: {
          id: matricula.aluno?.id || '',
          nome_completo: matricula.aluno?.nome_completo || 'Aluno desconhecido',
          data_nascimento: matricula.aluno?.data_nascimento || '',
          cpf: undefined,
          sexo: undefined
        },
        turma: {
          id: matricula.turma?.id || '',
          nome: matricula.turma?.nome || 'Turma desconhecida',
          serie: matricula.turma?.serie || '',
          escola: {
            nome: matricula.turma?.escola?.nome || 'Escola desconhecida',
            tipo: undefined
          },
          professor: undefined
        },
        ano_letivo: matricula.ano_letivo,
        data_matricula: matricula.data_matricula,
        situacao: matricula.situacao,
        observacoes: matricula.observacoes || undefined,
        created_at: matricula.created_at
      })) || []

      setMatriculas(formattedMatriculas as any)
    } catch (error) {
      logger.error('Error loading matriculas', error as any)
      toast.error(t('ui.erro-ao-carregar-lista-de-matriculas'))
      setMatriculas([])
    } finally {
      setLoading(false)
    }
  }, [t])

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
      const { error } = await supabase
        .from('matriculas')
        .delete()
        .eq('id', matriculaId)

      if (error) throw error

      toast.success(`Matrícula de "${alunoNome}" cancelada com sucesso!`)
      await loadMatriculas() // Reload the list
    } catch (error: any) {
      logger.error('Error deleting matricula', error, {
        metadata: {
          errorMessage: error.message || 'Unknown error',
          errorCode: error.code || 'NO_CODE',
          errorDetails: error.details || 'No details',
          errorHint: error.hint || 'No hint',
          matriculaId,
          alunoNome
        }
      })

      // User-friendly error messages
      if (error.code === '23503') {
        toast.error(t('ui.nao-e-possivel-cancelar-esta-matricula-pois-existem-registros-de-frequen'))
      } else if (error.code === '42501' || error.message?.includes('permission')) {
        toast.error(t('ui.voce-nao-tem-permissao-para-cancelar-esta-matricula'))
      } else {
        toast.error(`Erro ao cancelar matrícula: ${error.message || 'Tente novamente.'}`)
      }
    }
  }

  const filteredMatriculas = matriculas.filter(matricula => {
    // Safe access with optional chaining to prevent undefined errors
    const alunoNome = matricula.aluno?.nome_completo || ''
    const alunoCpf = matricula.aluno?.cpf || ''
    const turmaNome = matricula.turma?.nome || ''
    const escolaNome = matricula.turma?.escola?.nome || ''

    const matchesSearch = alunoNome.toLowerCase().includes(search.toLowerCase()) ||
                         alunoCpf.includes(search) ||
                         turmaNome.toLowerCase().includes(search.toLowerCase()) ||
                         escolaNome.toLowerCase().includes(search.toLowerCase())

    const matchesSituacao = situacaoFilter === 'todas' || matricula.situacao === situacaoFilter
    const matchesAno = anoFilter === 'todos' || matricula.ano_letivo?.toString() === anoFilter
    const matchesEscola = escolaFilter === 'todas' || escolaNome === escolaFilter

    return matchesSearch && matchesSituacao && matchesAno && matchesEscola
  })

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
