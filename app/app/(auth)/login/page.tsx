'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { getUserProfile } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const router = useRouter()

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
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Panel - Hero with gradient */}
      <div className="relative hidden flex-col justify-center overflow-hidden bg-gradient-to-br from-green-600 to-blue-500 p-12 md:flex lg:p-16">
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-white/10"
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-md pl-6 before:absolute before:left-0 before:top-1 before:h-9 before:w-1 before:rounded-full before:bg-yellow-300">
          <h1 className="font-display text-4xl font-bold leading-tight text-white lg:text-5xl">
            Bem-vindo ao EDUCA
          </h1>
          <p className="mt-5 max-w-sm text-lg leading-relaxed text-white/85">
            O sistema que simplifica a gestão escolar da rede municipal.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex flex-col justify-center items-center p-8 bg-white">
        <div className="w-full max-w-[380px]">
          {/* Logo */}
          <div className="mb-10 text-center">
            <svg viewBox="0 0 180 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[50px] mx-auto">
              <defs>
                <linearGradient id="gradLogin" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#059669"/>
                  <stop offset="100%" stopColor="#0ea5e9"/>
                </linearGradient>
              </defs>
              <text x="5" y="36" fontFamily="Lexend, sans-serif" fontWeight="700" fontSize="40" fill="url(#gradLogin)">EDUCA</text>
              <path d="M8 46 Q40 51 75 46 Q110 41 146 46" stroke="#fcd34d" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            </svg>
          </div>

          <h2 className="font-display text-2xl font-semibold text-gray-800 mb-2">
            Entrar no sistema
          </h2>
          <p className="text-gray-500 mb-8">
            Digite suas credenciais para acessar
          </p>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@municipio.edu.br"
                autoComplete="email"
                required
                className="h-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-100"
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
                placeholder="********"
                autoComplete="current-password"
                required
                className="h-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-100"
              />
            </div>

            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="w-[18px] h-[18px] border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />
                <span>Manter conectado</span>
              </label>
              <Link
                href="/reset-password"
                className="text-sm font-medium text-green-600 hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full h-12 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <LogIn className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-400">
            Secretaria Municipal de Educação
          </p>
        </div>
      </div>
    </div>
  )
}
