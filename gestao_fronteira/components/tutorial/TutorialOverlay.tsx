/**
 * Enhanced Tutorial Overlay System
 * Interactive step-by-step guidance for Brazilian educational context
 * Optimized for tablet and mobile interfaces
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  Lightbulb,
  Target,
  Play,
  CheckCircle,
  ArrowRight,
  Smartphone,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TutorialStep {
  target: string // CSS selector for the element to highlight
  content: {
    title: string
    description: string
    position: 'top' | 'bottom' | 'left' | 'right' | 'center'
    icon?: React.ReactNode
    tip?: string
    videoUrl?: string
    nextButtonText?: string
    allowSkip?: boolean
  }
  action?: {
    type: 'click' | 'input' | 'wait'
    element?: string
    waitTime?: number
  }
  validation?: () => boolean
}

interface TutorialOverlayProps {
  steps: TutorialStep[]
  onComplete: () => void
  onSkip: () => void
  title?: string
  description?: string
  canSkip?: boolean
  showProgress?: boolean
  darkMode?: boolean
}

export function TutorialOverlay({
  steps,
  onComplete,
  onSkip,
  title = 'Tutorial do Sistema',
  description = 'Aprenda a usar o sistema de frequência passo a passo',
  canSkip = true,
  showProgress = true,
  darkMode = false
}: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [isAnimating, setIsAnimating] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Calculate tooltip position relative to highlighted element
  const calculateTooltipPosition = useCallback((element: Element, position: string) => {
    const rect = element.getBoundingClientRect()
    const tooltipRect = tooltipRef.current?.getBoundingClientRect()
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    let x = 0
    let y = 0

    switch (position) {
      case 'top':
        x = rect.left + rect.width / 2 - (tooltipRect?.width || 0) / 2
        y = rect.top - (tooltipRect?.height || 0) - 20
        break
      case 'bottom':
        x = rect.left + rect.width / 2 - (tooltipRect?.width || 0) / 2
        y = rect.bottom + 20
        break
      case 'left':
        x = rect.left - (tooltipRect?.width || 0) - 20
        y = rect.top + rect.height / 2 - (tooltipRect?.height || 0) / 2
        break
      case 'right':
        x = rect.right + 20
        y = rect.top + rect.height / 2 - (tooltipRect?.height || 0) / 2
        break
      case 'center':
        x = windowWidth / 2 - (tooltipRect?.width || 0) / 2
        y = windowHeight / 2 - (tooltipRect?.height || 0) / 2
        break
    }

    // Keep tooltip within viewport
    x = Math.max(20, Math.min(x, windowWidth - (tooltipRect?.width || 0) - 20))
    y = Math.max(20, Math.min(y, windowHeight - (tooltipRect?.height || 0) - 20))

    return { x, y }
  }, [])

  // Highlight target element and position tooltip
  const highlightElement = useCallback((stepIndex: number) => {
    const step = steps[stepIndex]
    if (!step) return

    const element = document.querySelector(step.target)
    if (!element) {
      console.warn(`Tutorial target not found: ${step.target}`)
      return
    }

    setHighlightedElement(element)

    // Calculate tooltip position
    setTimeout(() => {
      const position = calculateTooltipPosition(element, step.content.position)
      setTooltipPosition(position)
    }, 100)

    // Scroll element into view
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    })

    // Add highlight styles
    element.classList.add('tutorial-highlight')
  }, [steps, calculateTooltipPosition])

  // Remove highlight from all elements
  const removeHighlight = useCallback(() => {
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight')
    })
    setHighlightedElement(null)
  }, [])

  // Navigate to next step
  const nextStep = useCallback(async () => {
    if (isAnimating) return

    setIsAnimating(true)

    const currentStepData = steps[currentStep]

    // Validate step if validation function exists
    if (currentStepData.validation && !currentStepData.validation()) {
      setIsAnimating(false)
      return
    }

    // Perform action if specified
    if (currentStepData.action) {
      switch (currentStepData.action.type) {
        case 'click':
          if (currentStepData.action.element) {
            const element = document.querySelector(currentStepData.action.element)
            if (element instanceof HTMLElement) {
              element.click()
            }
          }
          break
        case 'wait':
          if (currentStepData.action.waitTime) {
            await new Promise(resolve => setTimeout(resolve, currentStepData.action.waitTime))
          }
          break
      }
    }

    removeHighlight()

    // Move to next step or complete tutorial
    if (currentStep < steps.length - 1) {
      setTimeout(() => {
        setCurrentStep(currentStep + 1)
        setIsAnimating(false)
      }, 300)
    } else {
      completeTutorial()
    }
  }, [currentStep, steps, isAnimating, removeHighlight])

  // Navigate to previous step
  const previousStep = useCallback(() => {
    if (isAnimating || currentStep === 0) return

    setIsAnimating(true)
    removeHighlight()

    setTimeout(() => {
      setCurrentStep(currentStep - 1)
      setIsAnimating(false)
    }, 300)
  }, [currentStep, isAnimating, removeHighlight])

  // Complete tutorial
  const completeTutorial = useCallback(() => {
    removeHighlight()
    setIsVisible(false)

    // Save completion status
    localStorage.setItem('tutorial_completed', 'true')
    localStorage.setItem('tutorial_completed_date', new Date().toISOString())

    onComplete()
  }, [removeHighlight, onComplete])

  // Skip tutorial
  const skipTutorial = useCallback(() => {
    removeHighlight()
    setIsVisible(false)
    onSkip()
  }, [removeHighlight, onSkip])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible) return

      switch (event.key) {
        case 'ArrowRight':
        case 'Enter':
          event.preventDefault()
          nextStep()
          break
        case 'ArrowLeft':
          event.preventDefault()
          previousStep()
          break
        case 'Escape':
          if (canSkip) {
            event.preventDefault()
            skipTutorial()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, nextStep, previousStep, skipTutorial, canSkip])

  // Highlight current step element
  useEffect(() => {
    if (isVisible && steps[currentStep]) {
      highlightElement(currentStep)
    }
  }, [currentStep, isVisible, highlightElement])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (highlightedElement) {
        const step = steps[currentStep]
        if (step) {
          const position = calculateTooltipPosition(highlightedElement, step.content.position)
          setTooltipPosition(position)
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [highlightedElement, currentStep, steps, calculateTooltipPosition])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      removeHighlight()
    }
  }, [removeHighlight])

  if (!isVisible || !steps[currentStep]) {
    return null
  }

  const step = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <>
      {/* Tutorial Styles */}
      <style jsx global>{`
        .tutorial-highlight {
          position: relative;
          z-index: 9999;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          animation: tutorial-pulse 2s infinite;
        }

        @keyframes tutorial-pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.8), 0 0 0 12px rgba(59, 130, 246, 0.1);
          }
        }

        .tutorial-overlay {
          pointer-events: none;
        }

        .tutorial-overlay * {
          pointer-events: auto;
        }
      `}</style>

      {/* Dark overlay */}
      <div
        ref={overlayRef}
        className={cn(
          "fixed inset-0 z-50 tutorial-overlay",
          darkMode ? "bg-black/70" : "bg-black/50"
        )}
        style={{ backdropFilter: 'blur(2px)' }}
      >
        {/* Tutorial tooltip */}
        <div
          ref={tooltipRef}
          className={cn(
            "absolute z-50 transition-all duration-300",
            isAnimating && "opacity-0 scale-95"
          )}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            maxWidth: '400px',
            minWidth: '300px'
          }}
        >
          <Card className="shadow-2xl border-2 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {step.content.icon || <Lightbulb className="h-5 w-5 text-primary" />}
                  <div>
                    <CardTitle className="text-lg font-bold">
                      {step.content.title}
                    </CardTitle>
                    {showProgress && (
                      <div className="flex items-center space-x-2 mt-1">
                        <Progress value={progress} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground">
                          {currentStep + 1}/{steps.length}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {canSkip && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={skipTutorial}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <CardDescription className="text-base leading-relaxed">
                {step.content.description}
              </CardDescription>

              {/* Brazilian educational context tips */}
              {step.content.tip && (
                <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                  <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Dica Legal:</strong> {step.content.tip}
                  </p>
                </div>
              )}

              {/* Video tutorial link */}
              {step.content.videoUrl && (
                <div className="flex items-center space-x-2">
                  <Play className="h-4 w-4 text-primary" />
                  <a
                    href={step.content.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Assistir vídeo explicativo
                  </a>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={previousStep}
                      disabled={isAnimating}
                      className="min-h-[36px]"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                  )}

                  {canSkip && currentStep > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={skipTutorial}
                      className="text-muted-foreground min-h-[36px]"
                    >
                      Pular Tutorial
                    </Button>
                  )}
                </div>

                <Button
                  onClick={nextStep}
                  disabled={isAnimating}
                  size="sm"
                  className="min-h-[36px] min-w-[100px]"
                >
                  {isAnimating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : currentStep === steps.length - 1 ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Concluir
                    </>
                  ) : (
                    <>
                      {step.content.nextButtonText || 'Próximo'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>

              {/* Mobile optimization hint */}
              <div className="flex items-center space-x-2 pt-2 border-t text-xs text-muted-foreground">
                <Smartphone className="h-3 w-3" />
                <span>
                  Use as setas do teclado ou toque nos botões para navegar
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Welcome modal for first step */}
        {currentStep === 0 && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-60">
            <Card className="max-w-md shadow-2xl border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <CardTitle className="text-xl">{title}</CardTitle>
                </div>
                <CardDescription className="text-base">
                  {description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-md">
                  <Target className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-800 dark:text-green-200">
                    <p className="font-medium">Sistema Brasileiro de Frequência</p>
                    <p>Este tutorial ensina como usar o sistema conforme as normas educacionais brasileiras.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {canSkip && (
                    <Button
                      variant="ghost"
                      onClick={skipTutorial}
                      className="text-muted-foreground"
                    >
                      Pular Tutorial
                    </Button>
                  )}

                  <Button onClick={nextStep} className="ml-auto min-h-[44px]">
                    <Play className="h-4 w-4 mr-2" />
                    Começar Tutorial
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}