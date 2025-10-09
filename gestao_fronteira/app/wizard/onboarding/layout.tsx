/**
 * Layout do Wizard de Onboarding
 *
 * Layout minimalista sem sidebar, fullscreen
 * Apenas para o fluxo de onboarding do superadmin
 */

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Sistema Educacional de Fronteira/MG
          </h1>
          <p className="text-gray-600 mt-2">
            Wizard de Configuração Inicial
          </p>
        </header>

        {/* Wizard Content */}
        <main className="max-w-6xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
