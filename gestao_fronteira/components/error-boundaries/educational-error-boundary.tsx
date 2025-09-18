'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { logErrorBoundary } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  level?: 'page' | 'component' | 'critical'
  feature?: string
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
  retryCount: number
}

export class EducationalErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with educational context
    logErrorBoundary(error, errorInfo, {
      feature: this.props.feature,
      metadata: {
        level: this.props.level || 'component',
        retryCount: this.state.retryCount,
        errorId: this.state.errorId
      }
    })

    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  handleReload = () => {
    window.location.reload()
  }

  getErrorMessage(): string {
    const { error } = this.state
    const { level, feature } = this.props

    if (!error) return 'Ocorreu um erro inesperado'

    // Educational-specific error messages
    if (error.message.includes('attendance')) {
      return 'Erro no sistema de frequência. Os dados dos alunos estão seguros.'
    }

    if (error.message.includes('student')) {
      return 'Erro no sistema de alunos. Nenhum dado foi perdido.'
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Problema de conexão. Verifique sua internet e tente novamente.'
    }

    if (level === 'critical') {
      return 'Erro crítico no sistema. Entre em contato com o suporte técnico.'
    }

    if (feature) {
      return `Erro na funcionalidade "${feature}". Tente novamente em alguns instantes.`
    }

    return 'Ocorreu um erro inesperado. Tente novamente.'
  }

  getSeverityLevel(): 'low' | 'medium' | 'high' {
    const { level } = this.props
    const { retryCount } = this.state

    if (level === 'critical' || retryCount >= this.maxRetries) {
      return 'high'
    }

    if (level === 'page' || retryCount >= 1) {
      return 'medium'
    }

    return 'low'
  }

  renderErrorDetails() {
    const { error, errorInfo, errorId } = this.state
    const isDevelopment = process.env.NODE_ENV === 'development'

    if (!isDevelopment) return null

    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Detalhes do Erro (Desenvolvimento)
        </h4>
        <div className="text-xs text-gray-600 space-y-2">
          <div>
            <strong>ID do Erro:</strong> {errorId}
          </div>
          <div>
            <strong>Mensagem:</strong> {error?.message}
          </div>
          <div>
            <strong>Stack:</strong>
            <pre className="mt-1 overflow-x-auto text-xs bg-gray-100 p-2 rounded">
              {error?.stack}
            </pre>
          </div>
          <div>
            <strong>Component Stack:</strong>
            <pre className="mt-1 overflow-x-auto text-xs bg-gray-100 p-2 rounded">
              {errorInfo?.componentStack}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  renderComponentError() {
    const errorMessage = this.getErrorMessage()
    const canRetry = this.state.retryCount < this.maxRetries

    return (
      <div className="w-full p-4">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            {errorMessage}
          </AlertDescription>
        </Alert>

        {canRetry && (
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              className="text-orange-700 border-orange-200 hover:bg-orange-50"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tentar Novamente
            </Button>
          </div>
        )}

        {this.renderErrorDetails()}
      </div>
    )
  }

  renderPageError() {
    const errorMessage = this.getErrorMessage()
    const severity = this.getSeverityLevel()
    const canRetry = this.state.retryCount < this.maxRetries

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">
              {severity === 'high' ? 'Erro Crítico' : 'Oops! Algo deu errado'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {errorMessage}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <BookOpen className="h-4 w-4 inline mr-2 text-blue-600" />
              Seus dados educacionais estão seguros. Este erro não afeta os registros de alunos ou frequência.
            </div>

            <div className="flex flex-col gap-2">
              {canRetry && (
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente ({this.maxRetries - this.state.retryCount} tentativas restantes)
                </Button>
              )}

              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Button>

              <Button
                variant="outline"
                onClick={this.handleReload}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar Página
              </Button>
            </div>

            {severity === 'high' && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                <strong>Erro persistente detectado.</strong>
                <br />
                Entre em contato com o suporte técnico informando o código: {this.state.errorId}
              </div>
            )}

            {this.renderErrorDetails()}
          </CardContent>
        </Card>
      </div>
    )
  }

  renderCriticalError() {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-800 text-xl">
              Sistema Temporariamente Indisponível
            </CardTitle>
            <CardDescription className="text-red-700">
              Estamos enfrentando dificuldades técnicas. Nossos dados educacionais permanecem seguros.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-sm text-red-700 bg-red-100 p-4 rounded-lg">
              <BookOpen className="h-5 w-5 inline mr-2" />
              <strong>Garantia de Segurança dos Dados:</strong>
              <br />
              Todos os registros de alunos, frequência e notas estão protegidos e não foram afetados.
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                Código do erro: <code className="bg-gray-100 px-2 py-1 rounded">{this.state.errorId}</code>
              </p>

              <Button
                onClick={this.handleReload}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar Sistema
              </Button>
            </div>

            {this.renderErrorDetails()}
          </CardContent>
        </Card>
      </div>
    )
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Render based on error level
      switch (this.props.level) {
        case 'critical':
          return this.renderCriticalError()
        case 'page':
          return this.renderPageError()
        case 'component':
        default:
          return this.renderComponentError()
      }
    }

    return this.props.children
  }
}

// Convenience wrapper components
export const PageErrorBoundary: React.FC<{
  children: ReactNode
  feature?: string
}> = ({ children, feature }) => (
  <EducationalErrorBoundary level="page" feature={feature}>
    {children}
  </EducationalErrorBoundary>
)

export const ComponentErrorBoundary: React.FC<{
  children: ReactNode
  feature?: string
  fallback?: ReactNode
}> = ({ children, feature, fallback }) => (
  <EducationalErrorBoundary level="component" feature={feature} fallback={fallback}>
    {children}
  </EducationalErrorBoundary>
)

export const CriticalErrorBoundary: React.FC<{
  children: ReactNode
}> = ({ children }) => (
  <EducationalErrorBoundary level="critical">
    {children}
  </EducationalErrorBoundary>
)

export default EducationalErrorBoundary