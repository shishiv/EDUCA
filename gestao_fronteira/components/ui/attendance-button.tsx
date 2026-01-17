import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const attendanceButtonVariants = cva(
  "px-4 py-2 border-2 rounded-lg font-sans text-[0.8rem] font-medium transition-all cursor-pointer",
  {
    variants: {
      status: {
        none: "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
        present: "border-green-400 bg-green-100 text-green-600",
        absent: "border-red-300 bg-red-50 text-red-600",
        justified: "border-yellow-300 bg-yellow-100 text-amber-700",
      },
    },
    defaultVariants: {
      status: "none",
    },
  }
)

export interface AttendanceButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof attendanceButtonVariants> {
  children?: React.ReactNode
}

const statusLabels: Record<string, string> = {
  none: "\u2014", // em dash
  present: "Presente",
  absent: "Falta",
  justified: "Justif.",
}

export function AttendanceButton({
  status,
  children,
  className,
  ...props
}: AttendanceButtonProps) {
  return (
    <button
      className={cn(attendanceButtonVariants({ status }), className)}
      {...props}
    >
      {children || statusLabels[status || "none"]}
    </button>
  )
}

export { attendanceButtonVariants }
