/**
 * AttendanceGridHeader Component
 * Extracted from AttendanceGrid.tsx (Phase 15-07)
 *
 * Renders the header section of the attendance grid including:
 * - Lock status banners (locked/warning)
 * - Title with student count
 * - Lock status indicator
 * - Connection and sync status
 * - Search input
 * - Statistics summary badges
 * - Batch action buttons (when students selected)
 * - Offline warning
 *
 * @see AttendanceGrid.tsx for main component
 */

'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Clock,
  Wifi,
  WifiOff,
  FileText,
  Lock,
  LockOpen,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AttendanceStats, SessionLockInfo } from './AttendanceGridTypes'

// ============================================================================
// Types
// ============================================================================

export interface AttendanceGridHeaderProps {
  /** Attendance statistics for display */
  stats: AttendanceStats
  /** Lock information for the session */
  lockInfo: SessionLockInfo
  /** Whether the grid is effectively readonly */
  isEffectivelyReadonly: boolean
  /** Current search term */
  searchTerm: string
  /** Callback when search term changes */
  onSearchChange: (term: string) => void
  /** Set of selected student IDs */
  selectedStudents: Set<string>
  /** Clear all selected students */
  onClearSelection: () => void
  /** Mark selected students as present/absent */
  onBatchMark: (present: boolean) => void
  /** Whether currently saving */
  saving: boolean
  /** Whether device is online */
  isOnline: boolean
  /** Sync status */
  syncStatus: 'synced' | 'pending' | 'error'
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get attendance rate badge color
 * - Green >= 80%
 * - Yellow >= 75%
 * - Red < 75%
 */
function getAttendanceRateBadgeClass(rate: number): string {
  if (rate >= 80) return 'bg-green-100 border-green-600 text-green-700'
  if (rate >= 75) return 'bg-yellow-100 border-yellow-600 text-yellow-700'
  return 'bg-red-100 border-red-600 text-red-700'
}

// ============================================================================
// Component
// ============================================================================

export function AttendanceGridHeader({
  stats,
  lockInfo,
  isEffectivelyReadonly,
  searchTerm,
  onSearchChange,
  selectedStudents,
  onClearSelection,
  onBatchMark,
  saving,
  isOnline,
  syncStatus,
}: AttendanceGridHeaderProps) {
  return (
    <CardHeader className="pb-4">
      {/* Lock Status Banner */}
      {lockInfo.isLocked && (
        <Alert variant="destructive" className="mb-4 border-orange-500 bg-orange-50">
          <Lock className="h-5 w-5 text-orange-600" />
          <AlertTitle className="text-orange-800 font-semibold">
            Frequencia Bloqueada
          </AlertTitle>
          <AlertDescription className="text-orange-700">
            {lockInfo.message}
            {lockInfo.lockReason === 'time_18h' && (
              <p className="mt-1 text-sm">
                Conforme legislacao educacional brasileira, os registros de frequencia sao imutaveis apos as 18:00.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Warning Banner - Approaching Lock Time */}
      {!lockInfo.isLocked && lockInfo.timeUntilLockMinutes !== null && lockInfo.timeUntilLockMinutes <= 60 && (
        <Alert className="mb-4 border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-800 font-semibold">
            Atencao: Bloqueio Proximo
          </AlertTitle>
          <AlertDescription className="text-yellow-700">
            {lockInfo.message}
            <p className="mt-1 text-sm">
              Finalize as marcacoes de frequencia antes do bloqueio automatico as 18:00.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4 flex-wrap gap-y-2">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Chamada - {stats.total} aluno(s)</span>
          </CardTitle>

          {/* Lock Status Indicator */}
          <div className="flex items-center space-x-1 text-xs">
            {lockInfo.isLocked ? (
              <>
                <Lock className="h-4 w-4 text-orange-600" />
                <span className="text-orange-600 font-medium">Bloqueado</span>
              </>
            ) : (
              <>
                <LockOpen className="h-4 w-4 text-green-600" />
                <span className="text-green-600">Editavel</span>
              </>
            )}
          </div>

          {/* Connection status */}
          <div className="flex items-center space-x-1 text-xs">
            {isOnline ? (
              <Wifi className="h-3 w-3 text-green-600" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-600" />
            )}
            <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Sync status */}
          <div className="flex items-center space-x-1 text-xs">
            {syncStatus === 'synced' && <div className="h-2 w-2 bg-green-600 rounded-full" />}
            {syncStatus === 'pending' && <div className="h-2 w-2 bg-yellow-600 rounded-full animate-pulse" />}
            {syncStatus === 'error' && <div className="h-2 w-2 bg-red-600 rounded-full" />}
            <span className="text-muted-foreground">
              {syncStatus === 'synced' && 'Sincronizado'}
              {syncStatus === 'pending' && 'Sincronizando...'}
              {syncStatus === 'error' && 'Erro na sincronizacao'}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar aluno..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="flex flex-wrap gap-2 mt-4">
        <Badge variant="secondary" className="flex items-center space-x-1">
          <Users className="h-3 w-3" />
          <span>Total: {stats.total}</span>
        </Badge>
        <Badge variant="default" className="flex items-center space-x-1 bg-green-600 hover:bg-green-600">
          <UserCheck className="h-3 w-3" />
          <span>Presentes: {stats.present}</span>
        </Badge>
        <Badge variant="destructive" className="flex items-center space-x-1">
          <UserX className="h-3 w-3" />
          <span>Ausentes: {stats.absent}</span>
        </Badge>
        <Badge variant="default" className="flex items-center space-x-1 bg-yellow-500 hover:bg-yellow-500">
          <FileText className="h-3 w-3" />
          <span>Atestados: {stats.attestado}</span>
        </Badge>
        <Badge variant="outline" className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>Pendentes: {stats.pending}</span>
        </Badge>

        {/* Attendance Rate Badge with color coding */}
        {(stats.present + stats.absent + stats.attestado) > 0 && (
          <Badge
            variant="outline"
            className={cn(
              'flex items-center space-x-1 font-semibold',
              getAttendanceRateBadgeClass(stats.attendanceRate)
            )}
          >
            <span>Taxa: {stats.attendanceRate}%</span>
          </Badge>
        )}

        {/* Lock badge in statistics */}
        {lockInfo.isLocked && (
          <Badge variant="outline" className="flex items-center space-x-1 bg-orange-50 border-orange-500 text-orange-700">
            <Lock className="h-3 w-3" />
            <span>Bloqueado</span>
          </Badge>
        )}
      </div>

      {/* Batch Actions - Only show if not locked and students selected */}
      {!isEffectivelyReadonly && selectedStudents.size > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md mt-4">
          <p className="text-sm font-medium self-center">
            {selectedStudents.size} aluno(s) selecionado(s):
          </p>
          <Button
            size="sm"
            onClick={() => onBatchMark(true)}
            disabled={saving}
            className="min-h-[36px]"
          >
            <UserCheck className="h-3 w-3 mr-1" />
            Marcar Presentes
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onBatchMark(false)}
            disabled={saving}
            className="min-h-[36px]"
          >
            <UserX className="h-3 w-3 mr-1" />
            Marcar Ausentes
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onClearSelection}
            className="min-h-[36px]"
          >
            Limpar Selecao
          </Button>
        </div>
      )}

      {/* Offline warning */}
      {!isOnline && (
        <Alert variant="destructive" className="mt-4">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Voce esta offline. As marcacoes serao sincronizadas quando a conexao for reestabelecida.
          </AlertDescription>
        </Alert>
      )}
    </CardHeader>
  )
}
