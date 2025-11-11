'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
import { ArrowLeft, Save, Edit, User, Phone, Mail, Briefcase, Users } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
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
}

interface Aluno {
  id: string
  nome_completo: string
  data_nascimento: string
  sexo: string
  ativo: boolean | null
  matriculas?: Array<{
    situacao: string
    turmas: {
      nome: string
      escola_id: string
      escolas: {
        nome: string
      }
    }
  }>
}

export default function ResponsavelDetalhesPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [responsavel, setResponsavel] = useState<Responsavel | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    parentesco: '',
    endereco: '',
    profissao: '',
  })

  useEffect(() => {
    if (id) {
      loadResponsavel()
    }
  }, [id])

  const loadResponsavel = async () => {
    try {
      setLoading(true)

      // Load responsavel data
      const { data: respData, error: respError } = await supabase
        .from('responsaveis')
        .select('*')
        .eq('id', id)
        .single()

      if (respError) throw respError

      setResponsavel(respData)
      setFormData({
        nome: respData.nome,
        cpf: respData.cpf,
        telefone: respData.telefone || '',
        email: respData.email || '',
        parentesco: respData.parentesco,
        endereco: respData.endereco || '',
        profissao: respData.profissao || '',
      })

      // Load linked students
      const { data: alunosData, error: alunosError } = await supabase
        .from('alunos')
        .select(`
          id,
          nome_completo,
          data_nascimento,
          sexo,
          ativo,
          matriculas (
            situacao,
            turmas (
              nome,
              escola_id,
              escolas (nome)
            )
          )
        `)
        .eq('responsavel_id', id)
        .order('nome_completo')

      if (alunosError) throw alunosError

      setAlunos(alunosData || [])

      logger.info('Responsável e alunos carregados:', {
        metadata: {
          responsavel: respData.nome,
          alunos: alunosData?.length || 0
        }
      })
    } catch (error) {
      logger.error('Erro ao carregar responsável:', error as any)
      toast.error('Erro ao carregar dados do responsável')
      router.push('/dashboard/responsaveis')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Validate required fields
      if (!formData.nome || !formData.cpf || !formData.parentesco) {
        toast.error('Preencha todos os campos obrigatórios')
        setSaving(false)
        return
      }

      // Prepare update data
      const updateData = {
        nome: formData.nome,
        telefone: formData.telefone ? formData.telefone.replace(/\D/g, '') : null,
        email: formData.email || null,
        parentesco: formData.parentesco,
        endereco: formData.endereco || null,
        profissao: formData.profissao || null,
      }

      // Update in database
      const { error } = await supabase
        .from('responsaveis')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      toast.success('Responsável atualizado com sucesso!')
      setEditMode(false)
      await loadResponsavel() // Reload data
    } catch (error: any) {
      logger.error('Erro ao atualizar responsável:', error)
      toast.error('Erro ao atualizar responsável')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const formatCPF = (cpf: string) => {
    if (!cpf) return '-'
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatPhone = (phone: string | null) => {
    if (!phone) return '-'
    const cleaned = phone.replace(/\D/g, '')

    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }

    return phone
  }

  const formatPhoneInput = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4,5})(\d{4})/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1')
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    return age
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!responsavel) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Responsável não encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/responsaveis">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {responsavel.nome}
            </h1>
            <p className="text-gray-600 mt-1">
              Detalhes do responsável
            </p>
          </div>
        </div>
        {!editMode ? (
          <Button onClick={() => setEditMode(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditMode(false)
                setFormData({
                  nome: responsavel.nome,
                  cpf: responsavel.cpf,
                  telefone: responsavel.telefone || '',
                  email: responsavel.email || '',
                  parentesco: responsavel.parentesco,
                  endereco: responsavel.endereco || '',
                  profissao: responsavel.profissao || '',
                })
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        )}
      </div>

      {/* Personal Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-blue-600" />
            <CardTitle>Dados Pessoais</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={formatCPF(formData.cpf)} disabled />
                <p className="text-xs text-gray-500 mt-1">CPF não pode ser alterado</p>
              </div>
              <div>
                <Label htmlFor="parentesco">Parentesco</Label>
                <Select
                  value={formData.parentesco}
                  onValueChange={(value) => handleInputChange('parentesco', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mae">Mãe</SelectItem>
                    <SelectItem value="Pai">Pai</SelectItem>
                    <SelectItem value="Avo">Avó/Avô</SelectItem>
                    <SelectItem value="Tio">Tia/Tio</SelectItem>
                    <SelectItem value="Irmao">Irmão/Irmã</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Nome Completo</p>
                <p className="text-lg font-medium">{responsavel.nome}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">CPF</p>
                <p className="text-lg font-mono">{formatCPF(responsavel.cpf)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Parentesco</p>
                <Badge className={getParentescoBadgeColor(responsavel.parentesco)}>
                  {responsavel.parentesco}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Profissão</p>
                <p className="text-lg font-medium">{responsavel.profissao || '-'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Phone className="h-5 w-5 text-green-600" />
            <CardTitle>Dados de Contato</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', formatPhoneInput(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="endereco">Endereço Completo</Label>
                <Textarea
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Telefone</p>
                <p className="text-lg font-medium">{formatPhone(responsavel.telefone)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">E-mail</p>
                <p className="text-lg font-medium">{responsavel.email || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Endereço</p>
                <p className="text-lg font-medium">{responsavel.endereco || '-'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Students */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <CardTitle>Alunos Vinculados</CardTitle>
            </div>
            <Badge variant="secondary">{alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}</Badge>
          </div>
          <CardDescription>
            Alunos sob responsabilidade de {responsavel.nome.split(' ')[0]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alunos.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Nenhum aluno vinculado a este responsável
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Escola Atual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alunos.map((aluno) => {
                  const matriculaAtiva = aluno.matriculas?.find(m => m.situacao === 'ativa')
                  return (
                    <TableRow key={aluno.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                              {getInitials(aluno.nome_completo)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{aluno.nome_completo}</span>
                        </div>
                      </TableCell>
                      <TableCell>{calculateAge(aluno.data_nascimento)} anos</TableCell>
                      <TableCell>{aluno.sexo === 'M' ? 'Masculino' : 'Feminino'}</TableCell>
                      <TableCell>
                        {matriculaAtiva?.turmas?.escolas?.nome || '-'}
                      </TableCell>
                      <TableCell>
                        {aluno.ativo ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/alunos/${aluno.id}`}>
                            Ver Detalhes
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
