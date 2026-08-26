'use client'
import { useTranslations } from 'next-intl'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
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
import { Plus, Search, Eye, Edit, Phone, Mail, User } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { getAuthorizedGuardianProfiles } from '@/lib/sensitive-family-access'

interface Responsavel {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  email: string | null
  parentesco: string
  endereco: string | null
  profissao: string | null
  created_at: string | null
  data_nascimento: string | null
  escolaridade: string | null
  estado_civil: string | null
  nacionalidade: string | null
  rg: string | null
  orgao_emissor_rg: string | null
  renda_familiar: number | null
  ativo: boolean
  lgpd_consentimento: boolean
  lgpd_data_consentimento: string | null
}

interface ResponsavelWithAlunos extends Responsavel {
  alunos_count?: number
  alunos?: Array<{
    id: string
    nome_completo: string
  }>
}

export default function ResponsaveisPage() {
  const t = useTranslations('registry')
  const [responsaveis, setResponsaveis] = useState<ResponsavelWithAlunos[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [parentescoFilter, setParentescoFilter] = useState('todos')

  const loadResponsaveis = useCallback(async () => {
    try {
      setLoading(true)

      const responsaveisData = await getAuthorizedGuardianProfiles(supabase)
      const { data: alunosData, error: alunosError } = await supabase
        .from('alunos')
        .select('id,nome_completo,responsavel_id')
      if (alunosError) throw alunosError

      const responsaveisWithCount = responsaveisData.map(resp => ({
        ...resp,
        alunos: (alunosData ?? []).filter(aluno => aluno.responsavel_id === resp.id),
        alunos_count: (alunosData ?? []).filter(aluno => aluno.responsavel_id === resp.id).length,
      }))

      setResponsaveis(responsaveisWithCount)
      logger.info('Responsáveis carregados:', { metadata: { count: responsaveisWithCount.length } })
    } catch (error) {
      logger.error('Erro ao carregar responsáveis:', error as any)
      toast.error(t('ui.erro-ao-carregar-lista-de-responsaveis'))
      setResponsaveis([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadResponsaveis()
  }, [loadResponsaveis])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return '-'
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatPhone = (phone: string | null) => {
    if (!phone) return '-'
    // Remove non-digits
    const cleaned = phone.replace(/\D/g, '')

    // Format based on length
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }

    return phone
  }

  const getParentescoBadgeColor = (parentesco: string) => {
    const colors: Record<string, string> = {
      'mae': 'bg-pink-100 text-pink-800',
      'pai': 'bg-blue-100 text-blue-800',
      'avo': 'bg-purple-100 text-purple-800',
      'tio': 'bg-green-100 text-green-800',
      'outro': 'bg-gray-100 text-gray-800'
    }
    return colors[parentesco.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  const filteredResponsaveis = responsaveis.filter(resp => {
    const normalizedSearch = search.toLowerCase()
    const matchesSearch =
      resp.nome.toLowerCase().includes(normalizedSearch) ||
      (resp.cpf ?? '').includes(search) ||
      (resp.telefone ?? '').includes(search) ||
      (resp.email ?? '').toLowerCase().includes(normalizedSearch)

    const matchesParentesco =
      parentescoFilter === 'todos' ||
      resp.parentesco.toLowerCase() === parentescoFilter.toLowerCase()

    return matchesSearch && matchesParentesco
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('labels.responsaveis')}</h1>
          <p className="text-gray-600 mt-1">
            {t('ui.gerencie-os-responsaveis-pelos-alunos')}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/responsaveis/novo">
            <Plus className="mr-2 h-4 w-4" />
            {t('labels.novo-responsavel')}
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('labels.total-de-responsaveis')}</CardDescription>
            <CardTitle className="text-3xl">{responsaveis.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('labels.maes')}</CardDescription>
            <CardTitle className="text-3xl">
              {responsaveis.filter(r => r.parentesco.toLowerCase() === 'mae').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('labels.pais')}</CardDescription>
            <CardTitle className="text-3xl">
              {responsaveis.filter(r => r.parentesco.toLowerCase() === 'pai').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('labels.outros')}</CardDescription>
            <CardTitle className="text-3xl">
              {responsaveis.filter(r => !['mae', 'pai'].includes(r.parentesco.toLowerCase())).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('labels.filtros-e-busca')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t('labels.buscar-por-nome-cpf-telefone-ou-e-mail')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={parentescoFilter} onValueChange={setParentescoFilter}>
              <SelectTrigger id="parentesco_filter">
                <SelectValue placeholder={t('labels.filtrar-por-parentesco')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{t('labels.todos-os-parentescos')}</SelectItem>
                <SelectItem value="mae">{t('labels.mae')}</SelectItem>
                <SelectItem value="pai">{t('labels.pai')}</SelectItem>
                <SelectItem value="avo">{t('labels.avo-avo')}</SelectItem>
                <SelectItem value="tio">{t('labels.tia-tio')}</SelectItem>
                <SelectItem value="outro">{t('labels.outro')}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">{filteredResponsaveis.length}</span>
              <span className="ml-1">{t('labels.responsaveis-encontrados')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table className="responsive-stack-table">
            <TableHeader>
              <TableRow>
                <TableHead>{t('labels.responsavel')}</TableHead>
                <TableHead>{t('labels.cpf')}</TableHead>
                <TableHead>{t('labels.parentesco')}</TableHead>
                <TableHead>{t('labels.contato')}</TableHead>
                <TableHead>{t('labels.alunos-vinculados')}</TableHead>
                <TableHead className="text-right">{t('labels.acoes')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResponsaveis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    {t('ui.nenhum-responsavel-encontrado')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredResponsaveis.map((responsavel) => (
                  <TableRow key={responsavel.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                            {getInitials(responsavel.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">
                            {responsavel.nome}
                          </div>
                          {responsavel.profissao && (
                            <div className="text-sm text-gray-500">
                              {responsavel.profissao}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm">{formatCPF(responsavel.cpf)}</code>
                    </TableCell>
                    <TableCell>
                      <Badge className={getParentescoBadgeColor(responsavel.parentesco)}>
                        {responsavel.parentesco}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {responsavel.telefone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3 w-3 mr-1" />
                            {formatPhone(responsavel.telefone)}
                          </div>
                        )}
                        {responsavel.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3 w-3 mr-1" />
                            {responsavel.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{responsavel.alunos_count || 0}</span>
                        <span className="text-sm text-gray-500">
                          {responsavel.alunos_count === 1 ? t('ui.aluno') : t('ui.alunos-258311')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/responsaveis/${responsavel.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/responsaveis/${responsavel.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
