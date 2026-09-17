'use client'
import { useTranslations } from 'next-intl'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { schoolsApi } from '@/lib/api/schools'
import { schoolFormSchema } from '@/lib/validation/brazilian'
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
import { Plus, Eye, Edit, Trash2, School, Users, MapPin, Phone, Download, CheckCircle, BookOpen, Search as SearchIcon } from 'lucide-react'
import { StatsBar } from '@/components/dashboard'
import { InlineFilters } from '@/components/filters'
import { TableEmptyState } from '@/components/ui/table-empty-state'
import { toast } from 'sonner'

interface Escola {
  id: string
  nome: string
  codigo: string
  endereco: string | null
  telefone: string | null
  tipo: 'creche' | 'pre_escola' | 'fundamental'
  diretor: {
    nome: string
    email: string
  }
  estatisticas: {
    totalAlunos: number
    totalTurmas: number
    totalProfessores: number
    capacidadeTotal: number
  }
  ativo: boolean | null
  created_at: string | null
}

function matchesSchool(escola: Escola, search: string, tipo: string, status: string) {
  const query = search.toLowerCase()
  const textMatch = [escola.nome, escola.codigo, escola.diretor.nome].some(value => value.toLowerCase().includes(query))
  const statusMatch = status === 'todos' || (status === 'ativo' && escola.ativo) || (status === 'inativo' && !escola.ativo)
  return textMatch && (tipo === 'todos' || escola.tipo === tipo) && statusMatch
}

type SchoolRecord = Awaited<ReturnType<typeof schoolsApi.getSchoolsWithDetails>>[number]
function toSchoolListItem(school: SchoolRecord): Escola {
  const counts = school._count ?? { students: 0, classes: 0, teachers: 0 }
  const diretor = { nome: school.diretor?.nome ?? 'Sem diretor atribuído', email: school.diretor?.email ?? '' }
  return { id: school.id, nome: school.nome, codigo: school.codigo, endereco: school.endereco, telefone: school.telefone || '', tipo: schoolFormSchema.shape.tipo.parse(school.tipo), diretor, estatisticas: { totalAlunos: counts.students || 0, totalTurmas: counts.classes || 0, totalProfessores: counts.teachers || 0, capacidadeTotal: school.turmas.reduce((total, turma) => total + (turma.capacidade ?? 0), 0) }, ativo: school.ativo, created_at: school.created_at }
}

function SchoolEmptyState({ hasFilters, t, onClear }: { hasFilters: boolean; t: ReturnType<typeof useTranslations>; onClear: () => void }) {
  return <TableEmptyState colSpan={7} icon={hasFilters ? SearchIcon : School} title={hasFilters ? t('ui.nenhuma-escola-encontrada') : t('ui.nenhuma-escola-cadastrada')} description={hasFilters ? t('ui.tente-ajustar-os-filtros-para-encontrar-o-que-procura') : t('ui.comece-adicionando-a-primeira-escola-da-rede')} actions={hasFilters ? [{ label: 'Limpar filtros', variant: 'outline', onClick: onClear }] : [{ label: t('labels.nova-escola'), href: '/dashboard/escolas/nova', icon: Plus }]} />
}


