/**
 * Brazilian Educational Compliance UI Indicators
 * INEP, Educacenso, LGPD, and Bolsa Família compliance monitoring
 * Real-time compliance status with visual warnings and recommendations
 */

'use client'

import React, { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Clock, Shield, Eye, FileText, Users, TrendingUp, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Types
interface ComplianceStatus {
  id: string
  category: 'inep' | 'educacenso' | 'lgpd' | 'bolsa_familia' | 'attendance' | 'data_quality'
  status: 'compliant' | 'warning' | 'non_compliant' | 'pending'
  title: string
  description: string
  lastCheck: Date
  score: number // 0-100
  requirements: ComplianceRequirement[]
  actions: ComplianceAction[]
}

interface ComplianceRequirement {
  id: string
  description: string
  status: 'met' | 'partially_met' | 'not_met'
  mandatory: boolean
  deadline?: Date
}

interface ComplianceAction {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  estimated_time: string
  url?: string
}

interface ComplianceIndicatorsProps {
  escolarId?: string
  sessionId?: string
  view: 'dashboard' | 'session' | 'student'
  showActions?: boolean
  compact?: boolean
}

// Mock compliance data - In production, this would come from APIs
const mockComplianceData: ComplianceStatus[] = [
  {
    id: 'inep-compliance',
    category: 'inep',
    status: 'compliant',
    title: 'INEP - Censo Escolar 2025',
    description: 'Conformidade com diretrizes do Instituto Nacional de Estudos e Pesquisas Educacionais',
    lastCheck: new Date(),
    score: 92,
    requirements: [
      {
        id: 'inep-1',
        description: 'Dados de matrícula atualizados',
        status: 'met',
        mandatory: true
      },
      {
        id: 'inep-2',
        description: 'Frequência escolar registrada',
        status: 'met',
        mandatory: true
      },
      {
        id: 'inep-3',
        description: 'Informações docentes completas',
        status: 'partially_met',
        mandatory: false
      }
    ],
    actions: [
      {
        id: 'inep-action-1',
        title: 'Completar dados docentes',
        description: 'Atualizar informações de formação e certificações',
        priority: 'medium',
        estimated_time: '2 horas'
      }
    ]
  },
  {
    id: 'educacenso-compliance',
    category: 'educacenso',
    status: 'warning',
    title: 'Educacenso 2025',
    description: 'Coleta de dados educacionais para políticas públicas',
    lastCheck: new Date(),
    score: 78,
    requirements: [
      {
        id: 'educacenso-1',
        description: 'Primeira etapa de coleta (até 31/07/2025)',
        status: 'met',
        mandatory: true,
        deadline: new Date('2025-07-31')
      },
      {
        id: 'educacenso-2',
        description: 'Validação de dados de alunos',
        status: 'partially_met',
        mandatory: true
      }
    ],
    actions: [
      {
        id: 'educacenso-action-1',
        title: 'Validar dados de alunos',
        description: 'Verificar CPF e endereços dos estudantes',
        priority: 'high',
        estimated_time: '4 horas'
      }
    ]
  },
  {
    id: 'lgpd-compliance',
    category: 'lgpd',
    status: 'compliant',
    title: 'LGPD - Lei Geral de Proteção de Dados',
    description: 'Conformidade com a Lei 13.709/2018 para proteção de dados pessoais',
    lastCheck: new Date(),
    score: 88,
    requirements: [
      {
        id: 'lgpd-1',
        description: 'Termos de consentimento atualizados',
        status: 'met',
        mandatory: true
      },
      {
        id: 'lgpd-2',
        description: 'Logs de acesso implementados',
        status: 'met',
        mandatory: true
      },
      {
        id: 'lgpd-3',
        description: 'Política de retenção de dados',
        status: 'met',
        mandatory: true
      }
    ],
    actions: []
  },
  {
    id: 'attendance-compliance',
    category: 'attendance',
    status: 'non_compliant',
    title: 'Controle de Frequência',
    description: 'Conformidade com "Não existe o esquecer" - Imutabilidade de registros',
    lastCheck: new Date(),
    score: 65,
    requirements: [
      {
        id: 'attendance-1',
        description: 'Registro diário de frequência',
        status: 'partially_met',
        mandatory: true
      },
      {
        id: 'attendance-2',
        description: 'Bloqueio automático às 18:00',
        status: 'not_met',
        mandatory: true
      }
    ],
    actions: [
      {
        id: 'attendance-action-1',
        title: 'Configurar bloqueio automático',
        description: 'Implementar bloqueio de frequência às 18:00',
        priority: 'high',
        estimated_time: '1 hora'
      }
    ]
  }
]

export default function ComplianceIndicators({
  escolarId,
  sessionId,
  view,
  showActions = true,
  compact = false
}: ComplianceIndicatorsProps) {
  const [complianceData, setComplianceData] = useState<ComplianceStatus[]>(mockComplianceData)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Calculate overall compliance score
  const overallScore = Math.round(
    complianceData.reduce((sum, item) => sum + item.score, 0) / complianceData.length
  )

  const getStatusColor = (status: ComplianceStatus['status']) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-50 border-green-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'non_compliant': return 'text-red-600 bg-red-50 border-red-200'
      case 'pending': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: ComplianceStatus['status']) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'non_compliant': return <AlertTriangle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getCategoryIcon = (category: ComplianceStatus['category']) => {
    switch (category) {
      case 'inep': return <FileText className="h-5 w-5" />
      case 'educacenso': return <TrendingUp className="h-5 w-5" />
      case 'lgpd': return <Shield className="h-5 w-5" />
      case 'bolsa_familia': return <Users className="h-5 w-5" />
      case 'attendance': return <Activity className="h-5 w-5" />
      case 'data_quality': return <Eye className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
    }
  }

  // Compact view for mobile/sidebar
  if (compact) {
    return (
      <div className="space-y-2" data-testid="compliance-indicators-compact">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Conformidade</h3>
          <Badge
            variant={overallScore >= 90 ? 'default' : overallScore >= 70 ? 'secondary' : 'destructive'}
            className="text-xs"
          >
            {overallScore}%
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {complianceData.map((item) => (
            <TooltipProvider key={item.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-md border cursor-pointer',
                      getStatusColor(item.status)
                    )}
                  >
                    {getCategoryIcon(item.category)}
                    <span className="text-xs font-medium truncate">
                      {item.title.split(' - ')[0]}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Score: {item.score}%
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="compliance-indicators-full">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Status de Conformidade Brasileira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Conformidade Geral</span>
              <Badge
                variant={overallScore >= 90 ? 'default' : overallScore >= 70 ? 'secondary' : 'destructive'}
              >
                {overallScore}% Conforme
              </Badge>
            </div>
            <Progress value={overallScore} className="w-full" />

            {overallScore < 80 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Atenção: Algumas adequações são necessárias para conformidade total com as leis brasileiras.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual Compliance Items */}
      <div className="grid gap-4">
        {complianceData.map((item) => (
          <Card
            key={item.id}
            className={cn(
              'transition-all duration-200',
              selectedCategory === item.id && 'ring-2 ring-primary'
            )}
          >
            <CardHeader
              className="cursor-pointer"
              onClick={() => setSelectedCategory(selectedCategory === item.id ? null : item.id)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  {getCategoryIcon(item.category)}
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground font-normal">
                      {item.description}
                    </p>
                  </div>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {item.score}%
                  </Badge>
                  <div className={cn('flex items-center gap-1 px-2 py-1 rounded-md border', getStatusColor(item.status))}>
                    {getStatusIcon(item.status)}
                    <span className="text-xs font-medium">
                      {item.status === 'compliant' && 'Conforme'}
                      {item.status === 'warning' && 'Atenção'}
                      {item.status === 'non_compliant' && 'Não Conforme'}
                      {item.status === 'pending' && 'Pendente'}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>

            {selectedCategory === item.id && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Requirements */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Requisitos</h4>
                    <div className="space-y-2">
                      {item.requirements.map((req) => (
                        <div key={req.id} className="flex items-center gap-2">
                          {req.status === 'met' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {req.status === 'partially_met' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                          {req.status === 'not_met' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          <span className="text-sm">{req.description}</span>
                          {req.mandatory && (
                            <Badge variant="outline" className="text-xs">
                              Obrigatório
                            </Badge>
                          )}
                          {req.deadline && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              Prazo: {req.deadline.toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  {showActions && item.actions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Ações Recomendadas</h4>
                      <div className="space-y-2">
                        {item.actions.map((action) => (
                          <div key={action.id} className="flex items-center justify-between p-2 border rounded-md">
                            <div>
                              <p className="text-sm font-medium">{action.title}</p>
                              <p className="text-xs text-muted-foreground">{action.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant={action.priority === 'high' ? 'destructive' : action.priority === 'medium' ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {action.priority === 'high' && 'Alta Prioridade'}
                                  {action.priority === 'medium' && 'Média Prioridade'}
                                  {action.priority === 'low' && 'Baixa Prioridade'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {action.estimated_time}
                                </span>
                              </div>
                            </div>
                            <Button size="sm" variant="outline">
                              Executar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Last Check */}
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Última verificação: {item.lastCheck.toLocaleString('pt-BR')}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}