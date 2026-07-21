import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold text-gray-900">
          Acesso não autorizado
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Seu perfil não tem permissão para acessar esta área. Volte ao painel ou
          solicite acesso ao administrador do sistema.
        </p>
        <Button asChild className="mt-8 w-full">
          <Link href="/dashboard">Voltar ao painel</Link>
        </Button>
      </section>
    </main>
  )
}
