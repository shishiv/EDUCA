/**
 * Educational Information Step - Student Registration Wizard
 * Collects educational data, social programs, and school logistics
 */

'use client'

import * as React from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { EnhancedSelectInput } from '@/components/ui/enhanced-brazilian-inputs'
import {
  GraduationCap,
  Clock,
  Bus,
  DollarSign,
  School,
  Info,
  AlertCircle,
  CheckCircle,
  MapPin
} from 'lucide-react'

export function EducationalInfoStep() {
  const { register, watch, setValue, formState: { errors } } = useFormContext()

  const serieAno = watch('serie_ano')
  const turno = watch('turno')
  const bolsaFamilia = watch('bolsa_familia')
  const transporteEscolar = watch('transporte_escolar')
  const idade = watch('idade') // Assuming age is calculated in previous steps

  const serieAnoOptions = [
    { value: '1ef', label: '1º Ano - Ensino Fundamental', description: 'Idade ideal: 6-7 anos' },
    { value: '2ef', label: '2º Ano - Ensino Fundamental', description: 'Idade ideal: 7-8 anos' },
    { value: '3ef', label: '3º Ano - Ensino Fundamental', description: 'Idade ideal: 8-9 anos' },
    { value: '4ef', label: '4º Ano - Ensino Fundamental', description: 'Idade ideal: 9-10 anos' },
    { value: '5ef', label: '5º Ano - Ensino Fundamental', description: 'Idade ideal: 10-11 anos' },
    { value: '6ef', label: '6º Ano - Ensino Fundamental', description: 'Idade ideal: 11-12 anos' },
    { value: '7ef', label: '7º Ano - Ensino Fundamental', description: 'Idade ideal: 12-13 anos' },
    { value: '8ef', label: '8º Ano - Ensino Fundamental', description: 'Idade ideal: 13-14 anos' },
    { value: '9ef', label: '9º Ano - Ensino Fundamental', description: 'Idade ideal: 14-15 anos' },
    { value: '1em', label: '1º Ano - Ensino Médio', description: 'Idade ideal: 15-16 anos' },
    { value: '2em', label: '2º Ano - Ensino Médio', description: 'Idade ideal: 16-17 anos' },
    { value: '3em', label: '3º Ano - Ensino Médio', description: 'Idade ideal: 17-18 anos' }
  ]

  const turnoOptions = [
    { value: 'matutino', label: 'Matutino', description: '7h às 12h' },
    { value: 'vespertino', label: 'Vespertino', description: '13h às 18h' },
    { value: 'noturno', label: 'Noturno', description: '19h às 23h (EJA)' },
    { value: 'integral', label: 'Integral', description: '7h às 17h (onde disponível)' }
  ]

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Etapa 4 de 6:</strong> Defina a série, turno e programas sociais do estudante.
          Essas informações são essenciais para a organização pedagógica e cumprimento das condicionalidades.
        </AlertDescription>
      </Alert>

      {/* Basic Educational Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Informações Educacionais Básicas
          </CardTitle>
          <CardDescription>
            Série, turno e escola de origem (se aplicável)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Grade/Series */}
            <EnhancedSelectInput
              name="serie_ano"
              label="Série/Ano"
              helpKey="serie_ano"
              required
              options={serieAnoOptions}
              placeholder="Selecione a série"
            />

            {/* Shift */}
            <EnhancedSelectInput
              name="turno"
              label="Turno"
              helpKey="turno"
              required
              options={turnoOptions}
              placeholder="Selecione o turno"
            />

            {/* Previous School */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="escola_origem" className="flex items-center gap-2">
                <School className="h-4 w-4" />
                Escola de Origem (se transferência)
              </Label>
              <Input
                id="escola_origem"
                placeholder="Nome da escola anterior e cidade/estado"
                {...register('escola_origem')}
              />
              <p className="text-xs text-muted-foreground">
                Preencha apenas se o estudante está vindo de outra escola
              </p>
            </div>
          </div>

          {/* Grade/Age Alert */}
          {serieAno && (
            <Alert className="border-blue-200 bg-blue-50">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Série selecionada:</strong> {serieAnoOptions.find(s => s.value === serieAno)?.label}
                <br />
                <strong>Idade ideal:</strong> {serieAnoOptions.find(s => s.value === serieAno)?.description}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Social Programs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Programas Sociais
          </CardTitle>
          <CardDescription>
            Participação em programas de transferência de renda e assistência social
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bolsa Família */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bolsa_familia"
                checked={bolsaFamilia}
                onCheckedChange={(checked) => setValue('bolsa_familia', checked)}
              />
              <Label htmlFor="bolsa_familia" className="flex items-center gap-2">
                Beneficiário do Bolsa Família/Auxílio Brasil
                <Badge variant="outline" className="text-xs">Condicionalidade</Badge>
              </Label>
            </div>

            {bolsaFamilia && (
              <div className="ml-6 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="nis">NIS (Número de Identificação Social)</Label>
                  <Input
                    id="nis"
                    placeholder="12345678901"
                    {...register('nis')}
                    maxLength={11}
                  />
                  <p className="text-xs text-muted-foreground">
                    Número de 11 dígitos encontrado no cartão do Bolsa Família
                  </p>
                </div>

                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Condicionalidades Educacionais:</strong>
                    <br />
                    • Frequência mínima de 85% para crianças de 6 a 15 anos
                    <br />
                    • Frequência mínima de 75% para adolescentes de 16 e 17 anos
                    <br />
                    O acompanhamento é obrigatório e reportado mensalmente ao governo federal.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* School Transportation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bus className="h-5 w-5" />
            Transporte Escolar
          </CardTitle>
          <CardDescription>
            Utilização do transporte escolar público municipal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="transporte_escolar"
              checked={transporteEscolar}
              onCheckedChange={(checked) => setValue('transporte_escolar', checked)}
            />
            <Label htmlFor="transporte_escolar">
              Necessita de transporte escolar público
            </Label>
          </div>

          {transporteEscolar && (
            <Alert className="border-blue-200 bg-blue-50">
              <MapPin className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Critérios para transporte escolar:</strong>
                <br />
                • Distância mínima de 2 km da escola (zona urbana)
                <br />
                • Qualquer distância (zona rural)
                <br />
                • Necessidades especiais de mobilidade
                <br />
                • Avaliação da secretaria de educação será realizada após o cadastro
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Base Legal:</strong> Constituição Federal Art. 208, VII e Lei 9.394/96 (LDB)
              <br />
              O transporte escolar é direito constitucional para estudantes que residem
              em locais de difícil acesso ou distantes da unidade escolar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Educational Planning */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-green-900">Planejamento Educacional</h4>
              <div className="text-sm text-green-800 space-y-1">
                <p>Com base nas informações fornecidas:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><strong>Organização de turmas:</strong> Séries são organizadas por faixa etária</li>
                  <li><strong>Calendário escolar:</strong> 200 dias letivos conforme LDB</li>
                  <li><strong>Carga horária:</strong> Mínimo de 800 horas anuais</li>
                  <li><strong>Avaliação:</strong> Sistema de progressão continuada</li>
                  <li><strong>Recuperação:</strong> Estudos de recuperação paralela</li>
                </ul>
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
              4
            </div>
            <div>
              <h4 className="font-semibold text-green-900">Informações Educacionais</h4>
              <p className="text-sm text-green-800">
                Defina a série/ano e turno. Marque os programas sociais se aplicável.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}