import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertTriangle, AlertCircle, Info, CheckCircle, type LucideIcon } from "lucide-react"

export interface AlertItemProps {
  severity: "warning" | "error" | "info" | "success"
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}

export function AlertItem({
  severity,
  icon,
  children,
  className,
}: AlertItemProps) {
  const severityClasses = {
    warning: "bg-yellow-100 text-amber-800",
    error: "bg-red-50 text-red-800",
    info: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
  }

  const defaultIcons: Record<string, LucideIcon> = {
    warning: AlertTriangle,
    error: AlertCircle,
    info: Info,
    success: CheckCircle,
  }

  const Icon = icon || defaultIcons[severity]

  return (
    <div className={cn(
      "flex gap-3 p-3.5 rounded-[10px] text-[0.85rem]",
      severityClasses[severity],
      className
    )}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}
