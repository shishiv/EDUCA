import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface StatsCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'warning' | 'emerald' | 'violet' | 'rose'
  className?: string
}

const cardStyles = {
  default: {
    card: 'bg-white hover:bg-gray-50 hover:border-gray-300',
    icon: 'bg-gray-100 text-gray-600',
  },
  primary: {
    card: 'bg-blue-50 hover:bg-blue-100 hover:border-blue-300',
    icon: 'bg-blue-100 text-blue-600',
  },
  secondary: {
    card: 'bg-green-50 hover:bg-green-100 hover:border-green-300',
    icon: 'bg-green-100 text-green-600',
  },
  accent: {
    card: 'bg-amber-50 hover:bg-amber-100 hover:border-amber-300',
    icon: 'bg-amber-100 text-amber-600',
  },
  warning: {
    card: 'bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-300',
    icon: 'bg-yellow-100 text-yellow-600',
  },
  emerald: {
    card: 'bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300',
    icon: 'bg-emerald-100 text-emerald-600',
  },
  violet: {
    card: 'bg-violet-50 hover:bg-violet-100 hover:border-violet-300',
    icon: 'bg-violet-100 text-violet-600',
  },
  rose: {
    card: 'bg-rose-50 hover:bg-rose-100 hover:border-rose-300',
    icon: 'bg-rose-100 text-rose-600',
  },
} satisfies Record<NonNullable<StatsCardProps['variant']>, { card: string; icon: string }>

export function StatsCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  className,
}: StatsCardProps) {
  const styles = cardStyles[variant]

  return (
    <Card className={cn(
      'stat-card border border-transparent shadow-sm transition-all duration-200 hover:shadow-md',
      styles.card,
      className,
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium leading-tight text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
            styles.icon,
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
