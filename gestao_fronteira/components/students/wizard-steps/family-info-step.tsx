/**
 * Family Information Step - Student Registration Wizard
 * Collects family and emergency contact information
 */

'use client'

import * as React from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  EnhancedCPFInput,
  EnhancedPhoneInput
} from '@/components/ui/enhanced-brazilian-inputs'
import {
  Users,
  User,
  UserCheck,
  Phone,
  AlertTriangle,
  Info,
  AlertCircle,
  Heart
} from 'lucide-react'

export function FamilyInfoStep() {
  const { register, watch, formState: { errors } } = useFormContext()

  const nomeMae = watch('nome_mae')
  const nomePai = watch('nome_pai')

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Etapa 3 de 6:</strong> Informe os dados dos responsáveis pelo estudante.
          As informações da mãe são obrigatórias. O pai/responsável paternal é opcional desde 2021.
        </AlertDescription>
      </Alert>

      {/* Mother Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações da Mãe/Responsável Maternal
            <Badge variant="secondary">Obrigatório</Badge>
          </CardTitle>
          <CardDescription>
            Dados da mãe ou responsável legal feminino
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mother's Name */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="nome_mae" className="flex items-center gap-2">
                Nome Completo da Mãe *
                <Badge variant="outline" className="text-xs">INEP</Badge>
              </Label>
              <Input
                id="nome_mae"
                placeholder="Nome completo da mãe"
                {...register('nome_mae')}
                className={errors.nome_mae ? "border-red-500" : ""}
              />
              {errors.nome_mae && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.nome_mae.message as string}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Nome conforme documento de identidade da mãe ou responsável legal
              </p>
            </div>

            {/* Mother's CPF */}
            <EnhancedCPFInput
              name="cpf_mae"
              label="CPF da Mãe"
              helpKey="cpf"
              placeholder="000.000.000-00"
            />

            {/* Mother's Phone */}
            <EnhancedPhoneInput
              name="telefone_mae"
              label="Telefone da Mãe"
              helpKey="phone"
              placeholder="(31) 99999-8888"
            />
          </div>

          {nomeMae && (
            <Alert className="border-green-200 bg-green-50">
              <UserCheck className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Responsável maternal:</strong> {nomeMae}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Father Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Pai/Responsável Paternal
            <Badge variant="outline">Opcional</Badge>
          </CardTitle>
          <CardDescription>
            Dados do pai ou responsável legal masculino (opcional desde 2021)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Father's Name */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="nome_pai">Nome Completo do Pai</Label>
              <Input
                id="nome_pai"
                placeholder="Nome completo do pai (opcional)"
                {...register('nome_pai')}
              />
              <p className="text-xs text-muted-foreground">
                Campo opcional conforme Lei 14.382/2022
              </p>
            </div>

            {/* Father's CPF */}
            <EnhancedCPFInput
              name="cpf_pai"
              label="CPF do Pai"
              helpKey="cpf"
              placeholder="000.000.000-00"
            />

            {/* Father's Phone */}
            <EnhancedPhoneInput
              name="telefone_pai"
              label="Telefone do Pai"
              helpKey="phone"
              placeholder="(31) 99999-8888"
            />
          </div>

          {nomePai && (
            <Alert className="border-blue-200 bg-blue-50">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Responsável paternal:</strong> {nomePai}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Contato de Emergência
            <Badge variant="destructive">Obrigatório</Badge>
          </CardTitle>
          <CardDescription>
            Pessoa para contato em situações de emergência (diferente dos responsáveis principais)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Emergency Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="contato_emergencia_nome">Nome do Contato *</Label>
              <Input
                id="contato_emergencia_nome"
                placeholder="Nome completo"
                {...register('contato_emergencia_nome')}
                className={errors.contato_emergencia_nome ? "border-red-500" : ""}
              />
              {errors.contato_emergencia_nome && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.contato_emergencia_nome.message as string}
                </p>
              )}
            </div>

            {/* Emergency Contact Phone */}
            <EnhancedPhoneInput
              name="contato_emergencia_telefone"
              label="Telefone de Emergência"
              helpKey="phone"
              required
              placeholder="(31) 99999-7777"
            />

            {/* Relationship */}
            <div className="space-y-2">
              <Label htmlFor="contato_emergencia_parentesco">Parentesco *</Label>
              <Input
                id="contato_emergencia_parentesco"
                placeholder="Avó, tio, vizinho, etc."
                {...register('contato_emergencia_parentesco')}
                className={errors.contato_emergencia_parentesco ? "border-red-500" : ""}
              />
              {errors.contato_emergencia_parentesco && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.contato_emergencia_parentesco.message as string}
                </p>
              )}
            </div>
          </div>

          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Importante:</strong> O contato de emergência deve ser uma pessoa diferente
              dos responsáveis principais e deve estar sempre disponível durante o horário escolar.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Family Structure Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Heart className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900">Estruturas Familiares Diversas</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>O sistema respeita e acolhe todas as configurações familiares:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><strong>Família monoparental:</strong> Apenas um responsável (mais comum)</li>
                  <li><strong>Família biparental:</strong> Dois responsáveis (pais, mães, tutores)</li>
                  <li><strong>Família extensiva:</strong> Avós, tios como responsáveis</li>
                  <li><strong>Família adotiva:</strong> Pais/mães adotivos</li>
                  <li><strong>Guarda legal:</strong> Tutores e curadores</li>
                </ul>
                <p className="mt-2">
                  <strong>Lembrete:</strong> Apenas pessoas com guarda legal podem tomar decisões educacionais.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-amber-900">Responsabilidade Legal</h4>
              <div className="text-sm text-amber-800 space-y-1">
                <p>
                  <strong>Art. 1.634 do Código Civil:</strong> Compete a ambos os pais, qualquer que seja
                  a sua situação conjugal, o pleno exercício do poder familiar.
                </p>
                <p>
                  <strong>Lei 14.382/2022:</strong> É vedado exigir a indicação do nome do pai no registro
                  civil de nascimento como condição para matrícula.
                </p>
                <p className="font-medium">
                  Em caso de divórcio ou separação, verificar documentação de guarda antes de decisões importantes.
                </p>
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
              3
            </div>
            <div>
              <h4 className="font-semibold text-green-900">Informações Familiares</h4>
              <p className="text-sm text-green-800">
                Certifique-se de preencher pelo menos os dados da mãe/responsável e o contato de emergência.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}