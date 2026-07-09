/**
 * AttendanceGridSummary Component
 * Extracted from AttendanceGrid.tsx (Phase 15-07)
 *
 * Renders the footer section of the attendance grid including:
 * - Quick selection actions (select unmarked, clear selection)
 * - Lock info footer (when locked)
 *
 * Note: The main statistics badges are in AttendanceGridHeader.
 * This component handles footer content and quick actions.
 *
 * @see AttendanceGrid.tsx for main component
 * @see AttendanceGridHeader.tsx for statistics badges
 */

'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { CheckSquare, Square, Lock } from 'lucide-react'
import type { SessionLockInfo } from './AttendanceGridTypes'

// ============================================================================
// Types
// ============================================================================

export interface AttendanceGridSummaryProps {
  /** Whether the grid is effectively readonly */
  isEffectivelyReadonly: boolean
  /** Whether there are filtered students to show */
  hasStudents: boolean
  /** Lock information for the session */
  lockInfo: SessionLockInfo
  /** Callback to select all unmarked students */
  onSelectUnmarked: () => void
  /** Callback to clear all selections */
  onClearSelection: () => void
}

// ============================================================================
// Component
// ============================================================================

export function AttendanceGridSummary({
  isEffectivelyReadonly,
  hasStudents,
  lockInfo,
  onSelectUnmarked,
  onClearSelection,
}: AttendanceGridSummaryProps) {
  return (
    <>
      {/* Quick actions - Only show if not locked */}
      {!isEffectivelyReadonly && hasStudents && (
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectUnmarked}
            className="min-h-[36px]"
          >
            <CheckSquare className="h-3 w-3 mr-1" />
            Selecionar Nao Marcados
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            className="min-h-[36px]"
          >
            <Square className="h-3 w-3 mr-1" />
            Limpar Selecao
          </Button>
        </div>
      )}

      {/* Lock info footer */}
      {lockInfo.isLocked && (
        <div className="mt-6 pt-4 border-t flex items-center justify-center text-sm text-orange-600">
          <Lock className="h-4 w-4 mr-2" />
          <span>Frequencia bloqueada - Somente visualizacao disponivel</span>
        </div>
      )}
    </>
  )
}
