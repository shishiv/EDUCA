/**
 * Step 2: Criar Diretores
 *
 * Formulário para criar diretores das escolas:
 * - Mínimo 1 diretor obrigatório
 * - Campos: nome, email, CPF, telefone
 * - Atribuir escolas que o diretor gerenciará
 * - Validação brasileira (CPF format)
 */

'use client'

import { useState } from 'react'
import { WizardStep } from './WizardStep'
import { useWizardStore, NovoUsuario } from '../_store/useWizardStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus, Trash2, UserCog, AlertCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

interface Escola {
  id: string
  nome: string
  codigo: string
  tipo: 'creche' | 'pre_escola' | 'fundamental'
}

interface Step2DiretoresProps {
  escolas: Escola[]
  onNext: () => void
  onPrevious: () => void
}

export function Step2Diretores({
  escolas,
  onNext,
  onPrevious,
}: Step2DiretoresProps) {
  const { diretores, addDiretor, removeDiretor, step2Valid } =
    useWizardStore()

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    escolas_ids: [] as string[],
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Validar CPF (algoritmo oficial)
  function validateCPF(cpf: string): boolean {
    cpf = cpf.replace(/[^\d]/g, '')
    if (cpf.length !== 11) return false
    if (/^(\d)\1+$/.test(cpf)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i)
    }
    let digit = 11 - (sum % 11)
    if (digit >= 10) digit = 0
    if (digit !== parseInt(cpf[9])) return false

    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i)
    }
    digit = 11 - (sum % 11)
    if (digit >= 10) digit = 0
    return digit === parseInt(cpf[10])
  }

  // Formatar CPF
  function formatCPF(value: string): string {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6)
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9)
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
  }

  // Formatar telefone
  function formatTelefone(value: string): string {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 6)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    if (numbers.length <= 10)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  // Validar formulário
  function validateForm(): boolean {
    const errors: Record<string, string> = {}

    if (!formData.nome.trim()) {
      errors.nome = 'Nome é obrigatório'
    } else if (formData.nome.trim().length < 3) {
      errors.nome = 'Nome deve ter pelo menos 3 caracteres'
    }

    if (!formData.email.trim()) {
      errors.email = 'Email é obrigatório'
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(
        formData.email
      )
    ) {
      errors.email = 'Email inválido'
    }

    if (!formData.cpf.trim()) {
      errors.cpf = 'CPF é obrigatório'
    } else if (!validateCPF(formData.cpf)) {
      errors.cpf = 'CPF inválido'
    }

    if (!formData.telefone.trim()) {
      errors.telefone = 'Telefone é obrigatório'
    } else if (
      !/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(formData.telefone)
    ) {
      errors.telefone = 'Telefone inválido'
    }

    if (formData.escolas_ids.length === 0) {
      errors.escolas_ids = 'Selecione pelo menos 1 escola'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Adicionar diretor
  function handleAddDiretor() {
    if (!validateForm()) return

    const novoDiretor: NovoUsuario = {
      nome: formData.nome.trim(),
      email: formData.email.trim().toLowerCase(),
      cpf: formData.cpf.replace(/\D/g, ''),
      telefone: formData.telefone.replace(/\D/g, ''),
      tipo_usuario: 'diretor',
      escolas_ids: formData.escolas_ids,
      senha_gerada: 'Fronteira@2025', // Senha padrão
    }

    addDiretor(novoDiretor)
    setFormData({
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      escolas_ids: [],
    })
    setFormErrors({})
    setShowForm(false)
  }

  // Toggle escola selection
  function toggleEscola(escolaId: string) {
    setFormData((prev) => ({
      ...prev,
      escolas_ids: prev.escolas_ids.includes(escolaId)
        ? prev.escolas_ids.filter((id) => id !== escolaId)
        : [...prev.escolas_ids, escolaId],
    }))
  }

  return (
    <WizardStep
      title="Criar Diretores Escolares"
      description="Adicione pelo menos 1 diretor e atribua as escolas que gerenciará"
      onNext={onNext}
      onPrevious={onPrevious}
      canGoNext={step2Valid}
    >
      <div className="space-y-6">
        {/* Alerta de requisito mínimo */}
        {diretores.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você precisa criar <strong>pelo menos 1 diretor</strong>{' '}
              para prosseguir.
            </AlertDescription>
          </Alert>
        )}

        {/* Lista de diretores adicionados */}
        {diretores.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <UserCog className="w-5 h-5 text-blue-600" />
              Diretores Cadastrados ({diretores.length})
            </h3>

            {diretores.map((diretor, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">
                        {diretor.nome}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {diretor.email} • CPF: {formatCPF(diretor.cpf)}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDiretor(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {diretor.escolas_ids?.map((escolaId) => {
                      const escola = escolas.find((e) => e.id === escolaId)
                      return escola ? (
                        <Badge key={escolaId} variant="secondary">
                          {escola.nome}
                        </Badge>
                      ) : null
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Botão para adicionar novo diretor */}
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Diretor
          </Button>
        )}

        {/* Formulário de novo diretor */}
        {showForm && (
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle>Novo Diretor</CardTitle>
              <CardDescription>
                Preencha os dados do diretor e selecione as escolas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Nome */}
              <div>
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Maria Silva"
                  className={formErrors.nome ? 'border-red-500' : ''}
                />
                {formErrors.nome && (
                  <p className="text-sm text-red-600 mt-1">
                    {formErrors.nome}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Ex: maria.silva@fronteira.mg.gov.br"
                  className={formErrors.email ? 'border-red-500' : ''}
                />
                {formErrors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* CPF e Telefone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cpf: formatCPF(e.target.value),
                      })
                    }
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={formErrors.cpf ? 'border-red-500' : ''}
                  />
                  {formErrors.cpf && (
                    <p className="text-sm text-red-600 mt-1">
                      {formErrors.cpf}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        telefone: formatTelefone(e.target.value),
                      })
                    }
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className={formErrors.telefone ? 'border-red-500' : ''}
                  />
                  {formErrors.telefone && (
                    <p className="text-sm text-red-600 mt-1">
                      {formErrors.telefone}
                    </p>
                  )}
                </div>
              </div>

              {/* Escolas */}
              <div>
                <Label>Escolas * (selecione pelo menos 1)</Label>
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {escolas.map((escola) => (
                    <div
                      key={escola.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`escola-${escola.id}`}
                        checked={formData.escolas_ids.includes(escola.id)}
                        onCheckedChange={() => toggleEscola(escola.id)}
                      />
                      <label
                        htmlFor={`escola-${escola.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {escola.nome}
                        <span className="text-gray-500 text-xs ml-2">
                          (INEP: {escola.codigo})
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
                {formErrors.escolas_ids && (
                  <p className="text-sm text-red-600 mt-1">
                    {formErrors.escolas_ids}
                  </p>
                )}
              </div>

              {/* Ações do formulário */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({
                      nome: '',
                      email: '',
                      cpf: '',
                      telefone: '',
                      escolas_ids: [],
                    })
                    setFormErrors({})
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddDiretor} className="flex-1">
                  Adicionar Diretor
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </WizardStep>
  )
}
