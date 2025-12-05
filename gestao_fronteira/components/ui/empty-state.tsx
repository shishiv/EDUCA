/**
 * EmptyState - Display when no data is available
 *
 * Provides visual feedback with actionable suggestions when lists or tables are empty.
 * Inspired by Notion and Google Classroom's friendly empty states.
 */

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LucideIcon, FolderOpen } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
  icon?: LucideIcon
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
}

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actions?: EmptyStateAction[]
  className?: string
  compact?: boolean
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actions = [],
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8' : 'py-12 md:py-16',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gray-100',
          compact ? 'h-12 w-12 mb-3' : 'h-16 w-16 mb-4'
        )}
      >
        <Icon className={cn('text-gray-400', compact ? 'h-6 w-6' : 'h-8 w-8')} />
      </div>

      <h3
        className={cn(
          'font-semibold text-gray-900',
          compact ? 'text-base mb-1' : 'text-lg mb-2'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'text-gray-500 max-w-sm',
            compact ? 'text-sm mb-3' : 'text-sm mb-4'
          )}
        >
          {description}
        </p>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actions.map((action, index) => {
            const ActionIcon = action.icon
            const buttonContent = (
              <>
                {ActionIcon && <ActionIcon className="h-4 w-4 mr-1.5" />}
                {action.label}
              </>
            )

            if (action.href) {
              return (
                <Button
                  key={index}
                  variant={action.variant || (index === 0 ? 'default' : 'outline')}
                  size={compact ? 'sm' : 'default'}
                  asChild
                >
                  <Link href={action.href}>{buttonContent}</Link>
                </Button>
              )
            }

            return (
              <Button
                key={index}
                variant={action.variant || (index === 0 ? 'default' : 'outline')}
                size={compact ? 'sm' : 'default'}
                onClick={action.onClick}
              >
                {buttonContent}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * TableEmptyState - Specialized empty state for table rows
 *
 * Renders as a table row spanning all columns.
 */
interface TableEmptyStateProps extends Omit<EmptyStateProps, 'compact'> {
  colSpan: number
}

export function TableEmptyState({
  colSpan,
  icon,
  title,
  description,
  actions,
  className,
}: TableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          actions={actions}
          className={className}
          compact
        />
      </td>
    </tr>
  )
}
