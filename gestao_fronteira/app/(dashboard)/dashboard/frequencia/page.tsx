'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  BookOpen,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Play
} from 'lucide-react'
import { FrequenciaWorkflow } from '@/components/attendance/FrequenciaWorkflow'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function FrequenciaPage() {
  const { userProfile } = useAuth()
  const [showWorkflow, setShowWorkflow] = useState(false)

  if (!userProfile) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const today = new Date()
  const dayOfWeek = format(today, 'EEEE', { locale: ptBR })
  const fullDate = format(today, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Frequência</h1>
          <p className="text-muted-foreground">
            {userProfile.tipo_usuario === 'admin'
              ? 'Visão administrativa de todas as turmas'
              : 'Registre a frequência dos seus alunos'
            }
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {dayOfWeek}, {fullDate}
          </span>
        </div>
      </div>

      {/* User Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Usuário Atual:</strong> {userProfile.nome} ({userProfile.tipo_usuario})
          {userProfile.escola_id && (
            <>
              <br />
              <strong>Escola:</strong> {userProfile.escola?.nome || 'Escola não informada'}
            </>
          )}
        </AlertDescription>
      </Alert>

      {/* Workflow Toggle */}
      {!showWorkflow && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Sistema de Frequência
            </CardTitle>
            <CardDescription>
              Sistema completo para controle de frequência escolar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">1. Selecionar Disciplina</p>
                  <p className="text-sm text-gray-500">Escolha a matéria</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">2. Selecionar Turma</p>
                  <p className="text-sm text-gray-500">Escolha a classe</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">3. Registrar Presença</p>
                  <p className="text-sm text-gray-500">Marque a frequência</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              {userProfile.tipo_usuario === 'professor' ? (
                <Button
                  onClick={() => setShowWorkflow(true)}
                  className="w-full"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Controle de Frequência
                </Button>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {userProfile.tipo_usuario === 'admin' &&
                      'Como administrador, você pode visualizar dados de frequência, mas o registro é feito pelos professores.'
                    }
                    {userProfile.tipo_usuario === 'diretor' &&
                      'Como diretor, você pode acompanhar a frequência, mas o registro é feito pelos professores.'
                    }
                    {userProfile.tipo_usuario === 'secretario' &&
                      'Como secretário, você pode acessar relatórios de frequência.'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow */}
      {showWorkflow && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Controle de Frequência</h2>
              <p className="text-sm text-gray-500">Professor: {userProfile.nome}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowWorkflow(false)}
            >
              Voltar ao Início
            </Button>
          </div>

          <FrequenciaWorkflow />
        </div>
      )}

      {/* Features Overview - Apenas quando não está no workflow */}
      {!showWorkflow && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Controle em Tempo Real
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  Abertura e fechamento automático de aulas
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  Registro seguro de presença
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  Interface otimizada para tablets
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-amber-600" />
                Conformidade Legal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  Princípio "não existe o esquecer"
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  Hash de integridade legal
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  Auditoria completa de ações
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}