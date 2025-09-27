/**
 * Health Information Step - Student Registration Wizard
 * Collects health data, special needs, and authorization consents
 */

'use client'

import * as React from 'react'
import { useFormContext } from 'react-hook-form'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  Shield,
  Camera,
  MapPin,
  AlertTriangle,
  Info,
  Lock,
  Eye,
  FileText
} from 'lucide-react'

export function HealthInfoStep() {
  const { register, watch, setValue } = useFormContext()

  const necessidadesEspeciais = watch('necessidades_especiais')
  const medicamentos = watch('medicamentos')
  const alergias = watch('alergias')
  const autorizacaoImagem = watch('autorizacao_imagem')
  const autorizacaoSaida = watch('autorizacao_saida')

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Etapa 5 de 6:</strong> Informe condições de saúde, necessidades especiais e autorizações.
          Dados médicos são sigilosos e protegidos pela LGPD e sigilo médico.
        </AlertDescription>
      </Alert>

      {/* Health Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Informações de Saúde
          </CardTitle>
          <CardDescription>
            Condições médicas e necessidades especiais que a escola deve conhecer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Special Educational Needs */}
          <div className="space-y-2">
            <Label htmlFor="necessidades_especiais" className="flex items-center gap-2">
              Necessidades Educacionais Especiais
              <Badge variant="outline" className="text-xs">Sigiloso</Badge>
            </Label>
            <Textarea
              id="necessidades_especiais"
              placeholder="Descreva deficiências, transtornos, síndromes ou necessidades especiais que requerem adaptações pedagógicas..."
              {...register('necessidades_especiais')}
              rows={3}
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Exemplos: Deficiência visual, autismo, TDAH, dislexia, deficiência física, etc.</p>
              <p>Esta informação é protegida por sigilo médico e usada apenas para adaptações educacionais.</p>
            </div>
          </div>

          {/* Medications */}
          <div className="space-y-2">
            <Label htmlFor="medicamentos" className="flex items-center gap-2">
              Medicamentos de Uso Contínuo
              <Badge variant="outline" className="text-xs">Sigiloso</Badge>
            </Label>
            <Textarea
              id="medicamentos"
              placeholder="Liste medicamentos que o estudante toma regularmente, incluindo nome, dosagem e horários..."
              {...register('medicamentos')}
              rows={3}
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Exemplos: Ritalina 10mg - manhã; Insulina conforme glicemia; Anticonvulsivantes, etc.</p>
              <p>Receita médica deve ser entregue na secretaria da escola.</p>
            </div>
          </div>

          {/* Allergies */}
          <div className="space-y-2">
            <Label htmlFor="alergias" className="flex items-center gap-2">
              Alergias e Restrições
              <Badge variant="outline" className="text-xs">Sigiloso</Badge>
            </Label>
            <Textarea
              id="alergias"
              placeholder="Descreva alergias alimentares, medicamentosas ou outras restrições importantes..."
              {...register('alergias')}
              rows={3}
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Exemplos: Alergia a amendoim, lactose, frutos do mar, látex, medicamentos, etc.</p>
              <p>Essencial para segurança alimentar e primeiros socorros.</p>
            </div>
          </div>

          {/* Health Alert */}
          {(necessidadesEspeciais || medicamentos || alergias) && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Atenção Especial Requerida:</strong> Este estudante possui condições de saúde
                que requerem atenção especial da equipe escolar. Documentação médica deve ser
                apresentada na secretaria.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Authorizations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autorizações e Consentimentos
          </CardTitle>
          <CardDescription>
            Consentimentos necessários para atividades escolares conforme LGPD
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image Authorization */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="autorizacao_imagem"
                checked={autorizacaoImagem}
                onCheckedChange={(checked) => setValue('autorizacao_imagem', checked)}
                className="mt-1"
              />
              <div className="space-y-2">
                <Label htmlFor="autorizacao_imagem" className="flex items-center gap-2 cursor-pointer">
                  <Camera className="h-4 w-4" />
                  Autorização de Uso de Imagem
                </Label>
                <div className="text-sm text-muted-foreground">
                  <p>Autorizo o uso da imagem do estudante em:</p>
                  <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                    <li>Atividades pedagógicas e projetos educacionais</li>
                    <li>Documentação de eventos escolares</li>
                    <li>Material de divulgação institucional da escola</li>
                    <li>Redes sociais oficiais da escola/secretaria</li>
                  </ul>
                </div>
              </div>
            </div>

            {autorizacaoImagem && (
              <Alert className="ml-6 border-green-200 bg-green-50">
                <Eye className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Autorização concedida.</strong> Esta autorização pode ser revogada a qualquer
                  momento mediante solicitação por escrito à secretaria da escola.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Educational Outings Authorization */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="autorizacao_saida"
                checked={autorizacaoSaida}
                onCheckedChange={(checked) => setValue('autorizacao_saida', checked)}
                className="mt-1"
              />
              <div className="space-y-2">
                <Label htmlFor="autorizacao_saida" className="flex items-center gap-2 cursor-pointer">
                  <MapPin className="h-4 w-4" />
                  Autorização para Saídas Educacionais
                </Label>
                <div className="text-sm text-muted-foreground">
                  <p>Autorizo a participação do estudante em:</p>
                  <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                    <li>Passeios pedagógicos e excursões</li>
                    <li>Visitas a museus, bibliotecas e centros culturais</li>
                    <li>Atividades esportivas fora da escola</li>
                    <li>Competições e olimpíadas estudantis</li>
                  </ul>
                </div>
              </div>
            </div>

            {autorizacaoSaida && (
              <Alert className="ml-6 border-green-200 bg-green-50">
                <MapPin className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Autorização concedida.</strong> Para cada saída será enviada comunicação
                  específica com detalhes do evento para confirmação final.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* LGPD Information */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900">Proteção de Dados de Saúde (LGPD)</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p>
                  <strong>Dados Sensíveis:</strong> Informações de saúde são consideradas dados sensíveis
                  pela LGPD e recebem proteção especial.
                </p>
                <div className="space-y-1">
                  <p><strong>Finalidade:</strong> Cuidados de saúde e adaptações educacionais</p>
                  <p><strong>Base Legal:</strong> Proteção da vida (Art. 11, II, LGPD)</p>
                  <p><strong>Acesso:</strong> Limitado a profissionais autorizados</p>
                  <p><strong>Retenção:</strong> Durante período escolar + prazo legal</p>
                </div>
                <p className="font-medium">
                  Você pode revogar seu consentimento ou solicitar alteração/exclusão dos dados
                  a qualquer momento.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical Documentation Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-amber-900">Documentação Médica Necessária</h4>
              <div className="text-sm text-amber-800 space-y-1">
                <p>Após o cadastro, apresente na secretaria da escola (se aplicável):</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><strong>Laudo médico:</strong> Para necessidades educacionais especiais</li>
                  <li><strong>Receitas médicas:</strong> Para medicamentos de uso contínuo</li>
                  <li><strong>Cartão de vacinas:</strong> Atualizado conforme idade</li>
                  <li><strong>Exames médicos:</strong> Se houver restrições específicas</li>
                </ul>
                <p className="font-medium mt-2">
                  Prazo: Até 30 dias após a matrícula ou quando disponível.
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
              5
            </div>
            <div>
              <h4 className="font-semibold text-green-900">Informações de Saúde e Autorizações</h4>
              <p className="text-sm text-green-800">
                Preencha as informações de saúde relevantes e marque as autorizações desejadas.
                Próximo passo: revisão final dos dados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}