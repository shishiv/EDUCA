import Link from 'next/link'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <WifiOff className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold text-gray-900">
          Você está offline
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          O EDUCA não conseguiu acessar a rede. As marcações de frequência salvas
          neste dispositivo serão sincronizadas quando a conexão voltar.
        </p>
        <Button asChild className="mt-8 w-full">
          <Link href="/dashboard">Tentar novamente</Link>
        </Button>
      </section>
    </main>
  )
}
