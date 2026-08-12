import * as React from "react"
import { cn } from "@/lib/utils"
import { type LucideIcon } from "lucide-react"

export interface StatCardProps {
  icon: LucideIcon
  iconColor?: "green" | "blue" | "yellow" | "pink"
  value: string | number
  label: string
  trend?: {
    value: string
    direction: "up" | "down"
  }
  className?: string
}

export function StatCard({
  icon: Icon,
  iconColor = "green",
  value,
  label,
  trend,
  className,
}: StatCardProps) {
  const iconColorClasses = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-500",
    yellow: "bg-yellow-100 text-amber-600",
    pink: "bg-pink-100 text-pink-400",
  }

  return (
    <div className={cn(
      "bg-white rounded-educa-md p-6 border border-gray-200 transition-colors hover:border-green-300",
      className
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "w-10 h-10 rounded-educa flex items-center justify-center",
          iconColorClasses[iconColor]
        )}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-semibold px-2 py-1 rounded-md",
            trend.direction === "up"
              ? "bg-green-100 text-green-600"
              : "bg-pink-100 text-pink-400"
          )}>
            {trend.direction === "up" ? "+" : ""}{trend.value}
          </span>
        )}
      </div>
      <p className="font-display text-3xl font-bold text-gray-800 mb-1">
        {value}
      </p>
      <p className="text-[0.85rem] text-gray-500">{label}</p>
    </div>
  )
}
