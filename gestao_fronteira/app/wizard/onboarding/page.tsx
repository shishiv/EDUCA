/**
 * Wizard de Onboarding - Página Principal
 *
 * Multi-step wizard para configuração inicial do sistema:
 * 1. Welcome (exibe 9 escolas)
 * 2. Criar Diretores (mínimo 1)
 * 3. Criar Coordenadores (opcional)
 * 4. Criar Secretários (opcional)
 * 5. Criar Professores (mínimo 2)
 * 6. Review + PDF Export
 */

'use client'

import { useEffect, useState } from 'react'
import { useWizardStore } from './_store/useWizardStore'
import { StepIndicator } from './_components/StepIndicator'
import { Step1Welcome } from './_components/Step1Welcome'
import { Step2Diretores } from './_components/Step2Diretores'
import { Step3Coordenadores } from './_components/Step3Coordenadores'
import { Step4Secretarios } from './_components/Step4Secretarios'
import { Step5Professores } from './_components/Step5Professores'
import { Step6Review } from './_components/Step6Review'
import { finalizeWizard } from './_actions/finalize-wizard'
import { getSchools, type Escola } from './_actions/get-schools'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const WIZARD_STEPS = [
  { number: 1, title: 'Boas-vindas', description: 'Visão geral' },
  { number: 2, title: 'Diretores', description: 'Mínimo 1' },
  { number: 3, title: 'Coordenadores', description: 'Opcional' },
  { number: 4, title: 'Secretários', description: 'Opcional' },
  { number: 5, title: 'Professores', description: 'Mínimo 2' },
  { number: 6, title: 'Revisar', description: 'Finalizar' },
]

export default function WizardOnboardingPage() {
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const {
    currentStep,
    nextStep,
    previousStep,
    diretores,
    coordenadores,
    secretarios,
    professores,
    resetWizard,
  } = useWizardStore()

  // Carregar escolas do banco usando Server Action
  useEffect(() => {
    async function loadEscolas() {
      try {
        setLoading(true)

        const result = await getSchools()

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Erro ao carregar escolas')
        }

        setEscolas(result.data)
      } catch (err) {
        console.error('Erro ao carregar escolas:', err)
        setError(
          'Não foi possível carregar as escolas. Tente novamente.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadEscolas()
  }, [])

  // Handler para finalizar wizard
  async function handleFinalize() {
    const result = await finalizeWizard({
      diretores,
      coordenadores,
      secretarios,
      professores,
    })

    if (result.success) {
      // Limpar wizard store
      resetWizard()

      // Redirecionar para dashboard
      router.push('/dashboard')
    } else {
      throw new Error(result.message)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando wizard...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <p className="text-red-800 font-medium mb-2">Erro</p>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Progress Indicator */}
      <StepIndicator
        currentStep={currentStep}
        totalSteps={WIZARD_STEPS.length}
        steps={WIZARD_STEPS}
      />

      {/* Wizard Steps */}
      {currentStep === 1 && (
        <Step1Welcome escolas={escolas} onNext={nextStep} />
      )}

      {currentStep === 2 && (
        <Step2Diretores
          escolas={escolas}
          onNext={nextStep}
          onPrevious={previousStep}
        />
      )}

      {currentStep === 3 && (
        <Step3Coordenadores onNext={nextStep} onPrevious={previousStep} />
      )}

      {currentStep === 4 && (
        <Step4Secretarios
          escolas={escolas}
          onNext={nextStep}
          onPrevious={previousStep}
        />
      )}

      {currentStep === 5 && (
        <Step5Professores
          escolas={escolas}
          onNext={nextStep}
          onPrevious={previousStep}
        />
      )}

      {currentStep === 6 && (
        <Step6Review
          escolas={escolas}
          onPrevious={previousStep}
          onFinalize={handleFinalize}
        />
      )}
    </div>
  )
}
