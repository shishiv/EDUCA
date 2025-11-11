'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { getUserProfile } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MunicipalLogo } from '@/components/identity/municipal-assets'
import { Loader2, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(true)

  const { signIn } = useAuth()
  const router = useRouter()

  // Set mounted state
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn(email, password)

      if (result && result.user) {
        logger.info('Login successful', {
          userId: result.user.id
        })

        // WAIT FOR PROFILE WITH RETRY (prevents race condition)
        let retries = 0
        const maxRetries = 5
        let profile = null

        while (retries < maxRetries && !profile) {
          profile = await getUserProfile(result.user.id)

          if (!profile) {
            retries++
            logger.info('Profile not found, retrying...', {
              userId: result.user.id,
              metadata: {
                retry: retries,
                maxRetries
              }
            })

            if (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          }
        }

        if (!profile) {
          // Profile doesn't exist after all retries
          logger.error('Profile not found after login', new Error('PROFILE_NOT_FOUND'), {
            userId: result.user.id,
            metadata: {
              retriesMade: retries
            }
          })

          setError('Perfil de usuário não encontrado. Contate o administrador.')
          toast.error('Erro: Perfil não encontrado')

          // Logout user since profile doesn't exist
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        logger.info('Profile loaded successfully', {
          userId: result.user.id,
          userRole: profile.tipo_usuario,
          metadata: {
            retriesNeeded: retries
          }
        })

        toast.success('Login realizado com sucesso!')

        // Only redirect after profile is confirmed to exist
        router.replace('/dashboard')
      }
    } catch (err: any) {
      logger.error('Login error', err as Error)
      setError(err.message || 'Erro ao fazer login')
      toast.error('Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  // Removed mounted gating to avoid hydration mismatch

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Background with Municipal Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-fronteira-primary/8 via-white to-fronteira-green/6">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,hsl(var(--fronteira-primary)),transparent_50%)]" />
      </div>

      {/* Content */}
      <div className="relative flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-md">
          {/* Enhanced Municipal Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-white rounded-full shadow-lg ring-1 ring-black/5">
              <MunicipalLogo size="md" priority />
            </div>
            <h1 className="text-3xl font-bold text-fronteira-primary mb-2">
              Sistema Escolar
            </h1>
            <p className="text-fronteira-gray-600">
              Secretaria Municipal de Educação
            </p>
            <p className="text-sm text-fronteira-gray-500 mt-1">
              Fronteira/MG
            </p>
          </div>

          {/* Enhanced Login Card */}
          <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm ring-1 ring-black/5">
            <CardContent className="p-8">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold text-fronteira-gray-900">
                    Endereço de Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@fronteira.mg.gov.br"
                    required
                    className="h-12 border-2 border-gray-200 rounded-lg focus:border-fronteira-primary focus:ring-4 focus:ring-fronteira-primary/10 transition-all duration-200 bg-gray-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="password" className="text-sm font-semibold text-fronteira-gray-900">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                    className="h-12 border-2 border-gray-200 rounded-lg focus:border-fronteira-primary focus:ring-4 focus:ring-fronteira-primary/10 transition-all duration-200 bg-gray-50 focus:bg-white"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 mt-8 bg-gradient-to-r from-fronteira-primary to-fronteira-blue hover:from-fronteira-primary/90 hover:to-fronteira-blue/90 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Entrando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 mr-2" />
                      <span>Acessar Sistema</span>
                    </div>
                  )}
                </Button>
              </form>

              {/* Security & Trust Indicators */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-4 text-xs text-fronteira-gray-500">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>
                    <span>Conexão Segura</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-fronteira-primary rounded-full mr-1.5"></div>
                    <span>Sistema Oficial</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Municipal Footer */}
          <div className="text-center mt-6 text-xs text-fronteira-gray-500">
            <p>© 2025 Prefeitura de Fronteira/MG</p>
            <p className="mt-1">Todos os direitos reservados</p>
          </div>
        </div>
      </div>

    </div>
  )
}
