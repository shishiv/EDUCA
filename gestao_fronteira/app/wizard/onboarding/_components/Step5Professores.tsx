/**
 * Step 5: Criar Professores
 *
 * Formulário para criar professores (OBRIGATÓRIO):
 * - Mínimo 2 professores obrigatório
 * - Campos: nome, email, CPF, telefone, escola
 * - Turmas serão atribuídas depois do onboarding
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, GraduationCap, AlertCircle } from 'lucide-react'

interface Escola {
  id: string
  nome: string
  codigo: string
  tipo: 'creche' | 'pre_escola' | 'fundamental'
}

interface Step5ProfessoresProps {
  escolas: Escola[]
  onNext: () => void
  onPrevious: () => void
}

export function Step5Professores({
  escolas,
  onNext,
  onPrevious,
}: Step5ProfessoresProps) {
  const { professores, addProfessor, removeProfessor, step5Valid } =
    useWizardStore()

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    escola_id: '',
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
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)
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

    if (!formData.escola_id) {
      errors.escola_id = 'Selecione uma escola'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Adicionar professor
  function handleAddProfessor() {
    if (!validateForm()) return

    const novoProfessor: NovoUsuario = {
      nome: formData.nome.trim(),
      email: formData.email.trim().toLowerCase(),
      cpf: formData.cpf.replace(/\D/g, ''),
      telefone: formData.telefone.replace(/\D/g, ''),
      tipo_usuario: 'professor',
      escola_id: formData.escola_id,
      senha_gerada: 'Fronteira@2025',
    }

    addProfessor(novoProfessor)
    setFormData({
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      escola_id: '',
    })
    setFormErrors({})
    setShowForm(false)
  }

  return (
    <WizardStep
      title="Criar Professores"
      description="Adicione pelo menos 2 professores para as escolas"
      onNext={onNext}
      onPrevious={onPrevious}
      canGoNext={step5Valid}
    >
      <div className="space-y-6">
        {/* Alerta de requisito mínimo */}
        {professores.length < 2 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você precisa criar <strong>pelo menos 2 professores</strong>{' '}
              para prosseguir. Atualmente: {professores.length}/2
            </AlertDescription>
          </Alert>
        )}

        {/* Lista de professores adicionados */}
        {professores.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              Professores Cadastrados ({professores.length})
            </h3>

            {professores.map((professor, index) => {
              const escola = escolas.find((e) => e.id === professor.escola_id)
              return (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">
                          {professor.nome}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {professor.email} • CPF: {formatCPF(professor.cpf)}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProfessor(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {escola && (
                      <Badge variant="secondary">{escola.nome}</Badge>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Botão para adicionar novo professor */}
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Professor
          </Button>
        )}

        {/* Formulário de novo professor */}
        {showForm && (
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle>Novo Professor</CardTitle>
              <CardDescription>
                Preencha os dados do professor e selecione a escola
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
                  placeholder="Ex: João Silva"
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
                  placeholder="Ex: joao.silva@fronteira.mg.gov.br"
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

              {/* Escola */}
              <div>
                <Label htmlFor="escola">Escola *</Label>
                <Select
                  value={formData.escola_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, escola_id: value })
                  }
                >
                  <SelectTrigger
                    className={formErrors.escola_id ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Selecione uma escola" />
                  </SelectTrigger>
                  <SelectContent>
                    {escolas.map((escola) => (
                      <SelectItem key={escola.id} value={escola.id}>
                        {escola.nome} (INEP: {escola.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.escola_id && (
                  <p className="text-sm text-red-600 mt-1">
                    {formErrors.escola_id}
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
                      escola_id: '',
                    })
                    setFormErrors({})
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddProfessor} className="flex-1">
                  Adicionar Professor
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </WizardStep>
  )
}
