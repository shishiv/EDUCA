/**
 * Step 4: Criar Secretários
 *
 * Formulário para criar secretários (OPCIONAL):
 * - Não há mínimo obrigatório (skip permitido)
 * - Campos: nome, email, CPF, telefone
 * - Atribuir escolas que atenderão
 */

'use client'

import { useState } from 'react'
import { WizardStep } from './WizardStep'
import { useWizardStore, NovoUsuario } from '../_store/useWizardStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus, Trash2, UserCog, Info } from 'lucide-react'
import { UserForm, UserFormData } from './UserForm'

interface Escola {
  id: string
  nome: string
  codigo: string
  tipo: 'creche' | 'pre_escola' | 'fundamental'
}

interface Step4SecretariosProps {
  escolas: Escola[]
  onNext: () => void
  onPrevious: () => void
}

export function Step4Secretarios({
  escolas,
  onNext,
  onPrevious,
}: Step4SecretariosProps) {
  const { secretarios, addSecretario, removeSecretario } = useWizardStore()

  const [showForm, setShowForm] = useState(false)

  // Adicionar secretário
  function handleAddSecretario(data: UserFormData) {
    const novoSecretario: NovoUsuario = {
      nome: data.nome.trim(),
      email: data.email.trim().toLowerCase(),
      cpf: data.cpf.replace(/\D/g, ''),
      telefone: data.telefone.replace(/\D/g, ''),
      tipo_usuario: 'secretario',
      escolas_ids: data.selected_ids || [],
      senha_gerada: 'Fronteira@2025',
    }

    addSecretario(novoSecretario)
    setShowForm(false)
  }

  // Formatar CPF para exibição
  function formatCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  // Preparar opções de escolas para o formulário
  const escolaOptions = escolas.map((escola) => ({
    id: escola.id,
    label: `${escola.nome} (INEP: ${escola.codigo})`,
  }))

  return (
    <WizardStep
      title="Criar Secretários Escolares"
      description="Adicione secretários para atendimento nas escolas (opcional - você pode pular esta etapa)"
      onNext={onNext}
      onPrevious={onPrevious}
      canGoNext={true} // Sempre pode avançar (step opcional)
      showSkip={true}
      onSkip={onNext}
    >
      <div className="space-y-6">
        {/* Alerta informativo */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Step Opcional:</strong> Secretários auxiliam no
            atendimento administrativo das escolas. Você pode criar
            secretários agora ou pular esta etapa.
          </AlertDescription>
        </Alert>

        {/* Lista de secretários adicionados */}
        {secretarios.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <UserCog className="w-5 h-5 text-green-600" />
              Secretários Cadastrados ({secretarios.length})
            </h3>

            {secretarios.map((secretario, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">
                        {secretario.nome}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {secretario.email} • CPF: {formatCPF(secretario.cpf)}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSecretario(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">
                      Escolas atendidas:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {secretario.escolas_ids?.map((escolaId) => {
                        const escola = escolas.find((e) => e.id === escolaId)
                        return escola ? (
                          <Badge key={escolaId} variant="secondary">
                            {escola.nome}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Mensagem quando não há secretários */}
        {secretarios.length === 0 && !showForm && (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
            <UserCog className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">
              Nenhum secretário escolar cadastrado
            </p>
            <p className="text-sm text-gray-500">
              Você pode adicionar secretários ou pular esta etapa
            </p>
          </div>
        )}

        {/* Botão para adicionar novo secretário */}
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Secretário
          </Button>
        )}

        {/* Formulário de novo secretário */}
        {showForm && (
          <UserForm
            title="Novo Secretário Escolar"
            description="Preencha os dados do secretário e selecione as escolas"
            onSubmit={handleAddSecretario}
            onCancel={() => setShowForm(false)}
            selectionLabel="Escolas Atendidas"
            selectionOptions={escolaOptions}
            multiSelect={true}
          />
        )}
      </div>
    </WizardStep>
  )
}