export default function EscolasPage() {
  const t = useTranslations('registry')
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')

  const loadEscolas = useCallback(async () => {
    setLoading(true)
    try {
      const schoolsData = await schoolsApi.getSchoolsWithDetails({ activeOnly: false })

      const formattedSchools = schoolsData.map(toSchoolListItem)

      setEscolas(formattedSchools)
    } catch {
      toast.error(t('ui.erro-ao-carregar-lista-de-escolas-verifique-a-conexao'))

      setEscolas([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadEscolas()
  }, [loadEscolas])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getTipoLabel = (tipo: Escola['tipo']) => {
    const tipos = {
      creche: 'Creche',
      pre_escola: 'Pré-Escola',
      fundamental: 'Ensino Fundamental'
    }
    return tipos[tipo]
  }

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'creche': return 'default'
      case 'pre_escola': return 'secondary'
      case 'fundamental': return 'outline'
      default: return 'outline'
    }
  }

  const getOcupacaoPercentual = (escola: Escola) => {
    if (escola.estatisticas.capacidadeTotal === 0) return 0
    return Math.round((escola.estatisticas.totalAlunos / escola.estatisticas.capacidadeTotal) * 100)
  }

  const getOcupacaoColor = (percentual: number) => {
    if (percentual >= 90) return 'text-red-600'
    if (percentual >= 75) return 'text-orange-600'
    return 'text-green-600'
  }

  const filteredEscolas = escolas.filter(escola => matchesSchool(escola, search, tipoFilter, statusFilter))
  const hasFilters = Boolean(search || tipoFilter !== 'todos' || statusFilter !== 'todos')

  const totalEscolas = escolas.length
  const escolasAtivas = escolas.filter(e => e.ativo).length
  const totalAlunos = escolas.reduce((sum, e) => sum + e.estatisticas.totalAlunos, 0)
  const totalTurmas = escolas.reduce((sum, e) => sum + e.estatisticas.totalTurmas, 0)

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
          <h1 className="text-3xl font-bold text-gray-900">{t('labels.escolas')}</h1>
          <p className="text-gray-600 mt-1">
            {t('ui.gerencie-as-unidades-escolares-da-rede-municipal')}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            {t('labels.exportar')}
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/escolas/nova">
              <Plus className="h-4 w-4" />
              {t('labels.nova-escola')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Estatísticas compactas */}
      <StatsBar
        stats={[
          { label: t('labels.total'), value: totalEscolas, icon: School },
          { label: t('labels.ativas'), value: escolasAtivas, icon: CheckCircle, variant: 'success' },
          { label: 'Alunos', value: totalAlunos, icon: Users, variant: 'info' },
          { label: t('labels.turmas'), value: totalTurmas, icon: BookOpen, variant: 'warning' },
        ]}
      />

      {/* Lista de Escolas */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg">{t('ui.escolas')}{filteredEscolas.length})</CardTitle>
          </div>
          <InlineFilters
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Buscar por nome, código ou diretor...',
            }}
            filters={[
              {
                id: 'tipo',
                placeholder: t('labels.tipo'),
                value: tipoFilter,
                options: [
                  { value: 'todos', label: 'Todos os tipos' },
                  { value: 'creche', label: 'Creche' },
                  { value: 'pre_escola', label: 'Pré-Escola' },
                  { value: 'fundamental', label: 'Ensino Fundamental' },
                ],
                onChange: setTipoFilter,
                width: 'w-full sm:w-48',
              },
              {
                id: 'status',
                placeholder: t('labels.status'),
                value: statusFilter,
                options: [
                  { value: 'todos', label: t('labels.todos') },
                  { value: 'ativo', label: t('labels.ativas') },
                  { value: 'inativo', label: 'Inativas' },
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
            <Table className="responsive-stack-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('labels.escola')}</TableHead>
                  <TableHead>{t('labels.diretor')}</TableHead>
                  <TableHead>{t('labels.tipo')}</TableHead>
                  <TableHead>{t('labels.ocupacao')}</TableHead>
                  <TableHead>{t('labels.contato')}</TableHead>
                  <TableHead>{t('labels.status')}</TableHead>
                  <TableHead className="text-right">{t('labels.acoes')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEscolas.map((escola) => {
                  const ocupacaoPercentual = getOcupacaoPercentual(escola)
                  return (
                    <TableRow key={escola.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <School className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{escola.nome}</div>
                            <div className="text-sm text-gray-500">
                              {t('ui.codigo')} {escola.codigo}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(escola.diretor.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{escola.diretor.nome}</div>
                            <div className="text-xs text-gray-500">{escola.diretor.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTipoBadgeVariant(escola.tipo)}>
                          {getTipoLabel(escola.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {escola.estatisticas.totalAlunos}/{escola.estatisticas.capacidadeTotal}
                            </span>
                          </div>
                          <div className={`text-xs font-medium ${getOcupacaoColor(ocupacaoPercentual)}`}>
                            {ocupacaoPercentual}{t('ui.ocupacao')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{escola.telefone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-500 truncate max-w-32">
                              {escola.endereco?.split(' - ')[0] || 'Endereço não informado'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={escola.ativo ? 'default' : 'secondary'}>
                          {escola.ativo ? t('labels.ativa') : t('ui.inativa')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/escolas/${escola.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/escolas/${escola.id}/editar`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredEscolas.length === 0 && <SchoolEmptyState hasFilters={hasFilters} t={t} onClear={() => { setSearch(''); setTipoFilter('todos'); setStatusFilter('todos') }} />}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
