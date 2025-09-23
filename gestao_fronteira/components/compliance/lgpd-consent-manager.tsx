/**
 * LGPD Compliance Manager Component
 *
 * Implements Brazilian General Data Protection Law (LGPD) compliance:
 * - Consent management
 * - Data processing transparency
 * - Right to erasure
 * - Data portability
 * - Privacy notices
 */

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield,
  Eye,
  Download,
  Trash2,
  Info,
  Check,
  AlertTriangle,
  FileText,
  Lock,
  UserCheck
} from 'lucide-react'
import { toast } from 'sonner'

// ===== SCHEMAS =====
const lgpdConsentSchema = z.object({
  data_processing_consent: z.boolean().refine(val => val === true, 'Consentimento obrigatório'),
  marketing_consent: z.boolean().optional(),
  academic_research_consent: z.boolean().optional(),
  photo_consent: z.boolean().optional(),
  emergency_contact_consent: z.boolean().refine(val => val === true, 'Consentimento para contato de emergência é obrigatório'),
  data_sharing_consent: z.boolean().optional(),
})

type LGPDConsentFormData = z.infer<typeof lgpdConsentSchema>

// ===== INTERFACES =====
interface LGPDConsentRecord {
  id: string
  user_id: string
  entity_type: 'student' | 'guardian' | 'teacher'
  entity_id: string
  consents: {
    data_processing: { granted: boolean; timestamp: string }
    marketing: { granted: boolean; timestamp: string }
    academic_research: { granted: boolean; timestamp: string }
    photo: { granted: boolean; timestamp: string }
    emergency_contact: { granted: boolean; timestamp: string }
    data_sharing: { granted: boolean; timestamp: string }
  }
  ip_address: string
  user_agent: string
  created_at: string
  updated_at?: string
}

interface DataProcessingActivity {
  purpose: string
  legal_basis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests'
  data_categories: string[]
  retention_period: string
  third_parties?: string[]
  international_transfer?: boolean
}

interface LGPDConsentManagerProps {
  entityType: 'student' | 'guardian' | 'teacher'
  entityId: string
  onConsentChange?: (consents: LGPDConsentRecord) => void
  showFullInterface?: boolean
}

// ===== DATA PROCESSING ACTIVITIES =====
const DATA_PROCESSING_ACTIVITIES: DataProcessingActivity[] = [
  {
    purpose: 'Gestão educacional e matrícula',
    legal_basis: 'legal_obligation',
    data_categories: ['dados pessoais', 'dados educacionais', 'frequência escolar'],
    retention_period: '5 anos após conclusão/transferência',
    third_parties: ['Secretaria Municipal de Educação', 'INEP/MEC'],
    international_transfer: false
  },
  {
    purpose: 'Comunicação com responsáveis',
    legal_basis: 'consent',
    data_categories: ['dados de contato', 'informações acadêmicas'],
    retention_period: 'Durante o vínculo educacional',
    third_parties: [],
    international_transfer: false
  },
  {
    purpose: 'Atendimento médico emergencial',
    legal_basis: 'vital_interests',
    data_categories: ['dados pessoais', 'dados de saúde', 'contatos de emergência'],
    retention_period: 'Durante o vínculo educacional',
    third_parties: ['Serviços de emergência', 'Unidades de saúde'],
    international_transfer: false
  },
  {
    purpose: 'Alimentação escolar (Bolsa Família)',
    legal_basis: 'legal_obligation',
    data_categories: ['dados socioeconômicos', 'NIS'],
    retention_period: 'Conforme legislação federal',
    third_parties: ['Ministério da Cidadania', 'Caixa Econômica Federal'],
    international_transfer: false
  },
  {
    purpose: 'Pesquisa educacional e melhorias',
    legal_basis: 'consent',
    data_categories: ['dados estatísticos anonimizados'],
    retention_period: '2 anos',
    third_parties: [],
    international_transfer: false
  }
]

