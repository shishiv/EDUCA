'use client'

import React from 'react'
import Link from 'next/link'
import { useNavigation } from './navigation-provider'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Home, Clock, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedBreadcrumbsProps {
  className?: string
  showRecentlyVisited?: boolean
  maxVisible?: number
}

export function EnhancedBreadcrumbs({
  className,
  showRecentlyVisited = true,
  maxVisible = 3
}: EnhancedBreadcrumbsProps) {
  const { breadcrumbs, lastVisitedPages, pageTitle } = useNavigation()

  // Show only the most recent breadcrumbs if there are too many
  const visibleBreadcrumbs = breadcrumbs.length > maxVisible
    ? [breadcrumbs[0], ...breadcrumbs.slice(-2)]
    : breadcrumbs

  const hiddenBreadcrumbs = breadcrumbs.length > maxVisible
    ? breadcrumbs.slice(1, -2)
    : []

  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-4 mb-6', className)}>
      {/* Main Breadcrumbs */}
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {/* Home/Dashboard with icon */}
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {visibleBreadcrumbs.length > 1 && <BreadcrumbSeparator />}

          {/* Show ellipsis if there are hidden breadcrumbs */}
          {hiddenBreadcrumbs.length > 0 && (
            <>
              <BreadcrumbItem>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1">
                    <span>...</span>
                    <ChevronDown className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {hiddenBreadcrumbs.map((item, index) => (
                      <DropdownMenuItem key={index} asChild>
                        <Link href={item.href}>{item.name}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}

          {/* Visible breadcrumbs (excluding the first dashboard one) */}
          {visibleBreadcrumbs.slice(1).map((item, index) => {
            const isLast = index === visibleBreadcrumbs.slice(1).length - 1

            return (
              <React.Fragment key={item.href}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="font-medium text-municipal-primary">
                      {item.name}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={item.href} className="hover:text-municipal-primary">
                        {item.name}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Recently Visited Pages - Desktop Only */}
      {showRecentlyVisited && lastVisitedPages.length > 0 && (
        <div className="hidden lg:flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-municipal-gray-500 hover:text-municipal-primary"
              >
                <Clock className="h-4 w-4 mr-2" />
                Recentes
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {lastVisitedPages.map((page) => (
                <DropdownMenuItem key={page.href} asChild>
                  <Link href={page.href} className="flex items-center gap-2">
                    {page.icon && <page.icon className="h-4 w-4" />}
                    <span>{page.name}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}

// Quick action for setting custom breadcrumbs
export function PageHeader({
  title,
  description,
  action,
  breadcrumbs
}: {
  title: string
  description?: string
  action?: React.ReactNode
  breadcrumbs?: Array<{ name: string; href: string }>
}) {
  const { setBreadcrumbs, setPageTitle } = useNavigation()

  React.useEffect(() => {
    setPageTitle(title)
    if (breadcrumbs) {
      setBreadcrumbs([
        { name: 'Dashboard', href: '/dashboard' },
        ...breadcrumbs
      ])
    }
  }, [title, breadcrumbs, setBreadcrumbs, setPageTitle])

  return (
    <div className="space-y-4">
      <EnhancedBreadcrumbs />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-gray-600 mt-1">{description}</p>
          )}
        </div>
        {action && (
          <div className="flex items-center space-x-3">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}