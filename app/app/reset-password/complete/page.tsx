'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { isAuthError } from '@supabase/supabase-js'
import { forgetPasswordRecovery, passwordRecoveryUser, supabase } from '@/lib/supabase'
import { recoveryPasswordError } from '@/lib/validation/new-password'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type RecoveryState =
  | { phase: 'checking' | 'invalid' }
  | { phase: 'ready' | 'saving'; userId: string }
  | { phase: 'complete'; signedOut: boolean }

export default function CompletePasswordRecoveryPage() {
  const t = useTranslations('auth.completeRecovery')
  const [state, setState] = useState<RecoveryState>({ phase: 'checking' })
  const [error, setError] = useState('')
  const submitting = useRef(false)

  useEffect(() => {
    let active = true
    let subscription: { unsubscribe(): void } | undefined
    void passwordRecoveryUser().then(userId => {
      if (!active) return
      if (!userId) {
        setState({ phase: 'invalid' })
        return
      }
      setState({ phase: 'ready', userId })
      subscription = supabase.auth.onAuthStateChange((_event, session) => {
        // Auth holds its lock here. Only publish local state, never await Auth.
        if (session?.user.id !== userId) {
          forgetPasswordRecovery()
          setState(current => current.phase === 'complete' ? current : { phase: 'invalid' })
        }
      }).data.subscription
    })
    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state.phase !== 'ready' || submitting.current) return
    const form = event.currentTarget
    const values = new FormData(form)
    const password = String(values.get('password') ?? '')
    const validationError = recoveryPasswordError(password, String(values.get('confirmation') ?? ''))
    if (validationError) {
      setError(t(validationError))
      return
    }
    submitting.current = true
    setError('')
    setState({ phase: 'saving', userId: state.userId })
    try {
      const nextState = await saveRecoveredPassword(state.userId, password)
      if (nextState.phase === 'complete') form.reset()
      setState(nextState)
    } catch (failure) {
      setError(t(passwordSaveError(isAuthError(failure) ? failure.code : undefined)))
      setState(current => current.phase === 'invalid' ? current : { phase: 'ready', userId: state.userId })
    } finally {
      submitting.current = false
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:py-20">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-gray-900">{t('title')}</h1>
        <RecoveryNotice state={state} />
        {(state.phase === 'ready' || state.phase === 'saving') && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5" aria-busy={state.phase === 'saving'}>
            <p id="password-requirements" className="text-sm leading-6 text-gray-600">{t('requirements')}</p>
            {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label htmlFor="recovery-password">{t('passwordLabel')}</Label>
              <Input id="recovery-password" name="password" type="password" autoComplete="new-password" aria-describedby="password-requirements" required maxLength={128} className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recovery-confirm">{t('confirmLabel')}</Label>
              <Input id="recovery-confirm" name="confirmation" type="password" autoComplete="new-password" required maxLength={128} className="h-12 text-base" />
            </div>
            <Button type="submit" disabled={state.phase === 'saving'} className="h-12 w-full">
              {state.phase === 'saving' && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {t(state.phase === 'saving' ? 'saving' : 'submit')}
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}

function RecoveryNotice({ state }: { state: RecoveryState }) {
  const t = useTranslations('auth.completeRecovery')
  if (state.phase === 'invalid') return (
    <div className="mt-4 space-y-6">
      <p role="alert" className="text-sm leading-6 text-gray-700">{t('invalidLink')}</p>
      <Button asChild className="h-12 w-full"><Link href="/reset-password">{t('requestAgain')}</Link></Button>
    </div>
  )
  if (state.phase === 'complete') return (
    <div className="mt-4 space-y-6">
      <p role="status" className="text-sm leading-6 text-gray-700">{t('success')}</p>
      {!state.signedOut && <p role="alert" className="text-sm leading-6 text-gray-700">{t('signOutError')}</p>}
      <Button asChild className="h-12 w-full"><Link href="/login">{t('backToLogin')}</Link></Button>
    </div>
  )
  return <p role="status" className="mt-2 text-sm leading-6 text-gray-600">{t(state.phase === 'checking' ? 'checking' : 'description')}</p>
}

function passwordSaveError(code: string | undefined): 'passwordUnchanged' | 'passwordInvalid' | 'saveError' {
  if (code === 'same_password') return 'passwordUnchanged'
  return code === 'weak_password' ? 'passwordInvalid' : 'saveError'
}

async function saveRecoveredPassword(userId: string, password: string): Promise<RecoveryState> {
  const { data, error } = await supabase.auth.getUser()
  if (error || data.user?.id !== userId) {
    forgetPasswordRecovery()
    return { phase: 'invalid' }
  }
  const result = await supabase.auth.updateUser({ password })
  if (result.error) throw result.error
  forgetPasswordRecovery()
  // Persistence already succeeded. A sign-out failure must not invite another
  // mutation or claim that saving failed.
  return { phase: 'complete', signedOut: await endRecoverySession() }
}

async function endRecoverySession(): Promise<boolean> {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    return !error
  } catch {
    return false
  }
}
