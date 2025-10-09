/**
 * Step 6: Review + Finalizar
 *
 * Revisão final de todos os usuários criados no wizard:
 * - Exibe resumo completo
 * - Botão para gerar PDF com credenciais
 * - Botão para finalizar e criar todos os usuários no banco
 */

'use client'

import { useState } from 'react'
import { WizardStep } from './WizardStep'
import { useWizardStore } from '../_store/useWizardStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  CheckCircle2,
  Users,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface Escola {
  id: string
  nome: string
  codigo: string
  tipo: 'creche' | 'pre_escola' | 'fundamental'
}

interface Step6ReviewProps {
  escolas: Escola[]
  onPrevious: () => void
  onFinalize: () => Promise<void>
}

export function Step6Review({
  escolas,
  onPrevious,
  onFinalize,
}: Step6ReviewProps) {
  const { diretores, coordenadores, secretarios, professores } =
    useWizardStore()

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Contagens totais
  const totalUsuarios =
    diretores.length +
    coordenadores.length +
    secretarios.length +
    professores.length

  // Formatar CPF para exibição
  function formatCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  // Gerar PDF com credenciais
  async function handleGeneratePDF() {
    setIsGeneratingPDF(true)
    try {
      // TODO: Implementar geração de PDF com jsPDF
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulação
      alert('PDF gerado com sucesso! (funcionalidade em desenvolvimento)')
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      setError('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Finalizar wizard
  async function handleFinalize() {
    setIsFinalizing(true)
    setError(null)
    try {
      await onFinalize()
    } catch (err) {
      console.error('Erro ao finalizar wizard:', err)
      setError('Erro ao criar usuários. Tente novamente.')
    } finally {
      setIsFinalizing(false)
    }
  }

  return (
    <WizardStep
      title="Revisar e Finalizar"
      description="Revise todos os usuários criados antes de finalizar"
      onPrevious={onPrevious}
      canGoPrevious={!isFinalizing}
      onNext={handleFinalize}
      canGoNext={!isFinalizing && totalUsuarios > 0}
      isLastStep={true}
      nextButtonText={
        isFinalizing ? 'Criando usuários...' : 'Finalizar e Criar Usuários'
      }
    >
      <div className="space-y-6">
        {/* Resumo Geral */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Resumo do Onboarding
            </CardTitle>
            <CardDescription>
              Total de {totalUsuarios} usuário(s) será(ão) criado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-3xl font-bold text-blue-600">
                  {diretores.length}
                </p>
                <p className="text-sm text-gray-600">Diretores</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-3xl font-bold text-purple-600">
                  {coordenadores.length}
                </p>
                <p className="text-sm text-gray-600">Coordenadores</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {secretarios.length}
                </p>
                <p className="text-sm text-gray-600">Secretários</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-3xl font-bold text-orange-600">
                  {professores.length}
                </p>
                <p className="text-sm text-gray-600">Professores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Erro */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Botão Gerar PDF */}
        <Button
          onClick={handleGeneratePDF}
          disabled={isGeneratingPDF || isFinalizing}
          variant="outline"
          className="w-full"
        >
          {isGeneratingPDF ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Gerar PDF com Credenciais
            </>
          )}
        </Button>

        {/* Diretores */}
        {diretores.length > 0 && (
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg">
                Diretores ({diretores.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {diretores.map((diretor, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-start p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{diretor.nome}</p>
                      <p className="text-sm text-gray-600">
                        {diretor.email} • CPF: {formatCPF(diretor.cpf)}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {diretor.escolas_ids?.map((escolaId) => {
                          const escola = escolas.find(
                            (e) => e.id === escolaId
                          )
                          return escola ? (
                            <Badge key={escolaId} variant="secondary" className="text-xs">
                              {escola.nome}
                            </Badge>
                          ) : null
                        })}
                      </div>
                    </div>
                    <Badge>Diretor</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coordenadores */}
        {coordenadores.length > 0 && (
          <Card>
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-lg">
                Coordenadores Pedagógicos ({coordenadores.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {coordenadores.map((coordenador, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-start p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{coordenador.nome}</p>
                      <p className="text-sm text-gray-600">
                        {coordenador.email} • CPF: {formatCPF(coordenador.cpf)}
                      </p>
                    </div>
                    <Badge>Coordenador</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Secretários */}
        {secretarios.length > 0 && (
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="text-lg">
                Secretários ({secretarios.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {secretarios.map((secretario, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-start p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{secretario.nome}</p>
                      <p className="text-sm text-gray-600">
                        {secretario.email} • CPF: {formatCPF(secretario.cpf)}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {secretario.escolas_ids?.map((escolaId) => {
                          const escola = escolas.find(
                            (e) => e.id === escolaId
                          )
                          return escola ? (
                            <Badge key={escolaId} variant="secondary" className="text-xs">
                              {escola.nome}
                            </Badge>
                          ) : null
                        })}
                      </div>
                    </div>
                    <Badge>Secretário</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Professores */}
        {professores.length > 0 && (
          <Card>
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-lg">
                Professores ({professores.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {professores.map((professor, index) => {
                  const escola = escolas.find(
                    (e) => e.id === professor.escola_id
                  )
                  return (
                    <div
                      key={index}
                      className="flex justify-between items-start p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{professor.nome}</p>
                        <p className="text-sm text-gray-600">
                          {professor.email} • CPF: {formatCPF(professor.cpf)}
                        </p>
                        {escola && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {escola.nome}
                          </Badge>
                        )}
                      </div>
                      <Badge>Professor</Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aviso Final */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Ao finalizar, todos os usuários
            serão criados no banco de dados com a senha padrão{' '}
            <code>Fronteira@2025</code>. Eles serão obrigados a alterar a
            senha no primeiro login.
          </AlertDescription>
        </Alert>
      </div>
    </WizardStep>
  )
}
