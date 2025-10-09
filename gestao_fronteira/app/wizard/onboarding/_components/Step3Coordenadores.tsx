/**
 * Step 3: Criar Coordenadores Pedagógicos
 *
 * Formulário para criar coordenadores (OPCIONAL):
 * - Não há mínimo obrigatório (skip permitido)
 * - Campos: nome, email, CPF, telefone
 * - Vincular professores que supervisionam (opcional neste step)
 * - Nota: Professores serão criados no Step 5
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

interface Step3CoordenadoresProps {
  onNext: () => void
  onPrevious: () => void
}

export function Step3Coordenadores({
  onNext,
  onPrevious,
}: Step3CoordenadoresProps) {
  const { coordenadores, addCoordenador, removeCoordenador, professores } =
    useWizardStore()

  const [showForm, setShowForm] = useState(false)

  // Adicionar coordenador
  function handleAddCoordenador(data: UserFormData) {
    const novoCoordenador: NovoUsuario = {
      nome: data.nome.trim(),
      email: data.email.trim().toLowerCase(),
      cpf: data.cpf.replace(/\D/g, ''),
      telefone: data.telefone.replace(/\D/g, ''),
      tipo_usuario: 'coordenador_pedagogico',
      professores_ids: data.selected_ids || [],
      senha_gerada: 'Fronteira@2025',
    }

    addCoordenador(novoCoordenador)
    setShowForm(false)
  }

  // Formatar CPF para exibição
  function formatCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  // Preparar opções de professores para o formulário
  const professorOptions = professores.map((prof) => ({
    id: prof.cpf, // Usar CPF como ID temporário até criar no banco
    label: prof.nome,
  }))

  return (
    <WizardStep
      title="Criar Coordenadores Pedagógicos"
      description="Adicione coordenadores pedagógicos (opcional - você pode pular esta etapa)"
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
            <strong>Step Opcional:</strong> Coordenadores pedagógicos
            acompanham o trabalho dos professores. Você pode criar
            coordenadores agora ou pular esta etapa.
            {professores.length === 0 && (
              <span className="block mt-2 text-sm">
                💡 <strong>Dica:</strong> Você ainda não criou professores.
                Pode vincular professores aos coordenadores no final (Step
                6: Revisão).
              </span>
            )}
          </AlertDescription>
        </Alert>

        {/* Lista de coordenadores adicionados */}
        {coordenadores.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <UserCog className="w-5 h-5 text-purple-600" />
              Coordenadores Cadastrados ({coordenadores.length})
            </h3>

            {coordenadores.map((coordenador, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">
                        {coordenador.nome}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {coordenador.email} • CPF: {formatCPF(coordenador.cpf)}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCoordenador(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">
                      Professores supervisionados:
                    </p>
                    {coordenador.professores_ids &&
                    coordenador.professores_ids.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {coordenador.professores_ids.map((profCpf) => {
                          const prof = professores.find(
                            (p) => p.cpf === profCpf
                          )
                          return prof ? (
                            <Badge key={profCpf} variant="secondary">
                              {prof.nome}
                            </Badge>
                          ) : null
                        })}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        Nenhum professor vinculado
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Mensagem quando não há coordenadores */}
        {coordenadores.length === 0 && !showForm && (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
            <UserCog className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">
              Nenhum coordenador pedagógico cadastrado
            </p>
            <p className="text-sm text-gray-500">
              Você pode adicionar coordenadores ou pular esta etapa
            </p>
          </div>
        )}

        {/* Botão para adicionar novo coordenador */}
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Coordenador Pedagógico
          </Button>
        )}

        {/* Formulário de novo coordenador */}
        {showForm && (
          <UserForm
            title="Novo Coordenador Pedagógico"
            description="Preencha os dados do coordenador e vincule professores (opcional)"
            onSubmit={handleAddCoordenador}
            onCancel={() => setShowForm(false)}
            selectionLabel="Professores Supervisionados (opcional)"
            selectionOptions={professorOptions}
            multiSelect={true}
          />
        )}
      </div>
    </WizardStep>
  )
}
