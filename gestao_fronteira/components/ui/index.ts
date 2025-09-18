/**
 * shadcn/ui Components Export Index
 * Centralized exports for all UI components
 * Educational Management System - Frontend Standardization
 */

// Core shadcn/ui Components
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion'
export { Alert, AlertDescription, AlertTitle } from './alert'
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './alert-dialog'
export { AspectRatio } from './aspect-ratio'
export { Avatar, AvatarFallback, AvatarImage } from './avatar'
export { Badge, badgeVariants } from './badge'
export { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './breadcrumb'
export { Button, ButtonProps, buttonVariants } from './button'
export { Calendar } from './calendar'
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'
export { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './carousel'
export { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from './chart'
export { Checkbox } from './checkbox'
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible'
export { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from './command'
export { ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from './context-menu'
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog'
export { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from './drawer'
export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './dropdown-menu'
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from './form'
export { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card'
export { Input, InputProps } from './input'
export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from './input-otp'
export { Label } from './label'
export { Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from './menubar'
export { navigationMenuTriggerStyle, NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, NavigationMenuViewport } from './navigation-menu'
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
export { LoadingButton, LoadingSpinner, LoadingCard, LoadingSkeleton } from './loading-states'

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
export { toast } from './sonner'