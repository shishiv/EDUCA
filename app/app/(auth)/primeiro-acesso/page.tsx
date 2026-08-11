'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function firstAccessErrorMessage(code: unknown): string {
  switch (code) {
    case 'PILOT_FIRST_ACCESS_PASSWORD_INVALID':
      return 'Use 12+ caracteres com maiúscula, minúscula, número e símbolo.'
    case 'PILOT_FIRST_ACCESS_PASSWORD_UNCHANGED':
      return 'A nova senha precisa ser diferente da senha temporária. O primeiro acesso continua pendente.'
    default:
      return 'Não foi possível concluir o primeiro acesso.'
  }
}

export default function PrimeiroAcessoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const demoSandbox = isDemoSandboxEnabled()
  const resumeRegistration = searchParams.get('resume') === '1'
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) supabase.auth.exchangeCodeForSession(code).catch(() => setError('Convite inválido ou expirado.'))
  }, [searchParams])

  async function completeFirstAccess(event: FormEvent) {
    event.preventDefault()
    if (demoSandbox) {
      setError('O primeiro acesso fica bloqueado no sandbox público. Use a conta demo fornecida.')
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
          <CardTitle>Primeiro acesso</CardTitle>
          <CardDescription>
            {resumeRegistration
              ? 'Seu cadastro ainda não foi concluído. Defina sua senha para retomar com a mesma identidade.'
              : 'Defina sua senha individual. Contas compartilhadas não são permitidas.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={completeFirstAccess} className="space-y-4" aria-label="Primeiro acesso">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required minLength={12} />
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={submitting || demoSandbox} className="w-full">{submitting ? 'Salvando...' : 'Concluir acesso'}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
