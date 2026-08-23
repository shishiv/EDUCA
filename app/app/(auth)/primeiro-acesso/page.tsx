'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from 'next-intl'

export default function PrimeiroAcessoPage() {
  const t = useTranslations('auth.firstAccess')
  const router = useRouter()
  const searchParams = useSearchParams()
  const demoSandbox = isDemoSandboxEnabled()
  const resumeRegistration = searchParams.get('resume') === '1'
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function firstAccessErrorMessage(code: unknown): string {
    switch (code) {
      case 'PILOT_FIRST_ACCESS_PASSWORD_INVALID':
        return t('errors.passwordInvalid')
      case 'PILOT_FIRST_ACCESS_PASSWORD_UNCHANGED':
        return t('errors.passwordUnchanged')
      default:
        return t('errors.failed')
    }
  }

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) supabase.auth.exchangeCodeForSession(code).catch(() => setError(t('errors.invalidInvite')))
  }, [searchParams, t])

  async function completeFirstAccess(event: FormEvent) {
    event.preventDefault()
    if (demoSandbox) {
      setError(t('errors.demoBlocked'))
      return
    }
    setSubmitting(true)
    setError(null)
    const response = await fetch('/api/pilot/first-access', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(firstAccessErrorMessage(result.error))
      setSubmitting(false)
      return
    }
    router.replace('/dashboard')
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {resumeRegistration
              ? t('descriptionResume')
              : t('descriptionDefault')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={completeFirstAccess} className="space-y-4" aria-label={t('formLabel')}>
            <div className="space-y-2">
              <Label htmlFor="password">{t('passwordLabel')}</Label>
              <Input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required minLength={12} />
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={submitting || demoSandbox} className="w-full">
              {submitting ? t('submitting') : t('submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
