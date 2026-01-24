/**
 * shadcn/ui Components Export Index
 * Centralized exports for all UI components
 * Educational Management System - Frontend Standardization
 */

// Core shadcn/ui Components
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion'
export { Alert, AlertDescription, AlertTitle } from './alert'
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './alert-dialog'
export { Avatar, AvatarFallback, AvatarImage } from './avatar'
export { Badge, badgeVariants } from './badge'
export { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './breadcrumb'
export { Button, buttonVariants } from './button'
export type { ButtonProps } from './button'
export { Calendar } from './calendar'
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'
export { Checkbox } from './checkbox'
export { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from './command'
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog'
export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './dropdown-menu'
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from './form'
export { Input } from './input'
export type { InputProps } from './input'
export { Label } from './label'
export { Popover, PopoverContent, PopoverTrigger } from './popover'
export { Progress } from './progress'
export { ScrollArea, ScrollBar } from './scroll-area'
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue } from './select'
export { Separator } from './separator'
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './sheet'
export { Skeleton } from './skeleton'
export { Switch } from './switch'
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './table'
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
export { Textarea } from './textarea'
export { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from './toast'
export { Toaster } from './toaster'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

// Custom UI Components for Educational System
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

// Mobile-First Responsive Components
export {
  ResponsiveDataTable,
  StudentDataTable
} from './responsive-data-table'

// Sonner Toast Integration
export { Toaster as SonnerToaster } from './sonner'

// EDUCA Composite Components
export { StatCard } from './stat-card'
export type { StatCardProps } from './stat-card'
export { AlertItem } from './alert-item'
export type { AlertItemProps } from './alert-item'
export { CampoExperiencia } from './campo-experiencia'
export type { CampoExperienciaProps, CampoType } from './campo-experiencia'
export { EscolaRequiredState } from './escola-required-state'
export { PageHeader } from './page-header'
