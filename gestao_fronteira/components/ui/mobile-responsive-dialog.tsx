/**
 * Mobile-Responsive Dialog Components
 * Optimized for tablet and mobile viewport constraints
 * Full-screen dialogs on mobile, centered dialogs on desktop
 */

'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const MobileResponsiveDialog = DialogPrimitive.Root

const MobileResponsiveDialogTrigger = DialogPrimitive.Trigger

const MobileResponsiveDialogPortal = DialogPrimitive.Portal

const MobileResponsiveDialogClose = DialogPrimitive.Close

const MobileResponsiveDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
MobileResponsiveDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const MobileResponsiveDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    position?: 'center' | 'top' | 'bottom'
  }
>(({ className, size = 'md', position = 'center', children, ...props }, ref) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full'
  }

  const positionClasses = {
    center: 'top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]',
    top: 'top-[10%] left-[50%] translate-x-[-50%]',
    bottom: 'bottom-[10%] left-[50%] translate-x-[-50%]'
  }

  return (
    <MobileResponsiveDialogPortal>
      <MobileResponsiveDialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Base styles
          "fixed z-50 grid w-full gap-4 border bg-background p-6 shadow-lg duration-200",
          // Desktop styles - centered dialog
          "hidden md:grid md:rounded-lg",
          sizeClasses[size],
          positionClasses[position],
          // Animation for desktop
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>

      {/* Mobile full-screen version */}
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Mobile styles - full screen
          "fixed inset-0 z-50 grid w-full gap-4 bg-background p-4 shadow-lg duration-200 md:hidden",
          // Safe area padding for mobile devices
          "pt-safe-top pb-safe-bottom",
          // Animation for mobile
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </MobileResponsiveDialogPortal>
  )
})
MobileResponsiveDialogContent.displayName = DialogPrimitive.Content.displayName

const MobileResponsiveDialogHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      // Mobile header styling
      "md:flex-row md:items-center md:justify-between md:space-y-0",
      className
    )}
    {...props}
  >
    {children}
  </div>
)
MobileResponsiveDialogHeader.displayName = "MobileResponsiveDialogHeader"

const MobileResponsiveDialogFooter = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      // Mobile footer styling with full-width buttons
      "space-y-2 space-y-reverse sm:space-y-0",
      // Sticky footer for mobile
      "md:relative md:mt-auto",
      className
    )}
    {...props}
  >
    {children}
  </div>
)
MobileResponsiveDialogFooter.displayName = "MobileResponsiveDialogFooter"

const MobileResponsiveDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      // Mobile title styling
      "flex-1 text-left md:text-left",
      className
    )}
    {...props}
  />
))
MobileResponsiveDialogTitle.displayName = DialogPrimitive.Title.displayName

const MobileResponsiveDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
MobileResponsiveDialogDescription.displayName = DialogPrimitive.Description.displayName

/**
 * Mobile Close Button Component
 * Positioned appropriately for mobile and desktop
 */
const MobileResponsiveDialogCloseButton = ({
  className,
  variant = 'ghost',
  ...props
}: React.ComponentProps<typeof Button> & { variant?: 'ghost' | 'outline' }) => (
  <DialogPrimitive.Close asChild>
    <Button
      variant={variant}
      size="sm"
      className={cn(
        "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
        // Mobile styling
        "h-10 w-10 md:h-8 md:w-8",
        className
      )}
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Fechar</span>
    </Button>
  </DialogPrimitive.Close>
)

/**
 * Educational Form Dialog Component
 * Specialized for Brazilian educational forms with proper mobile layout
 */
interface EducationalFormDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function EducationalFormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'lg',
  className
}: EducationalFormDialogProps) {
  return (
    <MobileResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <MobileResponsiveDialogContent size={size} className={className}>
        <MobileResponsiveDialogHeader>
          <div className="flex-1">
            <MobileResponsiveDialogTitle>{title}</MobileResponsiveDialogTitle>
            {description && (
              <MobileResponsiveDialogDescription>
                {description}
              </MobileResponsiveDialogDescription>
            )}
          </div>
          <MobileResponsiveDialogCloseButton />
        </MobileResponsiveDialogHeader>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {footer && (
          <MobileResponsiveDialogFooter>
            {footer}
          </MobileResponsiveDialogFooter>
        )}
      </MobileResponsiveDialogContent>
    </MobileResponsiveDialog>
  )
}

/**
 * Confirmation Dialog Component
 * Mobile-optimized confirmation dialogs with proper touch targets
 */
interface MobileConfirmationDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: 'default' | 'destructive'
}

export function MobileConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'default'
}: MobileConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange?.(false)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange?.(false)
  }

  return (
    <MobileResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <MobileResponsiveDialogContent size="sm">
        <MobileResponsiveDialogHeader>
          <MobileResponsiveDialogTitle>{title}</MobileResponsiveDialogTitle>
          <MobileResponsiveDialogCloseButton />
        </MobileResponsiveDialogHeader>

        <MobileResponsiveDialogDescription className="py-4">
          {description}
        </MobileResponsiveDialogDescription>

        <MobileResponsiveDialogFooter>
          <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </MobileResponsiveDialogFooter>
      </MobileResponsiveDialogContent>
    </MobileResponsiveDialog>
  )
}

export {
  MobileResponsiveDialog,
  MobileResponsiveDialogPortal,
  MobileResponsiveDialogOverlay,
  MobileResponsiveDialogClose,
  MobileResponsiveDialogTrigger,
  MobileResponsiveDialogContent,
  MobileResponsiveDialogHeader,
  MobileResponsiveDialogFooter,
  MobileResponsiveDialogTitle,
  MobileResponsiveDialogDescription,
  MobileResponsiveDialogCloseButton
}