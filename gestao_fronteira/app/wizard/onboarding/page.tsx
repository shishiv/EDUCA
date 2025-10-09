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
import { createClient } from '@/lib/supabase/client'
import { useWizardStore } from './_store/useWizardStore'
import { StepIndicator } from './_components/StepIndicator'
import { Step1Welcome } from './_components/Step1Welcome'
import { Step2Diretores } from './_components/Step2Diretores'
import { Loader2 } from 'lucide-react'

interface Escola {
  id: string
  nome: string
  codigo: string
  tipo: 'creche' | 'pre_escola' | 'fundamental'
}

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

  const { currentStep, nextStep, previousStep } = useWizardStore()

  // Carregar escolas do banco
  useEffect(() => {
    async function loadEscolas() {
      try {
        setLoading(true)
        const supabase = createClient()

        const { data, error: fetchError } = await supabase
          .from('escolas')
          .select('id, nome, codigo, tipo')
          .eq('ativo', true)
          .order('tipo', { ascending: true })
          .order('nome', { ascending: true })

        if (fetchError) throw fetchError

        setEscolas(data || [])
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
        <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed">
          <p className="text-gray-500">
            Step 3: Criar Coordenadores (em desenvolvimento)
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={previousStep}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              onClick={nextStep}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Próximo (temporário)
            </button>
          </div>
        </div>
      )}

      {currentStep === 4 && (
        <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed">
          <p className="text-gray-500">
            Step 4: Criar Secretários (em desenvolvimento)
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={previousStep}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              onClick={nextStep}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Próximo (temporário)
            </button>
          </div>
        </div>
      )}

      {currentStep === 5 && (
        <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed">
          <p className="text-gray-500">
            Step 5: Criar Professores (em desenvolvimento)
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={previousStep}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              onClick={nextStep}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Próximo (temporário)
            </button>
          </div>
        </div>
      )}

      {currentStep === 6 && (
        <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed">
          <p className="text-gray-500">
            Step 6: Review + PDF (em desenvolvimento)
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={previousStep}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Voltar
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Finalizar (temporário)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
