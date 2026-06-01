import * as React from "react"
import { cn } from "@/lib/utils"

export type CampoType = "eu" | "corpo" | "tracos" | "escuta" | "espacos"

export interface CampoExperienciaProps {
  campo: CampoType
  title: string
  subtitle?: string
  progress?: number // 0-100
  icon?: string // emoji
  onClick?: () => void
  className?: string
}

const campoConfig: Record<CampoType, { color: string; bgLight: string; progressBg: string; emoji: string }> = {
  eu: {
    color: "text-campo-eu",
    bgLight: "bg-pink-100",
    progressBg: "bg-pink-500",
    emoji: "🤝"
  },
  corpo: {
    color: "text-campo-corpo",
    bgLight: "bg-orange-100",
    progressBg: "bg-orange-500",
    emoji: "🏃"
  },
  tracos: {
    color: "text-campo-tracos",
    bgLight: "bg-violet-100",
    progressBg: "bg-violet-500",
    emoji: "🎵"
  },
  escuta: {
    color: "text-campo-escuta",
    bgLight: "bg-sky-100",
    progressBg: "bg-sky-500",
    emoji: "💬"
  },
  espacos: {
    color: "text-campo-espacos",
    bgLight: "bg-emerald-100",
    progressBg: "bg-emerald-500",
    emoji: "🌍"
  },
}

export function CampoExperiencia({
  campo,
  title,
  subtitle,
  progress,
  icon,
  onClick,
  className,
}: CampoExperienciaProps) {
  const config = campoConfig[campo]
  const displayIcon = icon || config.emoji

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      } : undefined}
      className={cn(
        "bg-white rounded-[16px] p-5 border-2 border-gray-100 transition-all text-center",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.08]",
        className
      )}
    >
      <div className={cn(
        "w-14 h-14 rounded-[14px] flex items-center justify-center mx-auto mb-3 text-2xl",
        config.bgLight
      )}>
        {displayIcon}
      </div>
      <h4 className="font-display text-[0.85rem] font-semibold text-gray-800 mb-1 leading-tight">
        {title}
      </h4>
      {subtitle && (
        <p className="text-[0.7rem] text-gray-500">{subtitle}</p>
      )}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", config.progressBg)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}
