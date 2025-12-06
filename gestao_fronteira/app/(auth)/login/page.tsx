'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { getUserProfile } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EducaLogo } from '@/components/identity/educa-logo'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* EDUCA Background with soft gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-educa-blue-50 via-white to-educa-green-50">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_30%_20%,#4361EE,transparent_40%),radial-gradient(circle_at_70%_80%,#10B981,transparent_40%)]" />
      </div>

      {/* Content */}
      <div className="relative flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-md">
          {/* EDUCA Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <EducaLogo size="xl" showText={false} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              EDUCA
            </h1>
            <p className="text-gray-500">
              Sistema Educacional de Fronteira/MG
            </p>
          </div>

          {/* Login Card - Notion/Google style */}
          <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm rounded-2xl">
            <CardContent className="p-8">
              {error && (
                <Alert variant="destructive" className="border-educa-coral-200 bg-educa-coral-50 text-educa-coral-700 mb-6 rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@fronteira.mg.gov.br"
                    required
                    className="h-12 border border-gray-200 rounded-xl focus:border-educa-blue-500 focus:ring-2 focus:ring-educa-blue-500/20 transition-all duration-200 bg-gray-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                    className="h-12 border border-gray-200 rounded-xl focus:border-educa-blue-500 focus:ring-2 focus:ring-educa-blue-500/20 transition-all duration-200 bg-gray-50 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-4 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#4361EE', color: 'white' }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Entrando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <LogIn className="h-5 w-5 mr-2" />
                      <span>Entrar</span>
                    </div>
                  )}
                </button>
              </form>

              {/* Security Indicators */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-educa-green-500 rounded-full mr-1.5"></div>
                    <span>Conexão Segura</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-educa-blue-500 rounded-full mr-1.5"></div>
                    <span>Sistema Oficial</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer with Fronteira seal */}
          <div className="mt-8 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/logo_pref.png"
                alt="Brasão de Fronteira"
                width={32}
                height={32}
                className="opacity-60"
              />
              <div className="h-6 w-px bg-gray-200" />
              <span className="text-xs text-gray-400">
                Prefeitura de Fronteira/MG
              </span>
            </div>
            <p className="text-xs text-gray-400">
              &copy; 2025 EDUCA - Todos os direitos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
