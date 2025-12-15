import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  variant?: 'default' | 'green' | 'blue' | 'yellow' | 'pink'
  className?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  change,
  changeType = 'neutral',
  variant = 'default',
  className
}: StatsCardProps) {
  // Default icon styles based on variant
  const getIconStyles = () => {
    if (iconBg && iconColor) {
      return { bg: iconBg, color: iconColor }
    }
    switch (variant) {
      case 'green':
        return { bg: 'bg-jardim-green-100', color: 'text-jardim-green-600' }
      case 'blue':
        return { bg: 'bg-jardim-blue-100', color: 'text-jardim-blue-500' }
      case 'yellow':
        return { bg: 'bg-jardim-yellow-100', color: 'text-amber-600' }
      case 'pink':
        return { bg: 'bg-jardim-pink-100', color: 'text-jardim-pink-400' }
      default:
        return { bg: 'bg-gray-100', color: 'text-gray-600' }
    }
  }

  const iconStyles = getIconStyles()

  return (
    <Card className={cn(
      'bg-white rounded-card border border-gray-200 shadow-card hover:shadow-card-hover transition-all duration-200',
      className
    )}>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={cn(
            "w-12 h-12 rounded-nav-item flex items-center justify-center flex-shrink-0",
            iconStyles.bg,
            iconStyles.color
          )}>
            <Icon className="h-6 w-6" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-display text-2xl font-bold text-gray-800">
              {value}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {title}
            </p>
          </div>

          {/* Change indicator */}
          {change && (
            <div className={cn(
              "text-sm font-semibold px-2 py-1 rounded-md",
              changeType === 'up' && "text-jardim-green-600 bg-jardim-green-50",
              changeType === 'down' && "text-red-600 bg-red-50",
              changeType === 'neutral' && "text-gray-600 bg-gray-50"
            )}>
              {changeType === 'up' && '+'}
              {change}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
