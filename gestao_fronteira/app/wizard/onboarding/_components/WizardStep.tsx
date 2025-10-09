/**
 * WizardStep - Container base para cada step do wizard
 *
 * Fornece:
 * - Layout consistente
 * - Botões de navegação (Voltar/Próximo)
 * - Validação antes de avançar
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ReactNode } from 'react'

interface WizardStepProps {
  title: string
  description: string
  children: ReactNode
  onNext?: () => void
  onPrevious?: () => void
  canGoNext?: boolean
  canGoPrevious?: boolean
  isLastStep?: boolean
  nextButtonText?: string
  showSkip?: boolean
  onSkip?: () => void
}

export function WizardStep({
  title,
  description,
  children,
  onNext,
  onPrevious,
  canGoNext = true,
  canGoPrevious = true,
  isLastStep = false,
  nextButtonText,
  showSkip = false,
  onSkip,
}: WizardStepProps) {
  return (
    <Card className="shadow-xl border-2">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Step Content */}
        <div className="min-h-[400px]">{children}</div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          {/* Voltar */}
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="flex gap-3">
            {/* Pular (opcional) */}
            {showSkip && (
              <Button variant="ghost" onClick={onSkip}>
                Pular esta etapa
              </Button>
            )}

            {/* Próximo/Finalizar */}
            <Button
              onClick={onNext}
              disabled={!canGoNext}
              className="gap-2"
              size="lg"
            >
              {nextButtonText ||
                (isLastStep ? 'Finalizar' : 'Próximo')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
