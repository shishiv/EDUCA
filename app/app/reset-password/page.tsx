'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })

    if (resetError) {
      setError('Não foi possível enviar o link. Verifique o e-mail e tente novamente.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:py-20">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao login
          </Link>
        </Button>

        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-700">
          {sent ? <CheckCircle2 className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
        </div>

        <h1 className="font-display text-2xl font-semibold text-gray-900">
          {sent ? 'Confira seu e-mail' : 'Redefinir senha'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {sent
            ? `Enviamos as instruções de redefinição para ${email}.`
            : 'Informe o e-mail da sua conta para receber um link seguro de redefinição.'}
        </p>

        {sent ? (
          <Button asChild className="mt-8 w-full">
            <Link href="/login">Voltar ao login</Link>
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                placeholder="seu.email@municipio.edu.br"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar link de redefinição'
              )}
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
