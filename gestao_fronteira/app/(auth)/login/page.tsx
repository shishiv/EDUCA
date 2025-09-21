'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MunicipalLogo } from '@/components/identity/municipal-assets'
import { Loader2, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Development mode bypass when Supabase is unavailable
      if (process.env.NODE_ENV === 'development' && email === 'admin@fronteira.mg.gov.br') {
        // Set development bypass flag
        localStorage.setItem('dev_auth_bypass', 'true')
        // Simulate successful login for development
        toast.success('Login realizado com sucesso! (Modo desenvolvimento)')
        router.push('/dashboard')
        return
      }

      await signIn(email, password)
      toast.success('Login realizado com sucesso!')
      router.push('/dashboard')
    } catch (err: any) {
      // In development, allow bypass for admin user
      if (process.env.NODE_ENV === 'development' && email === 'admin@fronteira.mg.gov.br') {
        // Set development bypass flag
        localStorage.setItem('dev_auth_bypass', 'true')
        toast.success('Login realizado com sucesso! (Modo desenvolvimento)')
        router.push('/dashboard')
        return
      }

      setError(err.message || 'Erro ao fazer login')
      toast.error('Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-fronteira-primary/5 via-white to-fronteira-green/5 px-4">
      <Card className="w-full max-w-md shadow-xl border-fronteira-gray-100">
        <CardHeader className="text-center space-y-6">
          {/* Municipal Logo */}
          <div className="flex justify-center">
            <MunicipalLogo size="md" priority />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-fronteira-primary">Sistema Escolar</CardTitle>
            <CardDescription className="text-fronteira-gray-500">
              Secretaria de Educação de Fronteira/MG
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-fronteira-red/20 bg-fronteira-red/5">
                <AlertDescription className="text-fronteira-red">{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-fronteira-gray-900 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@fronteira.mg.gov.br"
                required
                className="h-11 border-fronteira-gray-100 focus:border-fronteira-primary focus:ring-fronteira-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-fronteira-gray-900 font-medium">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                className="h-11 border-fronteira-gray-100 focus:border-fronteira-primary focus:ring-fronteira-primary/20"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-fronteira-primary hover:bg-fronteira-primary/90 text-fronteira-primary-foreground shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
          
        </CardContent>
      </Card>
    </div>
  )
}