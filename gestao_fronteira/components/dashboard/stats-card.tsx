import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className
}: StatsCardProps) {
  return (
    <Card className={cn(
      'stat-card transition-all duration-200 hover:shadow-md border border-transparent shadow-sm',
      variant === 'primary' && 'bg-blue-50 hover:bg-blue-100 hover:border-blue-300',
      variant === 'secondary' && 'bg-green-50 hover:bg-green-100 hover:border-green-300',
      variant === 'accent' && 'bg-amber-50 hover:bg-amber-100 hover:border-amber-300',
      variant === 'warning' && 'bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-300',
      variant === 'emerald' && 'bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300',
      variant === 'violet' && 'bg-violet-50 hover:bg-violet-100 hover:border-violet-300',
      variant === 'rose' && 'bg-rose-50 hover:bg-rose-100 hover:border-rose-300',
      variant === 'default' && 'bg-white hover:bg-gray-50 hover:border-gray-300',
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600 leading-tight">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
            variant === 'primary' && 'bg-blue-100 text-blue-600',
            variant === 'secondary' && 'bg-green-100 text-green-600',
            variant === 'accent' && 'bg-amber-100 text-amber-600',
            variant === 'warning' && 'bg-yellow-100 text-yellow-600',
            variant === 'emerald' && 'bg-emerald-100 text-emerald-600',
            variant === 'violet' && 'bg-violet-100 text-violet-600',
            variant === 'rose' && 'bg-rose-100 text-rose-600',
            variant === 'default' && 'bg-gray-100 text-gray-600'
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}