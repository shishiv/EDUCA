/**
 * StepIndicator - Progress bar visual do wizard
 *
 * Exibe os 6 steps do wizard com indicação visual:
 * - Completado: Check verde
 * - Atual: Círculo azul
 * - Pendente: Círculo cinza
 */

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  steps: {
    number: number
    title: string
    description: string
  }[]
}

export function StepIndicator({
  currentStep,
  totalSteps,
  steps,
}: StepIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Progress Bar */}
      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{
              width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isCompleted = step.number < currentStep
            const isCurrent = step.number === currentStep
            const isPending = step.number > currentStep

            return (
              <div
                key={step.number}
                className="flex flex-col items-center"
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300',
                    {
                      'bg-green-500 text-white': isCompleted,
                      'bg-blue-600 text-white ring-4 ring-blue-100':
                        isCurrent,
                      'bg-gray-200 text-gray-400': isPending,
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.number
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-3 text-center max-w-[120px]">
                  <p
                    className={cn(
                      'text-xs font-medium',
                      isCurrent
                        ? 'text-blue-600'
                        : 'text-gray-500'
                    )}
                  >
                    {step.title}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-gray-400 mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
