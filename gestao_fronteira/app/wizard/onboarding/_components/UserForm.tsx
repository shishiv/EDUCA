/**
 * UserForm - Componente reutilizável para criar usuários
 *
 * Usado em Steps 3, 4 e 5 para evitar duplicação de código
 * Campos: nome, email, CPF, telefone + seleções específicas
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

interface UserFormProps {
  title: string
  description: string
  onSubmit: (data: UserFormData) => void
  onCancel: () => void
  selectionLabel?: string
  selectionOptions?: { id: string; label: string }[]
  multiSelect?: boolean
}

export interface UserFormData {
  nome: string
  email: string
  cpf: string
  telefone: string
  selected_ids?: string[]
}

export function UserForm({
  title,
  description,
  onSubmit,
  onCancel,
  selectionLabel,
  selectionOptions = [],
  multiSelect = true,
}: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    selected_ids: [],
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
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
  }

  // Formatar telefone
  function formatTelefone(value: string): string {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
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
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      errors.email = 'Email inválido'
    }

    if (!formData.cpf.trim()) {
      errors.cpf = 'CPF é obrigatório'
    } else if (!validateCPF(formData.cpf)) {
      errors.cpf = 'CPF inválido'
    }

    if (!formData.telefone.trim()) {
      errors.telefone = 'Telefone é obrigatório'
    } else if (!/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(formData.telefone)) {
      errors.telefone = 'Telefone inválido'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Toggle selection
  function toggleSelection(id: string) {
    if (!multiSelect) {
      setFormData((prev) => ({ ...prev, selected_ids: [id] }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      selected_ids: prev.selected_ids?.includes(id)
        ? prev.selected_ids.filter((selectedId) => selectedId !== id)
        : [...(prev.selected_ids || []), id],
    }))
  }

  // Submit
  function handleSubmit() {
    if (!validateForm()) return
    onSubmit(formData)
  }

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="bg-blue-50">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Nome */}
        <div>
          <Label htmlFor="nome">Nome Completo *</Label>
          <Input
            id="nome"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: Maria Silva"
            className={formErrors.nome ? 'border-red-500' : ''}
          />
          {formErrors.nome && <p className="text-sm text-red-600 mt-1">{formErrors.nome}</p>}
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Ex: maria.silva@fronteira.mg.gov.br"
            className={formErrors.email ? 'border-red-500' : ''}
          />
          {formErrors.email && <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>}
        </div>

        {/* CPF e Telefone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
              placeholder="000.000.000-00"
              maxLength={14}
              className={formErrors.cpf ? 'border-red-500' : ''}
            />
            {formErrors.cpf && <p className="text-sm text-red-600 mt-1">{formErrors.cpf}</p>}
          </div>

          <div>
            <Label htmlFor="telefone">Telefone *</Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })}
              placeholder="(00) 00000-0000"
              maxLength={15}
              className={formErrors.telefone ? 'border-red-500' : ''}
            />
            {formErrors.telefone && <p className="text-sm text-red-600 mt-1">{formErrors.telefone}</p>}
          </div>
        </div>

        {/* Seleções customizadas (escolas, professores, turmas) */}
        {selectionLabel && selectionOptions.length > 0 && (
          <div>
            <Label>{selectionLabel} {!multiSelect && '(selecione 1)'}</Label>
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {selectionOptions.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`option-${option.id}`}
                    checked={formData.selected_ids?.includes(option.id)}
                    onCheckedChange={() => toggleSelection(option.id)}
                  />
                  <label
                    htmlFor={`option-${option.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
