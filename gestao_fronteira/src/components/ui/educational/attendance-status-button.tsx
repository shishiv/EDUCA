"use client";

import React, { forwardRef, useState, useCallback } from "react";
import { Button } from "../../../../components/ui/button";
import { cn } from "@/lib/utils";
import { CheckIcon, XIcon, ClockIcon, UserIcon } from "lucide-react";

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'pending';

export interface AttendanceStatusButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Current attendance status */
  status: AttendanceStatus;
  /** Callback when status changes */
  onStatusChange?: (status: AttendanceStatus) => void;
  /** Student name for accessibility */
  studentName?: string;
  /** Show confirmation state before final selection */
  requireConfirmation?: boolean;
  /** Custom status labels in Portuguese */
  statusLabels?: Partial<Record<AttendanceStatus, string>>;
  /** Size variant for touch optimization */
  size?: 'sm' | 'default' | 'lg' | 'touch';
  /** Show status text alongside icon */
  showStatusText?: boolean;
  /** Disable certain status options */
  disabledStatuses?: AttendanceStatus[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Attendance Status Button Component for Brazilian educational attendance tracking
 *
 * Features:
 * - Touch-optimized button sizes for tablet/mobile use
 * - Brazilian Portuguese status labels
 * - Confirmation states to prevent accidental marking
 * - Accessibility support with proper ARIA labels
 * - Visual feedback with Brazilian educational colors
 * - Keyboard navigation support
 * - Compliance with Brazilian attendance regulations
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AttendanceStatusButton
 *   status="pending"
 *   onStatusChange={(status) => markAttendance(studentId, status)}
 *   studentName="João Silva"
 * />
 *
 * // Touch-optimized with confirmation
 * <AttendanceStatusButton
 *   status="present"
 *   onStatusChange={(status) => markAttendance(studentId, status)}
 *   studentName="Maria Santos"
 *   size="touch"
 *   requireConfirmation={true}
 *   showStatusText={true}
 * />
 * ```
 */
export const AttendanceStatusButton = forwardRef<HTMLButtonElement, AttendanceStatusButtonProps>(
  (
    {
      status,
      onStatusChange,
      studentName,
      requireConfirmation = false,
      statusLabels = {},
      size = 'default',
      showStatusText = false,
      disabledStatuses = [],
      className,
      ...props
    },
    ref
  ) => {
    const [confirmingStatus, setConfirmingStatus] = useState<AttendanceStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Default Portuguese labels for Brazilian educational context
    const defaultStatusLabels: Record<AttendanceStatus, string> = {
      present: 'Presente',
      absent: 'Faltou',
      late: 'Atrasado',
      pending: 'Pendente',
      ...statusLabels
    };

    /**
     * Get status configuration with Brazilian educational styling
     */
    const getStatusConfig = useCallback((currentStatus: AttendanceStatus) => {
      const baseConfig = {
        present: {
          icon: CheckIcon,
          label: defaultStatusLabels.present,
          className: 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:border-green-700 dark:text-green-200 dark:hover:bg-green-800',
          ariaLabel: 'Marcar como presente'
        },
        absent: {
          icon: XIcon,
          label: defaultStatusLabels.absent,
          className: 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-800',
          ariaLabel: 'Marcar como faltou'
        },
        late: {
          icon: ClockIcon,
          label: defaultStatusLabels.late,
          className: 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200 dark:hover:bg-yellow-800',
          ariaLabel: 'Marcar como atrasado'
        },
        pending: {
          icon: UserIcon,
          label: defaultStatusLabels.pending,
          className: 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700',
          ariaLabel: 'Aguardando marcação'
        }
      };

      return baseConfig[currentStatus];
    }, [defaultStatusLabels]);

    /**
     * Get size classes for touch optimization
     */
    const getSizeClasses = useCallback((sizeVariant: typeof size) => {
      switch (sizeVariant) {
        case 'sm':
          return 'h-8 px-2 text-xs';
        case 'lg':
          return 'h-12 px-6 text-base';
        case 'touch':
          return 'h-14 px-8 text-lg min-w-[3.5rem] touch-manipulation'; // Optimized for tablets
        default:
          return 'h-10 px-4 text-sm';
      }
    }, []);

    /**
     * Get next status in cycle for tap-to-change behavior
     */
    const getNextStatus = useCallback((currentStatus: AttendanceStatus): AttendanceStatus => {
      const statusCycle: AttendanceStatus[] = ['pending', 'present', 'absent', 'late'];
      const availableStatuses = statusCycle.filter(s => !disabledStatuses.includes(s));
      const currentIndex = availableStatuses.indexOf(currentStatus);
      const nextIndex = (currentIndex + 1) % availableStatuses.length;
      return availableStatuses[nextIndex];
    }, [disabledStatuses]);

    /**
     * Handle button click with optional confirmation
     */
    const handleClick = useCallback(async () => {
      if (isLoading) return;

      const nextStatus = getNextStatus(status);

      if (requireConfirmation && confirmingStatus !== nextStatus) {
        setConfirmingStatus(nextStatus);
        // Auto-cancel confirmation after 3 seconds
        setTimeout(() => setConfirmingStatus(null), 3000);
        return;
      }

      setIsLoading(true);

      try {
        await onStatusChange?.(nextStatus);
        setConfirmingStatus(null);
      } catch (error) {
        // console.error('Failed to update attendance:', error);
      } finally {
        setIsLoading(false);
      }
    }, [status, onStatusChange, requireConfirmation, confirmingStatus, getNextStatus, isLoading]);

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
      props.onKeyDown?.(event);
    }, [handleClick, props.onKeyDown]);

    const currentConfig = getStatusConfig(status);
    const confirmingConfig = confirmingStatus ? getStatusConfig(confirmingStatus) : null;
    const displayConfig = confirmingConfig || currentConfig;
    const Icon = displayConfig.icon;

    const isDisabled = disabledStatuses.includes(status) || isLoading || props.disabled;

    return (
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        className={cn(
          'relative transition-all duration-200 border-2 font-medium',
          getSizeClasses(size),
          displayConfig.className,
          isLoading && 'opacity-50 cursor-wait',
          confirmingStatus && 'ring-2 ring-primary ring-offset-2 scale-105',
          className
        )}
        aria-label={
          studentName
            ? `${displayConfig.ariaLabel} para ${studentName}`
            : displayConfig.ariaLabel
        }
        aria-describedby={confirmingStatus ? 'attendance-confirmation' : undefined}
        data-testid={`attendance-button-${status}`}
        title={
          confirmingStatus
            ? `Confirmar: ${confirmingConfig?.label} para ${studentName || 'aluno'}`
            : `${displayConfig.label} - Clique para alterar`
        }
        {...props}
      >
        <span className="flex items-center gap-2">
          {/* Status icon */}
          <Icon className={cn(
            'transition-transform',
            size === 'touch' ? 'h-5 w-5' : 'h-4 w-4',
            isLoading && 'animate-pulse'
          )} />

          {/* Status text */}
          {showStatusText && (
            <span className={cn(
              'font-medium',
              size === 'sm' && 'hidden sm:inline'
            )}>
              {displayConfig.label}
            </span>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
            </div>
          )}
        </span>

        {/* Confirmation state indicator */}
        {confirmingStatus && (
          <div
            id="attendance-confirmation"
            className="sr-only"
            aria-live="polite"
          >
            Confirme: {confirmingConfig?.label}
          </div>
        )}
      </Button>
    );
  }
);

AttendanceStatusButton.displayName = "AttendanceStatusButton";

export default AttendanceStatusButton;