'use client'

import { CheckCircle, ChevronRight } from 'lucide-react'

/**
 * Workflow step indicator for attendance workflow.
 * Shows progress through workflow steps with completed/active/pending states.
 */

export interface WorkflowStep {
  key: string
  label: string
}

export interface WorkflowStepIndicatorProps {
  /** Array of step definitions with key and label */
  steps: WorkflowStep[]
  /** Key of the currently active step */
  currentStepKey: string
}

/**
 * Displays a horizontal step indicator for workflow progress.
 * Shows completed steps with checkmark, active step highlighted in blue,
 * and pending steps in gray.
 */
export function WorkflowStepIndicator({
  steps,
  currentStepKey
}: WorkflowStepIndicatorProps) {
  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.key === currentStepKey)
  }

  const currentIndex = getCurrentStepIndex()

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const isActive = step.key === currentStepKey
        const isCompleted = index < currentIndex

        return (
          <div key={step.key} className="flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
              ${isActive ? 'bg-blue-600 text-white' :
                isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}
            `}>
              {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
            </div>
            <span className={`ml-2 text-sm ${isActive ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-4" />
            )}
          </div>
        )
      })}
    </div>
  )
}
