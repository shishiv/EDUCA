'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Bug,
  Zap,
  Shield,
  Database,
  Wifi
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import {
  handleError,
  EducationalErrorType,
  createEducationalError,
  useErrorHandler
} from '@/lib/error-handling'
import { useEducationalApi } from '@/hooks/use-educational-api'
import { EducationalErrorBoundary, ComponentErrorBoundary } from '@/components/error-boundaries/educational-error-boundary'

export function ErrorHandlingTest() {
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const { handleError: handleComponentError } = useErrorHandler()

  const api = useEducationalApi({
    feature: 'error-testing',
    autoErrorHandling: true,
    showToastOnSuccess: true,
    showToastOnError: true
  })

  // Test different error scenarios
  const testScenarios = [
    {
      id: 'network-error',
      name: 'Erro de Rede',
      description: 'Simula problemas de conectividade',
      icon: <Wifi className="h-4 w-4" />,
      severity: 'medium',
      test: () => {
        const error = new Error('Network request failed')
        return handleComponentError(error, 'error-testing')
      }
    },
    {
      id: 'student-not-found',
      name: 'Aluno Não Encontrado',
      description: 'Testa busca por aluno inexistente',
      icon: <Database className="h-4 w-4" />,
      severity: 'medium',
      test: () => {
        const error = createEducationalError(
          EducationalErrorType.STUDENT_NOT_FOUND,
          'Student with ID 12345 not found',
          { feature: 'student-search', action: 'find-student' }
        )
        return handleError(error, undefined, true)
      }
    },
    {
      id: 'authentication-failed',
      name: 'Falha de Autenticação',
      description: 'Simula problemas de login',
      icon: <Shield className="h-4 w-4" />,
      severity: 'high',
      test: () => {
        const error = createEducationalError(
          EducationalErrorType.AUTHENTICATION_FAILED,
          'Invalid credentials provided',
          { feature: 'authentication', action: 'login' }
        )
        return handleError(error, undefined, true)
      }
    },
    {
      id: 'attendance-closed',
      name: 'Período de Frequência Fechado',
      description: 'Tenta marcar frequência fora do período',
      icon: <AlertTriangle className="h-4 w-4" />,
      severity: 'medium',
      test: () => {
        const error = createEducationalError(
          EducationalErrorType.ATTENDANCE_PERIOD_CLOSED,
          'Attendance period has ended for this date',
          { feature: 'attendance', action: 'mark-attendance' }
        )
        return handleError(error, undefined, true)
      }
    },
    {
      id: 'validation-error',
      name: 'Erro de Validação',
      description: 'Dados inválidos em formulário',
      icon: <Bug className="h-4 w-4" />,
      severity: 'low',
      test: () => {
        const error = createEducationalError(
          EducationalErrorType.VALIDATION_ERROR,
          'Invalid CPF format provided',
          { feature: 'student-form', action: 'validate-cpf' }
        )
        return handleError(error, undefined, true)
      }
    },
    {
      id: 'critical-error',
      name: 'Erro Crítico do Sistema',
      description: 'Simula falha crítica que requer atenção imediata',
      icon: <Zap className="h-4 w-4" />,
      severity: 'critical',
      test: () => {
        const error = createEducationalError(
          EducationalErrorType.DATABASE_ERROR,
          'Critical database connection failure',
          { feature: 'system', action: 'database-connection' }
        )
        logger.critical('Critical system error test', error)
        return handleError(error, undefined, true)
      }
    }
  ]

  const runTest = async (scenario: typeof testScenarios[0]) => {
    try {
      setTestResults(prev => ({
        ...prev,
        [scenario.id]: { status: 'running', startTime: Date.now() }
      }))

      const result = scenario.test()

      setTestResults(prev => ({
        ...prev,
        [scenario.id]: {
          status: 'completed',
          result,
          endTime: Date.now(),
          duration: Date.now() - prev[scenario.id].startTime
        }
      }))

      toast.success(`Teste "${scenario.name}" executado com sucesso`)

    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [scenario.id]: {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          endTime: Date.now()
        }
      }))
    }
  }

  const runAllTests = async () => {
    toast.info('Executando todos os testes de erro...')

    for (const scenario of testScenarios) {
      await runTest(scenario)
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    toast.success('Todos os testes foram executados!')
  }

  const clearResults = () => {
    setTestResults({})
    toast.info('Resultados dos testes limpos')
  }

  const testApiFlow = async () => {
    // Test the API hook with simulated operations
    await api.execute(
      () => Promise.resolve({
        data: { id: '123', name: 'Test Student' },
        success: true,
        error: null
      }),
      'create-student'
    )
  }

  const testApiError = async () => {
    await api.execute(
      () => Promise.resolve({
        data: null,
        success: false,
        error: new Error('Simulated API failure')
      }),
      'load-students'
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white'
      case 'high':
        return 'bg-red-400 text-white'
      case 'medium':
        return 'bg-yellow-500 text-white'
      case 'low':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  // Component that throws errors for boundary testing
  const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error boundary error')
    }
    return <div className="p-4 bg-green-50 rounded">Componente funcionando normalmente</div>
  }

  const [shouldThrowError, setShouldThrowError] = useState(false)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Sistema de Testes de Tratamento de Erros
          </CardTitle>
          <CardDescription>
            Teste e demonstração do sistema de tratamento de erros educacionais
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="scenarios" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scenarios">Cenários de Erro</TabsTrigger>
          <TabsTrigger value="api-testing">Testes de API</TabsTrigger>
          <TabsTrigger value="boundaries">Error Boundaries</TabsTrigger>
          <TabsTrigger value="logs">Logs e Monitoramento</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <Button onClick={runAllTests} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Executar Todos os Testes
            </Button>
            <Button variant="outline" onClick={clearResults}>
              Limpar Resultados
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testScenarios.map((scenario) => (
              <Card key={scenario.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {scenario.icon}
                      {scenario.name}
                    </CardTitle>
                    <Badge className={getSeverityColor(scenario.severity)}>
                      {scenario.severity}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {scenario.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <Button
                    onClick={() => runTest(scenario)}
                    className="w-full"
                    disabled={testResults[scenario.id]?.status === 'running'}
                  >
                    {testResults[scenario.id]?.status === 'running' ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      scenario.icon
                    )}
                    {testResults[scenario.id]?.status === 'running' ? 'Executando...' : 'Executar Teste'}
                  </Button>

                  {testResults[scenario.id] && (
                    <div className="text-sm">
                      {testResults[scenario.id].status === 'completed' && (
                        <Alert className="border-green-200 bg-green-50">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Teste concluído em {testResults[scenario.id].duration}ms
                          </AlertDescription>
                        </Alert>
                      )}

                      {testResults[scenario.id].status === 'failed' && (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">
                            Falha: {testResults[scenario.id].error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="api-testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Testes da API Educacional</CardTitle>
              <CardDescription>
                Teste o hook useEducationalApi com diferentes cenários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={testApiFlow} disabled={api.isLoading}>
                  {api.isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Testar Operação de Sucesso
                </Button>

                <Button onClick={testApiError} variant="destructive" disabled={api.isLoading}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Testar Operação com Erro
                </Button>
              </div>

              {api.canRetry && (
                <Button onClick={api.retry} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente ({api.retryCount}/{2})
                </Button>
              )}

              {/* API State Display */}
              <div className="space-y-2">
                <h4 className="font-medium">Estado da API:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Loading: {api.isLoading ? '✅' : '❌'}</div>
                  <div>Success: {api.success ? '✅' : '❌'}</div>
                  <div>Error: {api.hasError ? '✅' : '❌'}</div>
                  <div>Data: {api.hasData ? '✅' : '❌'}</div>
                  <div>Retrying: {api.isRetrying ? '✅' : '❌'}</div>
                  <div>Can Retry: {api.canRetry ? '✅' : '❌'}</div>
                </div>

                {api.executionTime && (
                  <div className="text-sm text-gray-600">
                    Tempo de execução: {api.executionTime}ms
                  </div>
                )}

                {api.error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {api.error.message}
                    </AlertDescription>
                  </Alert>
                )}

                {api.data && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Dados recebidos: {JSON.stringify(api.data)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="boundaries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teste de Error Boundaries</CardTitle>
              <CardDescription>
                Teste os componentes de captura de erros do React
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={() => setShouldThrowError(!shouldThrowError)}
                  variant={shouldThrowError ? "destructive" : "default"}
                >
                  {shouldThrowError ? 'Parar Erro' : 'Gerar Erro'}
                </Button>
              </div>

              <ComponentErrorBoundary feature="error-boundary-test">
                <ErrorThrowingComponent shouldThrow={shouldThrowError} />
              </ComponentErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sistema de Logs</CardTitle>
              <CardDescription>
                Monitore os logs gerados pelo sistema de tratamento de erros
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => {
                    logger.info('Log de teste gerado pelo usuário', {
                      feature: 'error-testing',
                      action: 'manual-log'
                    })
                    toast.info('Log de informação gerado')
                  }}
                >
                  Gerar Log de Info
                </Button>

                <Button
                  onClick={() => {
                    logger.warn('Aviso de teste gerado pelo usuário', {
                      feature: 'error-testing',
                      action: 'manual-warning'
                    })
                    toast.warning('Log de aviso gerado')
                  }}
                  variant="outline"
                >
                  Gerar Log de Aviso
                </Button>

                <Button
                  onClick={() => {
                    logger.error('Erro de teste gerado pelo usuário', new Error('Erro simulado'), {
                      feature: 'error-testing',
                      action: 'manual-error'
                    })
                    toast.error('Log de erro gerado')
                  }}
                  variant="destructive"
                >
                  Gerar Log de Erro
                </Button>

                <Button
                  onClick={() => {
                    logger.critical('Erro crítico de teste', new Error('Erro crítico simulado'), {
                      feature: 'error-testing',
                      action: 'manual-critical'
                    })
                    toast.error('Log crítico gerado')
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Gerar Log Crítico
                </Button>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Nota:</strong> Em ambiente de desenvolvimento, os logs são salvos no localStorage.
                  Em produção, são enviados para o sistema de monitoramento.
                </AlertDescription>
              </Alert>

              <div className="text-sm space-y-2">
                <h4 className="font-medium">Logs no LocalStorage:</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const logs = localStorage.getItem('educational_logs')
                    if (logs) {
                      const parsedLogs = JSON.parse(logs)
                      toast.info(`${parsedLogs.length} logs encontrados no localStorage`)
                      console.log('Educational Logs:', parsedLogs)
                    } else {
                      toast.info('Nenhum log encontrado no localStorage')
                    }
                  }}
                >
                  Ver Logs no Console
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem('educational_logs')
                    toast.info('Logs limpos do localStorage')
                  }}
                >
                  Limpar Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ErrorHandlingTest