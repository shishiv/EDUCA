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
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BrandLogo } from '@/components/marketing/brand-logo'
import { showDemoCredentialButton } from '@/lib/demo-sandbox/login-demo-credentials'

export default function LoginPage() {
  const t = useTranslations('auth.login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const router = useRouter()
  const demoCredentialButtonVisible = showDemoCredentialButton()

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

          setError(t('profileMissing'))
          toast.error(t('profileIncomplete'))

          // Keep the real Auth session so the pending registration can resume.
          router.replace('/primeiro-acesso?resume=1')
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

        toast.success(t('success'))

        // Only redirect after profile is confirmed to exist
        router.replace('/dashboard')
      }
    } catch (err: unknown) {
      const loginError = err instanceof Error ? err : new Error(String(err))
      logger.error('Login error', loginError)
      const message = loginError.message.toLowerCase().includes('invalid login credentials')
        ? t('errors.invalidCredentials')
        : t('errors.failed')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-login min-h-screen grid md:grid-cols-2">
      {/* Left Panel - municipal identity stays secondary to the sign-in task. */}
      <div className="auth-login__welcome relative hidden flex-col justify-center overflow-hidden p-12 md:flex lg:p-16">
        <div className="auth-login__welcome-orb pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full" aria-hidden="true" />
        <div className="auth-login__welcome-copy relative z-10 max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight lg:text-5xl">
            {t('welcomeTitle')}
          </h1>
          <p className="mt-5 max-w-sm text-lg leading-relaxed">
            {t('welcomeDescription')}
          </p>
        </div>
      </div>

      {/* Right Panel - the credential task remains the visual and semantic focus. */}
      <div className="auth-login__access flex flex-col items-center justify-center p-6 sm:p-8">
        <div className="auth-login__form w-full max-w-[380px]">
          <div className="auth-login__brand mb-10 text-center">
            <BrandLogo priority />
          </div>

          <h2 className="auth-login__title font-display text-2xl font-semibold mb-2">
            {t('title')}
          </h2>
          <p className="auth-login__subtitle mb-8">
            {t('subtitle')}
          </p>
          <Link href="/" className="auth-login__back mb-6 inline-flex min-h-11 items-center text-sm font-medium">
            {t('backToHome')}
          </Link>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="auth-login__fields space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="auth-login__label text-sm font-medium">
                {t('emailLabel')}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                autoComplete="email"
                required
                className="auth-login__input h-12 border-2 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="auth-login__label text-sm font-medium">
                {t('passwordLabel')}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                autoComplete="current-password"
                required
                className="auth-login__input h-12 border-2 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="auth-login__remember flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="w-[18px] h-[18px]"
                />
                <span>{t('remember')}</span>
              </label>
              <Link
                href="/reset-password"
                className="auth-login__recovery text-sm font-medium"
              >
                {t('forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="auth-login__submit w-full h-12 text-base font-semibold rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  {t('submitting')}
                </>
              ) : (
                <>
                  {t('submit')}
                  <LogIn className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
            {demoCredentialButtonVisible && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEmail('demo@educa.app.br')
                  setPassword('Demo@2026')
                  setError('')
                }}
                className="w-full"
              >
                {t('fillDemoCredentials')}
              </Button>
            )}
          </form>

          <p className="auth-login__footer mt-8 text-center text-sm">
            {t('footer')}
          </p>
        </div>
      </div>
    </div>
  )
}
