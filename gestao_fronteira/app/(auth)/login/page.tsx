'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { getUserProfile } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EducaLogo } from '@/components/identity/educa-logo-v2'
import { Loader2, CheckCircle, Users, FileText, BarChart3, Shield } from 'lucide-react'
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

  // Features list for the hero section
  const features = [
    { icon: CheckCircle, text: 'Chamada digital em tempo real' },
    { icon: Users, text: 'Gestão completa de alunos' },
    { icon: FileText, text: 'Diário de classe integrado' },
    { icon: BarChart3, text: 'Relatórios automáticos' },
  ]

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel - Hero with Gradient */}
      <div className="hidden lg:flex bg-gradient-to-br from-jardim-green-600 to-jardim-blue-500 p-15 flex-col justify-center relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-1/5 -right-1/5 w-3/5 h-3/5 bg-white/10 rounded-full" />
        <div className="absolute -bottom-1/10 -left-1/10 w-2/5 h-2/5 bg-white/5 rounded-full" />

        <div className="relative z-10 px-8 lg:px-12">
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-4">
            Bem-vindo ao EDUCA
          </h1>
          <p className="text-lg text-white/85 max-w-md mb-12">
            O sistema que simplifica a gestão escolar da rede municipal de Fronteira, MG.
          </p>

          {/* Features List */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-white/90">
                <div className="w-9 h-9 bg-white/20 rounded-nav-item flex items-center justify-center">
                  <feature.icon className="w-5 h-5" />
                </div>
                <span className="font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="bg-white p-8 lg:p-15 flex items-center justify-center">
        <div className="w-full max-w-[380px]">
          {/* Logo */}
          <div className="mb-10 text-center lg:text-left">
            <EducaLogo size="lg" />
          </div>

          <h2 className="font-display text-2xl font-semibold text-gray-800 mb-2">
            Entrar no sistema
          </h2>
          <p className="text-gray-500 mb-8">
            Digite suas credenciais para acessar
          </p>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700 mb-6 rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@fronteira.mg.gov.br"
                required
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-jardim-green-500 focus:bg-white focus:ring-4 focus:ring-jardim-green-100 transition-all outline-none"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-jardim-green-500 focus:bg-white focus:ring-4 focus:ring-jardim-green-100 transition-all outline-none"
              />
            </div>

            {/* Submit Button - Brand Guidelines */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3.5 px-6 bg-gradient-to-r from-jardim-green-600 to-jardim-green-500 text-white font-semibold rounded-xl shadow-lg shadow-jardim-green-600/30 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Shield className="w-4 h-4" />
            <span>Conexão segura • Dados protegidos</span>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-gray-400">
            Secretaria Municipal de Educação — Fronteira, MG
          </p>
        </div>
      </div>
    </div>
  )
}
