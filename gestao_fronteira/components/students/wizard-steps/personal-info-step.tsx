/**
 * Personal Information Step - Student Registration Wizard
 * Collects basic personal data required for INEP compliance
 */

'use client'

import * as React from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  EnhancedCPFInput,
  EnhancedDateInput,
  EnhancedSelectInput
} from '@/components/ui/enhanced-brazilian-inputs'
import {
  User,
  Calendar,
  Shield,
  Info,
  AlertCircle
} from 'lucide-react'

export function PersonalInfoStep() {
  const { register, watch, setValue, formState: { errors } } = useFormContext()

  const sexoOptions = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Feminino' }
  ]

  const corRacaOptions = [
    { value: 'branca', label: 'Branca', description: 'Pessoa que se declara branca' },
    { value: 'preta', label: 'Preta', description: 'Pessoa que se declara preta' },
    { value: 'parda', label: 'Parda', description: 'Pessoa que se declara parda/morena/mulata' },
    { value: 'amarela', label: 'Amarela', description: 'Pessoa de origem asiática' },
    { value: 'indigena', label: 'Indígena', description: 'Pessoa indígena ou descendente' }
  ]

  // Calculate age from birth date
  const dataNascimento = watch('data_nascimento')
  const idade = React.useMemo(() => {
    if (!dataNascimento) return null
    const birth = new Date(dataNascimento)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1
    }
    return age
  }, [dataNascimento])

  // Get suggested grade based on age
  const sugestasSerie = React.useMemo(() => {
    if (!idade) return null
    if (idade >= 6 && idade <= 7) return '1º Ano EF'
    if (idade >= 7 && idade <= 8) return '2º Ano EF'
    if (idade >= 8 && idade <= 9) return '3º Ano EF'
    if (idade >= 9 && idade <= 10) return '4º Ano EF'
    if (idade >= 10 && idade <= 11) return '5º Ano EF'
    if (idade >= 11 && idade <= 12) return '6º Ano EF'
    if (idade >= 12 && idade <= 13) return '7º Ano EF'
    if (idade >= 13 && idade <= 14) return '8º Ano EF'
    if (idade >= 14 && idade <= 15) return '9º Ano EF'
    if (idade >= 15 && idade <= 16) return '1º Ano EM'
    if (idade >= 16 && idade <= 17) return '2º Ano EM'
    if (idade >= 17 && idade <= 18) return '3º Ano EM'
    return 'Avaliar caso específico'
  }, [idade])

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Etapa 1 de 6:</strong> Informe os dados pessoais básicos do estudante.
          Todos os campos marcados com (*) são obrigatórios para o cadastro no sistema INEP.
        </AlertDescription>
      </Alert>

      {/* Main Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Identificação Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="nome_completo" className="flex items-center gap-2">
                  Nome Completo *
                  <Badge variant="outline" className="text-xs">INEP</Badge>
                </Label>
                <Input
                  id="nome_completo"
                  placeholder="Digite o nome completo do estudante"
                  {...register('nome_completo')}
                  className={errors.nome_completo ? "border-red-500" : ""}
                />
                {errors.nome_completo && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.nome_completo.message as string}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Nome conforme certidão de nascimento ou documento oficial
                </p>
              </div>

              {/* CPF */}
              <EnhancedCPFInput
                name="cpf"
                label="CPF do Estudante"
                helpKey="cpf"
                required
                placeholder="000.000.000-00"
                onCPFValidated={(cpf, isValid) => {
                  if (isValid) {
                    console.log('CPF válido:', cpf)
                  }
                }}
              />

              {/* RG */}
              <div className="space-y-2">
                <Label htmlFor="rg">RG (Opcional)</Label>
                <Input
                  id="rg"
                  placeholder="12.345.678-9"
                  {...register('rg')}
                />
                <p className="text-xs text-muted-foreground">
                  Documento de identidade (opcional, mas recomendado)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Dados Demográficos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Birth Date */}
              <EnhancedDateInput
                name="data_nascimento"
                label="Data de Nascimento"
                helpKey="data_nascimento"
                required
                placeholder="dd/mm/aaaa"
                maxDate={new Date()} // Cannot be in future
                minDate={new Date(new Date().getFullYear() - 25, 0, 1)} // Max 25 years old
                onDateSelected={(date) => {
                  if (date) {
                    console.log('Data selecionada:', date)
                  }
                }}
              />

              {/* Age Display */}
              {idade && (
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p><strong>Idade:</strong> {idade} anos</p>
                      {sugestasSerie && (
                        <p><strong>Série sugerida:</strong> {sugestasSerie}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Gender */}
              <EnhancedSelectInput
                name="sexo"
                label="Sexo"
                helpKey="sexo"
                required
                options={sexoOptions}
                placeholder="Selecione o sexo"
              />

              {/* Race/Color */}
              <EnhancedSelectInput
                name="cor_raca"
                label="Cor/Raça"
                helpKey="cor_raca"
                required
                options={corRacaOptions}
                placeholder="Selecione cor/raça"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* LGPD Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900">Proteção de Dados (LGPD)</h4>
              <p className="text-sm text-blue-800">
                Todos os dados pessoais coletados neste formulário são protegidos pela
                Lei Geral de Proteção de Dados (LGPD) e utilizados exclusivamente para
                fins educacionais e cumprimento das obrigações legais junto ao INEP/MEC.
              </p>
              <div className="text-xs text-blue-700 space-y-1">
                <p>• <strong>Finalidade:</strong> Cadastro estudantil e relatórios governamentais</p>
                <p>• <strong>Base Legal:</strong> Cumprimento de obrigação legal (Art. 7º, II LGPD)</p>
                <p>• <strong>Retenção:</strong> Dados mantidos durante período escolar + 5 anos</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold text-green-900">Dados Pessoais Básicos</h4>
              <p className="text-sm text-green-800">
                Complete esta etapa e clique em "Próximo" para continuar com as informações de contato.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}