// ===== MAIN COMPONENT =====
export function LGPDConsentManager({
  entityType,
  entityId,
  onConsentChange,
  showFullInterface = true
}: LGPDConsentManagerProps) {
  const [currentConsents, setCurrentConsents] = useState<LGPDConsentRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<LGPDConsentFormData>({
    resolver: zodResolver(lgpdConsentSchema)
  })

  const watchedConsents = watch()

  // Load existing consents
  useEffect(() => {
    loadCurrentConsents()
  }, [entityId])

  const loadCurrentConsents = async () => {
    try {
      // In production, this would fetch from API
      // For now, simulating with localStorage
      const stored = localStorage.getItem(`lgpd_consent_${entityType}_${entityId}`)
      if (stored) {
        const consents = JSON.parse(stored)
        setCurrentConsents(consents)

        // Set form defaults
        setValue('data_processing_consent', consents.consents.data_processing.granted)
        setValue('marketing_consent', consents.consents.marketing.granted)
        setValue('academic_research_consent', consents.consents.academic_research.granted)
        setValue('photo_consent', consents.consents.photo.granted)
        setValue('emergency_contact_consent', consents.consents.emergency_contact.granted)
        setValue('data_sharing_consent', consents.consents.data_sharing.granted)
      }
    } catch (error) {
      console.error('Error loading consents:', error)
    }
  }

  const onSubmit = async (data: LGPDConsentFormData) => {
    setLoading(true)
    try {
      const timestamp = new Date().toISOString()
      const consentRecord: LGPDConsentRecord = {
        id: `lgpd_${entityType}_${entityId}_${Date.now()}`,
        user_id: 'current_user_id', // Would come from auth context
        entity_type: entityType,
        entity_id: entityId,
        consents: {
          data_processing: { granted: data.data_processing_consent, timestamp },
          marketing: { granted: data.marketing_consent || false, timestamp },
          academic_research: { granted: data.academic_research_consent || false, timestamp },
          photo: { granted: data.photo_consent || false, timestamp },
          emergency_contact: { granted: data.emergency_contact_consent, timestamp },
          data_sharing: { granted: data.data_sharing_consent || false, timestamp }
        },
        ip_address: 'user_ip', // Would be captured from request
        user_agent: navigator.userAgent,
        created_at: timestamp
      }

      // Save consent record
      localStorage.setItem(`lgpd_consent_${entityType}_${entityId}`, JSON.stringify(consentRecord))
      setCurrentConsents(consentRecord)

      onConsentChange?.(consentRecord)
      toast.success('Consentimentos atualizados com sucesso')
    } catch (error) {
      console.error('Error saving consents:', error)
      toast.error('Erro ao salvar consentimentos')
    } finally {
      setLoading(false)
    }
  }

  const handleDataPortabilityRequest = async () => {
    try {
      // Generate data export
      const exportData = {
        entity_type: entityType,
        entity_id: entityId,
        personal_data: {
          // Would include all personal data for the entity
        },
        consents: currentConsents?.consents,
        export_timestamp: new Date().toISOString(),
        format: 'JSON',
        lgpd_compliance: true
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `dados_pessoais_${entityType}_${entityId}.json`
      link.click()
      window.URL.revokeObjectURL(url)

      toast.success('Dados exportados com sucesso')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Erro ao exportar dados')
    }
  }

  const handleDataErasureRequest = async () => {
    try {
      // In production, this would create an erasure request for manual review
      const erasureRequest = {
        entity_type: entityType,
        entity_id: entityId,
        request_timestamp: new Date().toISOString(),
        status: 'pending_review',
        legal_assessment_required: true
      }

      // Save erasure request
      localStorage.setItem(`erasure_request_${entityType}_${entityId}`, JSON.stringify(erasureRequest))

      toast.success('Solicitação de exclusão registrada. Será analisada conforme a legislação educacional.')
    } catch (error) {
      console.error('Error requesting data erasure:', error)
      toast.error('Erro ao solicitar exclusão de dados')
    }
  }

  if (!showFullInterface) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Proteção de Dados (LGPD)</p>
              <p className="text-xs text-blue-700">
                {currentConsents ? 'Consentimentos registrados' : 'Consentimentos necessários'}
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Detalhes
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Gestão de Privacidade - LGPD</DialogTitle>
                  <DialogDescription>
                    Gestão de consentimentos e direitos de proteção de dados
                  </DialogDescription>
                </DialogHeader>
                <LGPDConsentManager
                  entityType={entityType}
                  entityId={entityId}
                  onConsentChange={onConsentChange}
                  showFullInterface={true}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gestão de Consentimentos LGPD
          </CardTitle>
          <CardDescription>
            Gestão de consentimentos conforme a Lei Geral de Proteção de Dados (LGPD)
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="consents" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="consents">Consentimentos</TabsTrigger>
              <TabsTrigger value="processing">Processamento</TabsTrigger>
              <TabsTrigger value="rights">Seus Direitos</TabsTrigger>
              <TabsTrigger value="privacy">Privacidade</TabsTrigger>
            </TabsList>

            <TabsContent value="consents" className="space-y-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Importante:</strong> Alguns consentimentos são obrigatórios para o funcionamento
                    do sistema educacional conforme a legislação brasileira.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  {/* Essential Consents */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Consentimentos Obrigatórios</h4>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="data_processing_consent"
                        {...register('data_processing_consent')}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <label htmlFor="data_processing_consent" className="text-sm font-medium cursor-pointer">
                          Processamento de dados educacionais *
                        </label>
                        <p className="text-xs text-gray-600">
                          Autorizo o processamento dos meus dados pessoais para fins educacionais,
                          matrícula, frequência e comunicação escolar conforme a LDB.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="emergency_contact_consent"
                        {...register('emergency_contact_consent')}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <label htmlFor="emergency_contact_consent" className="text-sm font-medium cursor-pointer">
                          Contato de emergência *
                        </label>
                        <p className="text-xs text-gray-600">
                          Autorizo o compartilhamento dos meus dados com serviços de emergência
                          em situações que envolvam risco à vida ou saúde.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Optional Consents */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Consentimentos Opcionais</h4>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="marketing_consent"
                        {...register('marketing_consent')}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <label htmlFor="marketing_consent" className="text-sm font-medium cursor-pointer">
                          Comunicações e eventos
                        </label>
                        <p className="text-xs text-gray-600">
                          Receber comunicações sobre eventos, atividades extra-curriculares
                          e programas educacionais.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="photo_consent"
                        {...register('photo_consent')}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <label htmlFor="photo_consent" className="text-sm font-medium cursor-pointer">
                          Uso de imagem
                        </label>
                        <p className="text-xs text-gray-600">
                          Autorizo o uso da minha imagem/imagem do estudante em atividades
                          educacionais e divulgação da escola.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="academic_research_consent"
                        {...register('academic_research_consent')}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <label htmlFor="academic_research_consent" className="text-sm font-medium cursor-pointer">
                          Pesquisa educacional
                        </label>
                        <p className="text-xs text-gray-600">
                          Autorizo o uso de dados anonimizados para pesquisas educacionais
                          e melhoria do ensino.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="data_sharing_consent"
                        {...register('data_sharing_consent')}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <label htmlFor="data_sharing_consent" className="text-sm font-medium cursor-pointer">
                          Compartilhamento com órgãos educacionais
                        </label>
                        <p className="text-xs text-gray-600">
                          Autorizo o compartilhamento de dados com INEP, Secretarias de Educação
                          para censos e estatísticas educacionais.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {Object.keys(errors).length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Por favor, conceda os consentimentos obrigatórios para continuar.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3">
                  <Button type="submit" disabled={loading}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    {loading ? 'Salvando...' : 'Salvar Consentimentos'}
                  </Button>

                  <Dialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Política de Privacidade
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Política de Privacidade</DialogTitle>
                        <DialogDescription>
                          Como tratamos seus dados pessoais
                        </DialogDescription>
                      </DialogHeader>
                      <PrivacyPolicyContent />
                    </DialogContent>
                  </Dialog>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="processing" className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-medium">Atividades de Processamento de Dados</h3>

                {DATA_PROCESSING_ACTIVITIES.map((activity, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium">{activity.purpose}</h4>
                          <Badge variant={activity.legal_basis === 'consent' ? 'default' : 'secondary'}>
                            {activity.legal_basis === 'consent' ? 'Consentimento' :
                             activity.legal_basis === 'legal_obligation' ? 'Obrigação Legal' :
                             activity.legal_basis === 'vital_interests' ? 'Interesse Vital' :
                             'Outro'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium">Categorias de dados:</span>
                            <ul className="list-disc list-inside mt-1 text-gray-600">
                              {activity.data_categories.map((category, i) => (
                                <li key={i}>{category}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <span className="font-medium">Período de retenção:</span>
                            <p className="text-gray-600 mt-1">{activity.retention_period}</p>
                          </div>
                        </div>

                        {activity.third_parties && activity.third_parties.length > 0 && (
                          <div className="text-sm">
                            <span className="font-medium">Terceiros envolvidos:</span>
                            <p className="text-gray-600 mt-1">{activity.third_parties.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="rights" className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-medium">Seus Direitos sob a LGPD</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Eye className="h-5 w-5 text-blue-500 mt-1" />
                        <div>
                          <h4 className="font-medium">Acesso aos Dados</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Você pode solicitar acesso aos seus dados pessoais processados pela escola.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Download className="h-5 w-5 text-green-500 mt-1" />
                        <div>
                          <h4 className="font-medium">Portabilidade</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Solicite uma cópia dos seus dados em formato estruturado.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={handleDataPortabilityRequest}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Exportar Dados
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Trash2 className="h-5 w-5 text-red-500 mt-1" />
                        <div>
                          <h4 className="font-medium">Exclusão de Dados</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Solicite a exclusão dos seus dados (sujeito à legislação educacional).
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={handleDataErasureRequest}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Solicitar Exclusão
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Lock className="h-5 w-5 text-purple-500 mt-1" />
                        <div>
                          <h4 className="font-medium">Revogação de Consentimento</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Revogue consentimentos opcionais a qualquer momento.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Importante:</strong> Alguns dados são mantidos por obrigação legal (LDB, ECA)
                    e não podem ser excluídos durante o período de retenção obrigatório.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-4">
              {currentConsents && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Status dos Consentimentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(currentConsents.consents).map(([key, consent]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant={consent.granted ? 'default' : 'secondary'}>
                              {consent.granted ? 'Concedido' : 'Não concedido'}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(consent.timestamp).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contato do Encarregado de Dados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Nome:</strong> [Nome do Encarregado]</p>
                    <p><strong>E-mail:</strong> lgpd@fronteira.mg.gov.br</p>
                    <p><strong>Telefone:</strong> (34) 3555-0000</p>
                    <p><strong>Endereço:</strong> Secretaria Municipal de Educação</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// ===== PRIVACY POLICY CONTENT =====
function PrivacyPolicyContent() {
  return (
    <div className="space-y-4 text-sm">
      <section>
        <h3 className="font-medium mb-2">1. Quem Somos</h3>
        <p>
          A Secretaria Municipal de Educação de Fronteira/MG é responsável pelo
          tratamento dos dados pessoais coletados através do sistema de gestão educacional.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">2. Dados Coletados</h3>
        <p>Coletamos apenas os dados necessários para:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Matrícula e gestão educacional</li>
          <li>Comunicação com responsáveis</li>
          <li>Atendimento emergencial</li>
          <li>Cumprimento de obrigações legais</li>
        </ul>
      </section>

      <section>
        <h3 className="font-medium mb-2">3. Base Legal</h3>
        <p>
          O tratamento dos dados está fundamentado na execução de políticas públicas
          educacionais, cumprimento de obrigação legal (LDB, ECA) e consentimento
          quando aplicável.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">4. Compartilhamento</h3>
        <p>
          Os dados podem ser compartilhados com órgãos educacionais (INEP, MEC),
          serviços de emergência e outros órgãos públicos quando necessário por lei.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">5. Segurança</h3>
        <p>
          Implementamos medidas técnicas e organizacionais apropriadas para proteger
          os dados pessoais contra acesso não autorizado, perda ou destruição.
        </p>
      </section>

      <section>
        <h3 className="font-medium mb-2">6. Seus Direitos</h3>
        <p>
          Você tem direito ao acesso, correção, exclusão (quando aplicável),
          portabilidade e revogação de consentimento conforme a LGPD.
        </p>
      </section>
    </div>
  )
}