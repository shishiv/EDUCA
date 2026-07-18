/**
 * Sonner Toast Component
 * Task 5.3.1: Enhanced toast configuration with consistent feedback styling
 *
 * Features:
 * - Consistent styling for all toast types (success, error, info, warning)
 * - Proper positioning for desktop and mobile
 * - Accessibility compliant (WCAG 2.1 AA)
 * - Smooth animations with reduced motion support
 *
 * @see lib/toast-feedback.ts for centralized toast helpers
 */

'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Enhanced Sonner Toaster with Diario de Classe styling
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      // Position: bottom-right on desktop, bottom-center on mobile
      position="bottom-right"
      // Show at most 3 toasts at once
      visibleToasts={3}
      // Close on click
      closeButton={true}
      // Rich colors for better visibility
      richColors={true}
      // Expand toasts on hover for better readability
      expand={true}
      // Animation duration
      duration={4000}
      // Toast options with custom styling
      toastOptions={{
        classNames: {
          // Base toast styling
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg',
          // Description text
          description: 'group-[.toast]:text-muted-foreground group-[.toast]:text-sm',
          // Action button (e.g., "Desfazer")
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1.5',
          // Cancel button
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-medium group-[.toast]:rounded-md',
          // Close button
          closeButton:
            'group-[.toast]:bg-background group-[.toast]:text-foreground group-[.toast]:border-gray-200 group-[.toast]:hover:bg-gray-100',
          // Success toast (green)
          success:
            'group-[.toaster]:bg-green-50 group-[.toaster]:text-green-900 group-[.toaster]:border-green-200',
          // Error toast (red)
          error:
            'group-[.toaster]:bg-red-50 group-[.toaster]:text-red-900 group-[.toaster]:border-red-200',
          // Warning toast (amber)
          warning:
            'group-[.toaster]:bg-amber-50 group-[.toaster]:text-amber-900 group-[.toaster]:border-amber-200',
          // Info toast (blue)
          info:
            'group-[.toaster]:bg-blue-50 group-[.toaster]:text-blue-900 group-[.toaster]:border-blue-200',
          // Loading toast
          loading:
            'group-[.toaster]:bg-gray-50 group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200',
          // Title text
          title: 'group-[.toast]:font-semibold',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
