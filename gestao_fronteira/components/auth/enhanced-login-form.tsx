'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { MunicipalLogo } from '@/components/identity/municipal-assets'
import {
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Clock,
  HelpCircle,
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PasswordStrength {
  score: number
  feedback: string[]
  isValid: boolean
}

interface LoginAttempt {
  timestamp: Date
  success: boolean
  email: string
}

export default function EnhancedLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [sessionWarning, setSessionWarning] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([])

  const { signIn, resetPassword } = useAuth()
  const router = useRouter()

  // Password strength validation
  const validatePasswordStrength = (pass: string): PasswordStrength => {
    const feedback: string[] = []
    let score = 0

    if (pass.length >= 8) score += 1
    else feedback.push('Mínimo 8 caracteres')

    if (/[A-Z]/.test(pass)) score += 1
    else feedback.push('Pelo menos 1 letra maiúscula')

    if (/[a-z]/.test(pass)) score += 1
    else feedback.push('Pelo menos 1 letra minúscula')

    if (/\d/.test(pass)) score += 1
    else feedback.push('Pelo menos 1 número')

    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score += 1
    else feedback.push('Pelo menos 1 caractere especial')

    return {
      score,
      feedback,
      isValid: score >= 4
    }
  }

  // Check password strength when typing
  useEffect(() => {
    if (password) {
      setPasswordStrength(validatePasswordStrength(password))
    } else {
      setPasswordStrength(null)
    }
  }, [password])

  // Load login attempts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('login_attempts')
    if (stored) {
      try {
        const attempts = JSON.parse(stored).map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        }))
        setLoginAttempts(attempts.slice(-5)) // Keep last 5 attempts
      } catch (error) {
        localStorage.removeItem('login_attempts')
      }
    }
  }, [])

  // Session timeout warning
  useEffect(() => {
    const checkSessionTimeout = () => {
      const lastActivity = localStorage.getItem('last_activity')
      if (lastActivity) {
        const timeDiff = Date.now() - parseInt(lastActivity)
        if (timeDiff > 25 * 60 * 1000) { // 25 minutes warning
          setSessionWarning(true)
        }
      }
    }

    const interval = setInterval(checkSessionTimeout, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  const recordLoginAttempt = (email: string, success: boolean) => {
    const attempt: LoginAttempt = {
      timestamp: new Date(),
      success,
      email
    }

    const newAttempts = [attempt, ...loginAttempts].slice(0, 5)
    setLoginAttempts(newAttempts)

    localStorage.setItem('login_attempts', JSON.stringify(newAttempts))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Input validation
    if (!email || !password) {
      setError('Email e senha são obrigatórios')
      setLoading(false)
      return
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Formato de email inválido')
      setLoading(false)
      return
    }

    // Check rate limiting
    const recentFailedAttempts = loginAttempts.filter(
      attempt => !attempt.success &&
      Date.now() - attempt.timestamp.getTime() < 15 * 60 * 1000 // Last 15 minutes
    )

    if (recentFailedAttempts.length >= 3) {
      setError('Muitas tentativas falharam. Tente novamente em 15 minutos.')
      setLoading(false)
      return
    }

    try {
      // Development mode bypass (to be removed in production)
      if (process.env.NODE_ENV === 'development' && email === 'admin@fronteira.mg.gov.br') {
        localStorage.setItem('dev_auth_bypass', 'true')
        localStorage.setItem('last_activity', Date.now().toString())
        toast.success('Login realizado com sucesso! (Modo desenvolvimento)')
        recordLoginAttempt(email, true)
        router.push('/dashboard')
        return
      }

      await signIn(email, password)
      localStorage.setItem('last_activity', Date.now().toString())
      toast.success('Login realizado com sucesso!')
      recordLoginAttempt(email, true)
      router.push('/dashboard')
    } catch (err: any) {
      // In development, allow bypass for admin user
      if (process.env.NODE_ENV === 'development' && email === 'admin@fronteira.mg.gov.br') {
        localStorage.setItem('dev_auth_bypass', 'true')
        localStorage.setItem('last_activity', Date.now().toString())
        toast.success('Login realizado com sucesso! (Modo desenvolvimento)')
        recordLoginAttempt(email, true)
        router.push('/dashboard')
        return
      }

      const errorMessage = err.message || 'Erro ao fazer login'
      setError(errorMessage)
      recordLoginAttempt(email, false)
      toast.error('Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast.error('Digite seu email para recuperação')
      return
    }

    setForgotPasswordLoading(true)
    try {
      await resetPassword(forgotPasswordEmail)
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.')
      setShowForgotPassword(false)
      setForgotPasswordEmail('')
    } catch (error) {
      toast.error('Erro ao enviar email de recuperação')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 1) return 'text-red-500'
    if (score <= 2) return 'text-orange-500'
    if (score <= 3) return 'text-yellow-500'
    if (score <= 4) return 'text-blue-500'
    return 'text-green-500'
  }

  const getPasswordStrengthText = (score: number) => {
    if (score <= 1) return 'Muito fraca'
    if (score <= 2) return 'Fraca'
    if (score <= 3) return 'Regular'
    if (score <= 4) return 'Boa'
    return 'Muito forte'
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-fronteira-primary/5 via-white to-fronteira-green/5 px-4">
        <Card className="w-full max-w-md shadow-xl border-fronteira-gray-100">
          <CardHeader className="text-center space-y-6">
            <div className="flex justify-center">
              <MunicipalLogo size="md" priority />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-fronteira-primary">Recuperar Senha</CardTitle>
              <CardDescription className="text-fronteira-gray-500">
                Digite seu email para receber instruções de recuperação
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-fronteira-gray-900 font-medium">
                Email Institucional
              </Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                placeholder="seu.email@fronteira.mg.gov.br"
                required
                className="h-11 border-fronteira-gray-100 focus:border-fronteira-primary focus:ring-fronteira-primary/20"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleForgotPassword}
                disabled={forgotPasswordLoading}
                className="flex-1 h-11 bg-fronteira-primary hover:bg-fronteira-primary/90"
              >
                {forgotPasswordLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Email'
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 h-11"
              >
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-fronteira-primary/5 via-white to-fronteira-green/5 px-4">
      <Card className="w-full max-w-md shadow-xl border-fronteira-gray-100">
        <CardHeader className="text-center space-y-6">
          {/* Municipal Logo */}
          <div className="flex justify-center">
            <MunicipalLogo size="md" priority />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-fronteira-primary">Sistema Escolar</CardTitle>
            <CardDescription className="text-fronteira-gray-500">
              Secretaria de Educação de Fronteira/MG
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Session Warning */}
          {sessionWarning && (
            <Alert className="border-orange-200 bg-orange-50">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Aviso de Sessão:</strong> Sua sessão anterior pode ter expirado.
                Por segurança, faça login novamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Recent Login Attempts */}
          {loginAttempts.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Últimas tentativas</span>
              </div>
              <div className="space-y-1">
                {loginAttempts.slice(0, 3).map((attempt, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {attempt.timestamp.toLocaleTimeString('pt-BR')}
                    </span>
                    {attempt.success ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-fronteira-red/20 bg-fronteira-red/5">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-fronteira-red">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-fronteira-gray-900 font-medium">
                Email Institucional
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@fronteira.mg.gov.br"
                required
                className="h-11 border-fronteira-gray-100 focus:border-fronteira-primary focus:ring-fronteira-primary/20"
                aria-describedby="email-help"
              />
              <p id="email-help" className="text-xs text-fronteira-gray-500">
                Use seu email institucional da Secretaria de Educação
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-fronteira-gray-900 font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="h-11 pr-10 border-fronteira-gray-100 focus:border-fronteira-primary focus:ring-fronteira-primary/20"
                  aria-describedby="password-help password-strength"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-11 w-10 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>

              {/* Password Strength Indicator */}
              {passwordStrength && (
                <div id="password-strength" className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Força da senha:</span>
                    <span className={cn('text-xs font-medium', getPasswordStrengthColor(passwordStrength.score))}>
                      {getPasswordStrengthText(passwordStrength.score)}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {passwordStrength.feedback.join(', ')}
                    </div>
                  )}
                </div>
              )}

              <p id="password-help" className="text-xs text-fronteira-gray-500">
                Recomendamos senhas com pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e símbolos
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-fronteira-primary hover:bg-fronteira-primary/90 text-fronteira-primary-foreground shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-fronteira-primary hover:text-fronteira-primary/80"
                onClick={() => setShowForgotPassword(true)}
              >
                <HelpCircle className="h-3 w-3 mr-1" />
                Esqueci minha senha
              </Button>

              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                <Shield className="h-3 w-3 mr-1" />
                Acesso Seguro
              </Badge>
            </div>
          </form>

          {/* Brazilian Educational Compliance Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <strong>Segurança e Conformidade:</strong>
                <br />
                • Dados protegidos conforme LGPD
                <br />
                • Sistema homologado para educação municipal
                <br />
                • Registros de acesso mantidos para auditoria
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}