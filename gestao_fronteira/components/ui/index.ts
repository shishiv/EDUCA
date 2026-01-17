/**
 * shadcn/ui Components Export Index
 * Centralized exports for all UI components
 * Educational Management System - Frontend Standardization
 */

// Core shadcn/ui Components
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion'
export { Alert, AlertDescription, AlertTitle } from './alert'
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './alert-dialog'
// AspectRatio removed - unused component
export { Avatar, AvatarFallback, AvatarImage } from './avatar'
export { Badge, badgeVariants } from './badge'
export { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './breadcrumb'
export { Button, buttonVariants } from './button'
export type { ButtonProps } from './button'
export { Calendar } from './calendar'
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'
// Carousel removed - unused component
export { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from './chart'
export type { ChartConfig } from './chart'
export { Checkbox } from './checkbox'
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible'
export { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from './command'
// ContextMenu removed - unused component
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog'
export { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from './drawer'
export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './dropdown-menu'
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from './form'
// HoverCard removed - unused component
export { Input } from './input'
export type { InputProps } from './input'
export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from './input-otp'
export { Label } from './label'
export { FormField as SimpleFormField } from './form-field'
export type { FormFieldProps as SimpleFormFieldProps } from './form-field'
// Menubar removed - unused component
// NavigationMenu removed - unused component
export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './pagination'
export { Popover, PopoverContent, PopoverTrigger } from './popover'
export { Progress } from './progress'
export { RadioGroup, RadioGroupItem } from './radio-group'
export { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './resizable'
export { ScrollArea, ScrollBar } from './scroll-area'
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue } from './select'
export { Separator } from './separator'
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './sheet'
export { Skeleton } from './skeleton'
export { Slider } from './slider'
export { Switch } from './switch'
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './table'
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
export { Textarea } from './textarea'
export { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from './toast'
export { Toaster } from './toaster'
export { Toggle, toggleVariants } from './toggle'
export { ToggleGroup, ToggleGroupItem } from './toggle-group'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

// Custom UI Components for Educational System
export { ErrorBoundary } from './error-boundary'
export {
  LoadingButton,
  LoadingSpinner as LoadingStatesSpinner,
  LoadingCenter,
  PageLoading,
  TableLoading,
  CardLoading,
  ListLoading,
  InlineLoading,
  RefreshButton,
  OverlayLoading,
} from './loading-states'

// New Loading Components (Task 5.3.2)
export {
  LoadingSpinner,
  LoadingOverlay,
  LoadingInline,
  ButtonLoading,
  LoadingCard,
  LoadingTable,
  LoadingProgress,
} from './loading-spinner'

// Brazilian Educational Input Components
export { CPFInput, BrazilianPhoneInput, CEPInput, BrazilianDateInput, BrazilianInputHelp } from './brazilian-inputs'

// Brazilian Educational Help System
export {
  EducationalTooltip,
  EducationalHelpCard,
  EducationalHelpIcon,
  ComplianceAlert,
  EducationalQuickReference,
  BRAZILIAN_EDU_TERMS
} from './brazilian-educational-help'
export type { TermKey } from './brazilian-educational-help'

// Mobile-First Responsive Components
export {
  ResponsiveDataTable,
  StudentDataTable
} from './responsive-data-table'

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
  MobileResponsiveDialogCloseButton,
  EducationalFormDialog,
  MobileConfirmationDialog
} from './mobile-responsive-dialog'

// Sonner Toast Integration
export { Toaster as SonnerToaster } from './sonner'

// EDUCA Composite Components (Phase 02)
export { StatCard } from './stat-card'
export type { StatCardProps } from './stat-card'
export { AlertItem } from './alert-item'
export type { AlertItemProps } from './alert-item'
export { CampoExperiencia } from './campo-experiencia'
export type { CampoExperienciaProps, CampoType } from './campo-experiencia'
export { AttendanceButton, attendanceButtonVariants } from './attendance-button'
export type { AttendanceButtonProps } from './attendance-button'
