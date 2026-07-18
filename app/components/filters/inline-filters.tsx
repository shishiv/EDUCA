/**
 * InlineFilters - Compact filter controls (Google Classroom style)
 *
 * Inline filter bar that sits directly above tables without a card wrapper.
 * Provides search + dropdown filters in a clean horizontal layout.
 */

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FilterOption {
  value: string
  label: string
}

interface SelectFilter {
  id: string
  placeholder: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  width?: string
}

interface InlineFiltersProps {
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  filters?: SelectFilter[]
  onClearAll?: () => void
  className?: string
}

export function InlineFilters({
  search,
  filters = [],
  onClearAll,
  className,
}: InlineFiltersProps) {
  const hasActiveFilters =
    (search && search.value.length > 0) ||
    filters.some((f) => f.value !== 'todos' && f.value !== '')

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center gap-3 py-3',
        className
      )}
    >
      {/* Search input */}
      {search && (
        <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={search.placeholder || 'Buscar...'}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {search.value && (
            <button
              onClick={() => search.onChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Filter dropdowns */}
      {filters.map((filter) => (
        <Select key={filter.id} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger
            className={cn('h-9 text-sm', filter.width || 'w-full sm:w-40')}
          >
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {/* Clear all button */}
      {hasActiveFilters && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-9 text-sm text-gray-500 hover:text-gray-700"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  )
}
