'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTranslations } from 'next-intl'

export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword')
  const { loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [formReady, setFormReady] = useState(false)

  useEffect(() => {
    if (authLoading) return
    const frame = requestAnimationFrame(() => setFormReady(true))
    return () => cancelAnimationFrame(frame)
  }, [authLoading])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submittedEmail = String(new FormData(event.currentTarget).get('email') || '').trim()
    setEmail(submittedEmail)
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(submittedEmail, {
      redirectTo: `${window.location.origin}/login`,
    })

    if (resetError) {
      setError(t('error'))
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:py-20">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToLogin')}
          </Link>
        </Button>

        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-700">
          {sent ? <CheckCircle2 className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
        </div>

        <h1 className="font-display text-2xl font-semibold text-gray-900">
          {sent ? t('sentTitle') : t('title')}
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {sent
            ? t('sentDescription', { email })
            : t('description')}
        </p>

        {sent ? (
          <Button asChild className="mt-8 w-full">
            <Link href="/login">{t('backToLogin')}</Link>
          </Button>
        ) : (
          <form
            onSubmit={handleSubmit}
            data-auth-ready={formReady ? 'true' : undefined}
            className="mt-8 space-y-5"
          >
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-email">{t('emailLabel')}</Label>
              <Input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t('emailPlaceholder')}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !formReady}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('submitting')}
                </>
              ) : (
                t('submit')
              )}
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
