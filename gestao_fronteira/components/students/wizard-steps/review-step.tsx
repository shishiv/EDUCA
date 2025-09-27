/**
 * Review Step - Student Registration Wizard
 * Final review and confirmation before submitting student data
 */

'use client'

import * as React from 'react'
import { useFormContext } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  FileText,
  User,
  MapPin,
  Users,
  GraduationCap,
  Heart,
  CheckCircle,
  AlertTriangle,
  Info,
  Edit,
  Send,
  Shield,
  Clock
} from 'lucide-react'

interface ReviewStepProps {
  onSubmit: () => Promise<void>
  isSubmitting: boolean
}

export function ReviewStep({ onSubmit, isSubmitting }: ReviewStepProps) {
  const { watch } = useFormContext()
  const formData = watch()

  // Calculate completion percentage
  const requiredFields = [
    'nome_completo', 'cpf', 'data_nascimento', 'sexo', 'cor_raca',
    'telefone', 'cep', 'endereco', 'numero', 'bairro', 'cidade',
    'nome_mae', 'contato_emergencia_nome', 'contato_emergencia_telefone', 'contato_emergencia_parentesco',
    'serie_ano', 'turno'
  ]

  const completedFields = requiredFields.filter(field =>
    formData[field] && formData[field].toString().trim() !== ''
  )

  const completionPercentage = Math.round((completedFields.length / requiredFields.length) * 100)

  // Helper function to format data display
  const formatValue = (value: any, type?: string) => {
    if (!value) return 'Não informado'
    if (type === 'boolean') return value ? 'Sim' : 'Não'
    return value
  }

  // Check for missing required fields
  const missingFields = requiredFields.filter(field =>
    !formData[field] || formData[field].toString().trim() === ''
  )

  const canSubmit = missingFields.length === 0

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Etapa 6 de 6:</strong> Revise cuidadosamente todas as informações antes de finalizar o cadastro.
          Após a confirmação, o estudante será oficialmente matriculado no sistema.
        </AlertDescription>
      </Alert>

      {/* Completion Status */}
      <Card className={completionPercentage === 100 ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {completionPercentage === 100 ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            )}
            <div>
              <h4 className={`font-semibold ${completionPercentage === 100 ? 'text-green-900' : 'text-orange-900'}`}>
                Formulário {completionPercentage}% completo
              </h4>
              <p className={`text-sm ${completionPercentage === 100 ? 'text-green-800' : 'text-orange-800'}`}>
                {completionPercentage === 100
                  ? 'Todos os campos obrigatórios foram preenchidos. Pronto para finalizar!'
                  : `${missingFields.length} campos obrigatórios ainda precisam ser preenchidos.`
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missing Fields Alert */}
      {missingFields.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Campos obrigatórios não preenchidos:</strong></p>
              <ul className="list-disc list-inside text-sm space-y-1">
                {missingFields.map((field) => (
                  <li key={field}>
                    {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </li>
                ))}
              </ul>
              <p className="text-xs mt-2">
                Volte às etapas anteriores para completar estes campos antes de finalizar.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Personal Information Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados Pessoais
            <Button variant="ghost" size="sm" className="ml-auto">
              <Edit className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Nome Completo:</strong> {formatValue(formData.nome_completo)}
            </div>
            <div>
              <strong>CPF:</strong> {formatValue(formData.cpf)}
            </div>
            <div>
              <strong>Data de Nascimento:</strong> {formatValue(formData.data_nascimento)}
            </div>
            <div>
              <strong>Sexo:</strong> {formData.sexo === 'M' ? 'Masculino' : 'Feminino'}
            </div>
            <div>
              <strong>Cor/Raça:</strong> {formatValue(formData.cor_raca)}
            </div>
            <div>
              <strong>RG:</strong> {formatValue(formData.rg)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Contato e Endereço
            <Button variant="ghost" size="sm" className="ml-auto">
              <Edit className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Telefone:</strong> {formatValue(formData.telefone)}
            </div>
            <div>
              <strong>E-mail:</strong> {formatValue(formData.email)}
            </div>
            <div className="md:col-span-2">
              <strong>Endereço:</strong> {' '}
              {[
                formData.endereco,
                formData.numero,
                formData.complemento,
                formData.bairro,
                formData.cidade,
                formData.estado
              ].filter(Boolean).join(', ')}
            </div>
            <div>
              <strong>CEP:</strong> {formatValue(formData.cep)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Family Information Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Informações Familiares
            <Button variant="ghost" size="sm" className="ml-auto">
              <Edit className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Nome da Mãe:</strong> {formatValue(formData.nome_mae)}
            </div>
            <div>
              <strong>CPF da Mãe:</strong> {formatValue(formData.cpf_mae)}
            </div>
            <div>
              <strong>Nome do Pai:</strong> {formatValue(formData.nome_pai)}
            </div>
            <div>
              <strong>CPF do Pai:</strong> {formatValue(formData.cpf_pai)}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Contato de Emergência</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Nome:</strong> {formatValue(formData.contato_emergencia_nome)}
              </div>
              <div>
                <strong>Telefone:</strong> {formatValue(formData.contato_emergencia_telefone)}
              </div>
              <div>
                <strong>Parentesco:</strong> {formatValue(formData.contato_emergencia_parentesco)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Educational Information Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Informações Educacionais
            <Button variant="ghost" size="sm" className="ml-auto">
              <Edit className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Série/Ano:</strong> {formatValue(formData.serie_ano)}
            </div>
            <div>
              <strong>Turno:</strong> {formatValue(formData.turno)}
            </div>
            <div>
              <strong>Escola de Origem:</strong> {formatValue(formData.escola_origem)}
            </div>
            <div>
              <strong>Bolsa Família:</strong> {formatValue(formData.bolsa_familia, 'boolean')}
              {formData.bolsa_familia && formData.nis && ` (NIS: ${formData.nis})`}
            </div>
            <div>
              <strong>Transporte Escolar:</strong> {formatValue(formData.transporte_escolar, 'boolean')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Information Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Saúde e Autorizações
            <Button variant="ghost" size="sm" className="ml-auto">
              <Edit className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div>
              <strong>Necessidades Especiais:</strong> {formatValue(formData.necessidades_especiais)}
            </div>
            <div>
              <strong>Medicamentos:</strong> {formatValue(formData.medicamentos)}
            </div>
            <div>
              <strong>Alergias:</strong> {formatValue(formData.alergias)}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Autorizações</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                {formData.autorizacao_imagem ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                )}
                <span>Uso de Imagem</span>
              </div>
              <div className="flex items-center gap-2">
                {formData.autorizacao_saida ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                )}
                <span>Saídas Educacionais</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Confirmation */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900">Confirmação Final</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>
                  Ao clicar em "Finalizar Cadastro", você confirma que:
                </p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Todas as informações fornecidas são verdadeiras e corretas</li>
                  <li>Você tem autorização legal para cadastrar este estudante</li>
                  <li>Concorda com o tratamento dos dados conforme LGPD</li>
                  <li>Está ciente das obrigações educacionais aplicáveis</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Dados serão processados em tempo real</span>
            </div>

            <Button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit || isSubmitting}
              size="lg"
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Finalizando Cadastro...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Finalizar Cadastro
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legal Notice */}
      <Alert className="border-gray-200 bg-gray-50">
        <FileText className="h-4 w-4" />
        <AlertDescription className="text-gray-700">
          <strong>Aviso Legal:</strong> Este cadastro constitui matrícula oficial conforme LDB 9.394/96.
          Os dados serão incluídos no Censo Escolar/INEP e sistemas governamentais aplicáveis.
          Documentação adicional pode ser solicitada para validação posterior.
        </AlertDescription>
      </Alert>

      {/* Progress Indicator */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              6
            </div>
            <div>
              <h4 className="font-semibold text-green-900">Revisão Final e Confirmação</h4>
              <p className="text-sm text-green-800">
                Verifique todos os dados e clique em "Finalizar Cadastro" para concluir a matrícula.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}