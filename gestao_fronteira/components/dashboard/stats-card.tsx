import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'warning'
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
      'stat-card',
      variant === 'primary' && 'stat-card-primary',
      variant === 'secondary' && 'stat-card-secondary', 
      variant === 'accent' && 'stat-card-accent',
      variant === 'warning' && 'stat-card-warning',
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <div className={cn(
                "flex items-center text-sm",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                <span className="font-medium">
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
                <span className="text-gray-500 ml-1">vs mês anterior</span>
              </div>
            )}
          </div>
          <div className={cn(
            "h-12 w-12 rounded-lg flex items-center justify-center",
            variant === 'primary' && 'bg-blue-100 text-blue-600',
            variant === 'secondary' && 'bg-green-100 text-green-600',
            variant === 'accent' && 'bg-orange-100 text-orange-600',
            variant === 'warning' && 'bg-yellow-100 text-yellow-600',
            variant === 'default' && 'bg-gray-100 text-gray-600'
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}