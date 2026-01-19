'use client'

import * as React from 'react'
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
          className="w-full justify-between rounded-[10px] px-3 py-2 h-10"
        >
          <span className="text-sm text-gray-400">Carregando...</span>
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
              'w-10 h-10 p-0 justify-center rounded-[10px]',
              selectedEscola
                ? 'text-green-600 bg-green-50 hover:bg-green-100'
                : 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
            )}
            title={selectedEscola?.nome || 'Selecione uma escola'}
          >
            <School className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start" side="right">
          <Command>
            <CommandInput placeholder="Buscar escola..." />
            <CommandList>
              <CommandEmpty>Nenhuma escola encontrada.</CommandEmpty>
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
            'w-full justify-between rounded-[10px] px-3 py-2 h-10 text-left font-normal',
            !selectedEscola && 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <School className={cn(
              'h-4 w-4 flex-shrink-0',
              selectedEscola ? 'text-green-600' : 'text-yellow-600'
            )} />
            <span className={cn(
              'truncate text-sm',
              selectedEscola ? 'text-gray-700' : 'text-yellow-700'
            )}>
              {selectedEscola?.nome || 'Selecione uma escola'}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar escola..." />
          <CommandList>
            <CommandEmpty>Nenhuma escola encontrada.</CommandEmpty>
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
