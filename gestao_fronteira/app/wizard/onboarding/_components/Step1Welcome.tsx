/**
 * Step 1: Welcome
 *
 * Tela de boas-vindas do wizard que:
 * - Explica o propósito do wizard
 * - Exibe as 9 escolas cadastradas
 * - Orienta sobre os próximos passos
 */

'use client'

import { WizardStep } from './WizardStep'
import { School, Users, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Escola {
  id: string
  nome: string
  codigo: string
  tipo: 'creche' | 'pre_escola' | 'fundamental'
}

interface Step1WelcomeProps {
  escolas: Escola[]
  onNext: () => void
}

const TIPO_LABELS: Record<string, string> = {
  creche: 'Creche',
  pre_escola: 'Pré-escola',
  fundamental: 'Fundamental',
}

const TIPO_COLORS: Record<string, string> = {
  creche: 'bg-pink-100 text-pink-800',
  pre_escola: 'bg-purple-100 text-purple-800',
  fundamental: 'bg-blue-100 text-blue-800',
}

export function Step1Welcome({ escolas, onNext }: Step1WelcomeProps) {
  // Agrupar escolas por tipo
  const escolasPorTipo = escolas.reduce(
    (acc, escola) => {
      if (!acc[escola.tipo]) acc[escola.tipo] = []
      acc[escola.tipo].push(escola)
      return acc
    },
    {} as Record<string, Escola[]>
  )

  return (
    <WizardStep
      title="Bem-vindo ao Sistema Educacional de Fronteira/MG!"
      description="Configure sua hierarquia educacional em 6 passos simples"
      onNext={onNext}
      canGoPrevious={false}
      nextButtonText="Começar configuração"
    >
      <div className="space-y-6">
        {/* Introdução */}
        <Alert className="border-blue-200 bg-blue-50">
          <School className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-900 font-semibold">
            Configuração Inicial
          </AlertTitle>
          <AlertDescription className="text-blue-800">
            Este wizard irá guiá-lo na criação da estrutura educacional
            completa do município. Você irá cadastrar diretores,
            coordenadores pedagógicos, secretários e professores para as{' '}
            <strong>{escolas.length} escolas</strong> já cadastradas.
          </AlertDescription>
        </Alert>

        {/* O que você irá fazer */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-100">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            O que você irá fazer neste wizard:
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">1. Criar Diretores</p>
                <p className="text-sm text-gray-600">
                  Mínimo 1 diretor. Atribua escolas que cada um gerenciará.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  2. Criar Coordenadores Pedagógicos (Opcional)
                </p>
                <p className="text-sm text-gray-600">
                  Vincule professores que cada coordenador acompanhará.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">3. Criar Secretários (Opcional)</p>
                <p className="text-sm text-gray-600">
                  Atribua escolas que cada secretário atenderá.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">4. Criar Professores</p>
                <p className="text-sm text-gray-600">
                  Mínimo 2 professores. Atribua turmas para cada professor.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">5. Revisar e Confirmar</p>
                <p className="text-sm text-gray-600">
                  Revise todos os dados e exporte PDF com credenciais.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Escolas Cadastradas */}
        <div>
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <School className="w-5 h-5 text-blue-600" />
            Escolas Municipais Cadastradas ({escolas.length})
          </h3>

          <div className="space-y-4">
            {Object.entries(escolasPorTipo).map(([tipo, escolasDoTipo]) => (
              <div key={tipo}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={TIPO_COLORS[tipo]}>
                    {TIPO_LABELS[tipo]} ({escolasDoTipo.length})
                  </Badge>
                </div>

                <div className="grid gap-2 ml-6">
                  {escolasDoTipo.map((escola) => (
                    <div
                      key={escola.id}
                      className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div>
                        <p className="font-medium text-sm">{escola.nome}</p>
                        <p className="text-xs text-gray-500">
                          INEP: {escola.codigo}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Sem diretor
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Observação importante */}
        <Alert>
          <AlertDescription>
            💡 <strong>Dica:</strong> Todos os usuários criados receberão uma
            senha padrão no formato <code>Fronteira@2025</code> e serão
            obrigados a alterá-la no primeiro login.
          </AlertDescription>
        </Alert>
      </div>
    </WizardStep>
  )
}
