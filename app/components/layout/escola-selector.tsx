'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronsUpDown, School } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useEscola } from '@/contexts/escola-context'

interface EscolaSelectorProps {
  className?: string
  collapsed?: boolean // For collapsed sidebar state
}

/**
 * EscolaSelector Component - EDUCA Design System
 *
 * Searchable combobox for escola selection (admin/gestor_sme users).
 * Uses Command + Popover pattern from shadcn/ui.
 *
 * Behavior:
 * - Returns null if user should not see selector (non-admin or single-escola users)
 * - Shows placeholder with yellow highlight when no escola selected
 * - In collapsed sidebar, shows only School icon with tooltip
 */
export function EscolaSelector({ className, collapsed }: EscolaSelectorProps) {
  const t = useTranslations('layout.schoolSelector')
  const [open, setOpen] = React.useState(false)
  const {
    escolas,
    selectedEscolaId,
    selectedEscola,
    selectEscola,
    shouldShowSelector,
    loading,
  } = useEscola()

  // Don't render if user shouldn't see selector
  if (!shouldShowSelector) {
    return null
  }

  // Loading state
  if (loading) {
    return (
      <div className={cn('w-full', className)}>
        <Button
          variant="outline"
          disabled
          className="app-school-selector w-full"
        >
          <span>{t('select')}</span>
        </Button>
      </div>
    )
  }

  // Collapsed sidebar: show icon only
  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'app-school-selector app-school-selector--collapsed',
              !selectedEscola && 'app-school-selector--empty'
            )}
            title={selectedEscola?.nome || t('select')}
            aria-label={selectedEscola?.nome || t('select')}
          >
            <School aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="app-school-popover w-[280px] p-0" align="start" side="right">
          <Command>
            <CommandInput placeholder={t('search')} />
            <CommandList>
              <CommandEmpty>{t('empty')}</CommandEmpty>
              <CommandGroup>
                {escolas.map((escola) => (
                  <CommandItem
                    key={escola.id}
                    value={escola.nome}
                    onSelect={() => {
                      selectEscola(escola.id)
                      setOpen(false)
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedEscolaId === escola.id
                          ? 'opacity-100 text-green-600'
                          : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{escola.nome}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  // Expanded sidebar: full combobox
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'app-school-selector w-full',
            !selectedEscola && 'app-school-selector--empty',
            className
          )}
          aria-label={selectedEscola?.nome || t('select')}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <School className="shrink-0" aria-hidden="true" />
            <span className="truncate">
              {selectedEscola?.nome || t('select')}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 shrink-0 opacity-60" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="app-school-popover w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('search')} />
          <CommandList>
            <CommandEmpty>{t('empty')}</CommandEmpty>
            <CommandGroup>
              {escolas.map((escola) => (
                <CommandItem
                  key={escola.id}
                  value={escola.nome}
                  onSelect={() => {
                    selectEscola(escola.id)
                    setOpen(false)
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedEscolaId === escola.id
                        ? 'opacity-100 text-green-600'
                        : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{escola.nome}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
