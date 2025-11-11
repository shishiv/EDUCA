'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { ArrowLeft, Save, User, Phone, Mail, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export default function NovoResponsavelPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    parentesco: '',
    endereco: '',
    profissao: '',
  })

  const validateCPF = (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '')

    if (cleaned.length !== 11) return false

    // Check for known invalid CPFs
    if (/^(\d)\1{10}$/.test(cleaned)) return false

    // Validate first check digit
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned.charAt(i)) * (10 - i)
    }
    let checkDigit = 11 - (sum % 11)
    if (checkDigit >= 10) checkDigit = 0
    if (checkDigit !== parseInt(cleaned.charAt(9))) return false

    // Validate second check digit
    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned.charAt(i)) * (11 - i)
    }
    checkDigit = 11 - (sum % 11)
    if (checkDigit >= 10) checkDigit = 0
    if (checkDigit !== parseInt(cleaned.charAt(10))) return false

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.nome || !formData.cpf || !formData.parentesco) {
        toast.error('Preencha todos os campos obrigatórios')
        setLoading(false)
        return
      }

      // Validate CPF
      const cleanedCPF = formData.cpf.replace(/\D/g, '')
      if (!validateCPF(cleanedCPF)) {
        toast.error('CPF inválido. Verifique os dados inseridos.')
        setLoading(false)
        return
      }

      // Prepare data
      const responsavelData = {
        nome: formData.nome,
        cpf: cleanedCPF,
        telefone: formData.telefone ? formData.telefone.replace(/\D/g, '') : null,
        email: formData.email || null,
        parentesco: formData.parentesco,
        endereco: formData.endereco || null,
        profissao: formData.profissao || null,
      }

      // Insert into database
      const { data, error } = await supabase
        .from('responsaveis')
        .insert([responsavelData])
        .select()
        .single()

      if (error) {
        if (error.message.includes('duplicate') || error.code === '23505') {
          toast.error('CPF já cadastrado no sistema')
        } else {
          throw error
        }
        setLoading(false)
        return
      }

      logger.info('Responsável cadastrado:', { metadata: data })
      toast.success('Responsável cadastrado com sucesso!')
      router.push('/dashboard/responsaveis')
    } catch (error: any) {
      logger.error('Erro ao cadastrar responsável:', error)

      let errorMessage = 'Erro ao cadastrar responsável'
      if (error.message?.includes('duplicate')) {
        errorMessage = 'CPF já cadastrado no sistema'
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1')
  }

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4,5})(\d{4})/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1')
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/responsaveis">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Responsável</h1>
          <p className="text-gray-600 mt-1">
            Cadastre um novo responsável no sistema
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Data */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>Dados Pessoais</CardTitle>
            </div>
            <CardDescription>
              Informações básicas do responsável
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nome">
                  Nome Completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="Nome completo do responsável"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cpf">
                  CPF <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleInputChange('cpf', formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </div>

              <div>
                <Label htmlFor="parentesco">
                  Parentesco <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.parentesco}
                  onValueChange={(value) => handleInputChange('parentesco', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o parentesco" />
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
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-green-600" />
              <CardTitle>Dados de Contato</CardTitle>
            </div>
            <CardDescription>
              Informações para comunicação com o responsável
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Telefone para contato (celular ou fixo)
                </p>
              </div>

              <div>
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@exemplo.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-purple-600" />
              <CardTitle>Informações Adicionais</CardTitle>
            </div>
            <CardDescription>
              Dados complementares do responsável
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="profissao">Profissão</Label>
                <Input
                  id="profissao"
                  value={formData.profissao}
                  onChange={(e) => handleInputChange('profissao', e.target.value)}
                  placeholder="Profissão do responsável"
                />
              </div>

              <div className="md:col-span-1">
                {/* Empty space for grid alignment */}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="endereco">Endereço Completo</Label>
                <Textarea
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  placeholder="Rua, número, bairro, cidade, CEP..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/responsaveis')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Salvando...' : 'Salvar Responsável'}
          </Button>
        </div>
      </form>
    </div>
  )
}
