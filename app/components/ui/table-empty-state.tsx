'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableRow, TableCell } from '@/components/ui/table'
import Link from 'next/link'

interface EmptyAction {
  label: string
  href?: string
  onClick?: () => void
  icon?: LucideIcon
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
}

interface TableEmptyStateProps {
  colSpan: number
  icon?: LucideIcon
  title: string
  description?: string
  actions?: EmptyAction[]
}

export function TableEmptyState({
  colSpan,
  icon: Icon,
  title,
  description,
  actions,
}: TableEmptyStateProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          {Icon && (
            <div className="rounded-full bg-gray-100 p-3">
              <Icon className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">{title}</p>
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
          {actions && actions.length > 0 && (
            <div className="flex gap-2">
              {actions.map((action, idx) => {
                const ActionIcon = action.icon
                const btn = (
                  <Button
                    key={idx}
                    variant={action.variant || 'default'}
                    size="sm"
                    onClick={action.onClick}
                  >
                    {ActionIcon && <ActionIcon className="h-4 w-4 mr-1" />}
                    {action.label}
                  </Button>
                )
                return action.href ? (
                  <Link key={idx} href={action.href}>
                    {btn}
                  </Link>
                ) : (
                  btn
                )
              })}
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
