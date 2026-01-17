import { cn } from '@/lib/utils'

interface TurmaCardGridProps {
  children: React.ReactNode
  className?: string
}

export function TurmaCardGrid({ children, className }: TurmaCardGridProps) {
  return (
    <div className={cn(
      'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
      className
    )}>
      {children}
    </div>
  )
}
