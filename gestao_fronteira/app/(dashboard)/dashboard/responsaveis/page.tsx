'use client'

import { useEffect, useState } from 'react'
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

interface Responsavel {
  id: string
  nome: string
  cpf: string
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
  const [responsaveis, setResponsaveis] = useState<ResponsavelWithAlunos[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [parentescoFilter, setParentescoFilter] = useState('todos')

  useEffect(() => {
    loadResponsaveis()
  }, [])

  const loadResponsaveis = async () => {
    try {
      setLoading(true)

      // Load responsaveis with count of linked students
      const { data: responsaveisData, error: responsaveisError } = await supabase
        .from('responsaveis')
        .select(`
          *,
          alunos (
            id,
            nome_completo
          )
        `)
        .order('nome')

      if (responsaveisError) throw responsaveisError

      // Transform data to include alunos count
      const responsaveisWithCount = (responsaveisData || []).map(resp => ({
        ...resp,
        alunos_count: resp.alunos?.length || 0
      }))

      setResponsaveis(responsaveisWithCount)
      logger.info('Responsáveis carregados:', { metadata: { count: responsaveisWithCount.length } })
    } catch (error) {
      logger.error('Erro ao carregar responsáveis:', error as any)
      toast.error('Erro ao carregar lista de responsáveis')
      setResponsaveis([])
    } finally {
      setLoading(false)
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

  const formatCPF = (cpf: string) => {
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
    const matchesSearch =
      resp.nome.toLowerCase().includes(search.toLowerCase()) ||
      resp.cpf.includes(search) ||
      resp.telefone?.includes(search) ||
      resp.email?.toLowerCase().includes(search.toLowerCase())

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
          <h1 className="text-3xl font-bold text-gray-900">Responsáveis</h1>
          <p className="text-gray-600 mt-1">
            Gerencie os responsáveis pelos alunos
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/responsaveis/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Responsável
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Responsáveis</CardDescription>
            <CardTitle className="text-3xl">{responsaveis.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Mães</CardDescription>
            <CardTitle className="text-3xl">
              {responsaveis.filter(r => r.parentesco.toLowerCase() === 'mae').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pais</CardDescription>
            <CardTitle className="text-3xl">
              {responsaveis.filter(r => r.parentesco.toLowerCase() === 'pai').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Outros</CardDescription>
            <CardTitle className="text-3xl">
              {responsaveis.filter(r => !['mae', 'pai'].includes(r.parentesco.toLowerCase())).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, CPF, telefone ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={parentescoFilter} onValueChange={setParentescoFilter}>
              <SelectTrigger id="parentesco_filter">
                <SelectValue placeholder="Filtrar por parentesco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Parentescos</SelectItem>
                <SelectItem value="mae">Mãe</SelectItem>
                <SelectItem value="pai">Pai</SelectItem>
                <SelectItem value="avo">Avó/Avô</SelectItem>
                <SelectItem value="tio">Tia/Tio</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">{filteredResponsaveis.length}</span>
              <span className="ml-1">responsáveis encontrados</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Responsável</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Parentesco</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Alunos Vinculados</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResponsaveis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    Nenhum responsável encontrado
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
                          {responsavel.alunos_count === 1 ? 'aluno' : 'alunos'}
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
