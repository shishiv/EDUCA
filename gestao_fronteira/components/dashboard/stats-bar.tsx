/**
 * StatsBar - Compact inline statistics component (Google Classroom style)
 *
 * A horizontal bar showing key metrics in a compact format.
 * Use this as an alternative to StatsCard grid for a more compact UI.
 */

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatItem {
  label: string
  value: number | string
  icon?: LucideIcon
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

interface StatsBarProps {
  stats: StatItem[]
  className?: string
}

const variantStyles = {
  default: 'text-gray-600',
  success: 'text-green-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  info: 'text-blue-600',
}

export function StatsBar({ stats, className }: StatsBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-4 md:gap-6 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200',
        className
      )}
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const variant = stat.variant || 'default'

        return (
          <div key={index} className="flex items-center gap-2">
            {Icon && (
              <Icon
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  variantStyles[variant]
                )}
              />
            )}
            <span className="text-sm text-gray-500">{stat.label}</span>
            <span
              className={cn(
                'font-semibold text-sm',
                variantStyles[variant]
              )}
            >
              {stat.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Example usage:
 *
 * <StatsBar
 *   stats={[
 *     { label: 'Total', value: 150, icon: Users, variant: 'default' },
 *     { label: 'Ativos', value: 145, icon: UserCheck, variant: 'success' },
 *     { label: 'Pendentes', value: 5, icon: Clock, variant: 'warning' },
 *   ]}
 * />
 *
 * Renders: [Users] Total 150  •  [UserCheck] Ativos 145  •  [Clock] Pendentes 5
 */
