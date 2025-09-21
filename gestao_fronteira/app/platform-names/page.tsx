import { PlatformNamePreview } from '@/components/branding/platform-name-preview'
import { MunicipalHeaderIdentity } from '@/components/identity/municipal-assets'

export default function PlatformNamesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-fronteira-primary/5 via-white to-fronteira-green/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <MunicipalHeaderIdentity variant="full" className="justify-center mb-6" />
          <h1 className="text-3xl font-bold text-fronteira-primary mb-4">
            Nomes para a Plataforma Educacional
          </h1>
          <p className="text-fronteira-gray-600 max-w-2xl mx-auto">
            Explore diferentes opções de nomes e veja como cada um ficaria na interface da plataforma.
            Escolha o nome que melhor representa a identidade educacional de Fronteira-MG.
          </p>
        </div>

        {/* Preview Component */}
        <PlatformNamePreview />

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-fronteira-gray-100">
          <p className="text-fronteira-gray-500">
            Sistema desenvolvido com <span className="text-fronteira-red">❤️</span> para a
            Prefeitura de Fronteira-MG
          </p>
          <p className="text-xs text-fronteira-gray-400 mt-2">
            Trabalho, Dedicação e Amor
          </p>
        </div>
      </div>
    </div>
  )
}