/**
 * Advanced Search & Filter System
 * Comprehensive search functionality for educational data discovery
 * Optimized for Brazilian educational workflows and municipal administration
 */

'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Search,
  Filter,
  X,
  Calendar as CalendarIcon,
  Users,
  GraduationCap,
  MapPin,
  Heart,
  Star,
  History,
  Save,
  Download,
  RotateCcw,
  SlidersHorizontal,
  Zap,
  Eye,
  ArrowUpDown,
  ChevronDown,
  User,
  School,
  Phone
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

// Search configuration types
interface SearchFilter {
  id: string
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'boolean'
  label: string
  placeholder?: string
  options?: Array<{ value: string; label: string; description?: string }>
  category: string
  priority: 'high' | 'medium' | 'low'
  helpText?: string
  validation?: (value: any) => boolean
}

interface SavedSearch {
  id: string
  name: string
  filters: Record<string, any>
  created: Date
  lastUsed: Date
  useCount: number
  category: string
}

interface SearchResult {
  id: string
  type: 'student' | 'teacher' | 'class' | 'school'
  data: any
  relevanceScore: number
  matchedFields: string[]
  lastUpdated: Date
}

interface AdvancedSearchSystemProps {
  searchType: 'students' | 'teachers' | 'classes' | 'all'
  onSearch: (filters: Record<string, any>) => Promise<SearchResult[]>
  onSaveSearch?: (searchData: { name: string; filters: Record<string, any> }) => Promise<void>
  className?: string
}

// Search configuration for different entity types
const SEARCH_FILTERS: Record<string, SearchFilter[]> = {
  students: [
    {
      id: 'nome_completo',
      type: 'text',
      label: 'Nome do Estudante',
      placeholder: 'Digite nome ou parte do nome',
      category: 'basic',
      priority: 'high',
      helpText: 'Busca por nome completo ou parcial'
    },
    {
      id: 'cpf',
      type: 'text',
      label: 'CPF',
      placeholder: '000.000.000-00',
      category: 'basic',
      priority: 'high',
      helpText: 'CPF do estudante (com ou sem formatação)'
    },
    {
      id: 'serie_ano',
      type: 'select',
      label: 'Série/Ano',
      category: 'educational',
      priority: 'high',
      options: [
        { value: '1ef', label: '1º Ano EF' },
        { value: '2ef', label: '2º Ano EF' },
        { value: '3ef', label: '3º Ano EF' },
        { value: '4ef', label: '4º Ano EF' },
        { value: '5ef', label: '5º Ano EF' },
        { value: '6ef', label: '6º Ano EF' },
        { value: '7ef', label: '7º Ano EF' },
        { value: '8ef', label: '8º Ano EF' },
        { value: '9ef', label: '9º Ano EF' },
        { value: '1em', label: '1º Ano EM' },
        { value: '2em', label: '2º Ano EM' },
        { value: '3em', label: '3º Ano EM' }
      ]
    },
    {
      id: 'turno',
      type: 'multiselect',
      label: 'Turno',
      category: 'educational',
      priority: 'medium',
      options: [
        { value: 'matutino', label: 'Matutino', description: '7h às 12h' },
        { value: 'vespertino', label: 'Vespertino', description: '13h às 18h' },
        { value: 'noturno', label: 'Noturno', description: '19h às 23h' },
        { value: 'integral', label: 'Integral', description: '7h às 17h' }
      ]
    },
    {
      id: 'escola',
      type: 'select',
      label: 'Escola',
      category: 'basic',
      priority: 'medium',
      options: [] // Will be populated dynamically
    },
    {
      id: 'idade_min',
      type: 'number',
      label: 'Idade Mínima',
      category: 'demographic',
      priority: 'low',
      placeholder: '6'
    },
    {
      id: 'idade_max',
      type: 'number',
      label: 'Idade Máxima',
      category: 'demographic',
      priority: 'low',
      placeholder: '18'
    },
    {
      id: 'sexo',
      type: 'select',
      label: 'Sexo',
      category: 'demographic',
      priority: 'low',
      options: [
        { value: 'M', label: 'Masculino' },
        { value: 'F', label: 'Feminino' }
      ]
    },
    {
      id: 'cor_raca',
      type: 'multiselect',
      label: 'Cor/Raça',
      category: 'demographic',
      priority: 'low',
      options: [
        { value: 'branca', label: 'Branca' },
        { value: 'preta', label: 'Preta' },
        { value: 'parda', label: 'Parda' },
        { value: 'amarela', label: 'Amarela' },
        { value: 'indigena', label: 'Indígena' }
      ]
    },
    {
      id: 'bairro',
      type: 'text',
      label: 'Bairro',
      placeholder: 'Nome do bairro',
      category: 'location',
      priority: 'medium',
      helpText: 'Busca por bairro de residência'
    },
    {
      id: 'bolsa_familia',
      type: 'boolean',
      label: 'Bolsa Família',
      category: 'social',
      priority: 'medium',
      helpText: 'Beneficiários de programas sociais'
    },
    {
      id: 'transporte_escolar',
      type: 'boolean',
      label: 'Transporte Escolar',
      category: 'social',
      priority: 'medium',
      helpText: 'Utiliza transporte público escolar'
    },
    {
      id: 'necessidades_especiais',
      type: 'boolean',
      label: 'Necessidades Especiais',
      category: 'health',
      priority: 'medium',
      helpText: 'Possui necessidades educacionais especiais'
    },
    {
      id: 'data_matricula_inicio',
      type: 'date',
      label: 'Data Matrícula (início)',
      category: 'academic',
      priority: 'low'
    },
    {
      id: 'data_matricula_fim',
      type: 'date',
      label: 'Data Matrícula (fim)',
      category: 'academic',
      priority: 'low'
    }
  ],
  teachers: [
    {
      id: 'nome_completo',
      type: 'text',
      label: 'Nome do Professor',
      placeholder: 'Digite nome ou parte do nome',
      category: 'basic',
      priority: 'high'
    },
    {
      id: 'cpf',
      type: 'text',
      label: 'CPF',
      placeholder: '000.000.000-00',
      category: 'basic',
      priority: 'high'
    },
    {
      id: 'disciplina',
      type: 'multiselect',
      label: 'Disciplina',
      category: 'academic',
      priority: 'high',
      options: [
        { value: 'portugues', label: 'Português' },
        { value: 'matematica', label: 'Matemática' },
        { value: 'ciencias', label: 'Ciências' },
        { value: 'historia', label: 'História' },
        { value: 'geografia', label: 'Geografia' },
        { value: 'educacao_fisica', label: 'Educação Física' },
        { value: 'artes', label: 'Artes' },
        { value: 'ingles', label: 'Inglês' }
      ]
    },
    {
      id: 'escola',
      type: 'select',
      label: 'Escola',
      category: 'basic',
      priority: 'medium',
      options: []
    },
    {
      id: 'formacao',
      type: 'text',
      label: 'Formação',
      placeholder: 'Graduação, especialização...',
      category: 'academic',
      priority: 'medium'
    },
    {
      id: 'ativo',
      type: 'boolean',
      label: 'Professor Ativo',
      category: 'status',
      priority: 'medium'
    }
  ]
}

export function AdvancedSearchSystem({
  searchType,
  onSearch,
  onSaveSearch,
  className
}: AdvancedSearchSystemProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State management
  const [searchTerm, setSearchTerm] = React.useState('')
  const [activeFilters, setActiveFilters] = React.useState<Record<string, any>>({})
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [savedSearches, setSavedSearches] = React.useState<SavedSearch[]>([])
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState('relevance')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')

  // Get filters for current search type
  const availableFilters = SEARCH_FILTERS[searchType] || []
  const filterCategories = Array.from(new Set(availableFilters.map(f => f.category)))

  // Quick search suggestions
  const [quickSuggestions, setQuickSuggestions] = React.useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = React.useState(false)

  // Load saved searches on mount
  React.useEffect(() => {
    loadSavedSearches()
    loadQuickSuggestions()
  }, [])

  // Load from URL parameters
  React.useEffect(() => {
    const urlFilters: Record<string, any> = {}
    searchParams.forEach((value, key) => {
      if (key === 'q') {
        setSearchTerm(value)
      } else {
        urlFilters[key] = value
      }
    })
    if (Object.keys(urlFilters).length > 0) {
      setActiveFilters(urlFilters)
      setShowAdvanced(true)
    }
  }, [searchParams])

  const loadSavedSearches = async () => {
    try {
      // Load from localStorage or API
      const saved = localStorage.getItem(`saved-searches-${searchType}`)
      if (saved) {
        setSavedSearches(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error)
    }
  }

  const loadQuickSuggestions = async () => {
    try {
      // In real implementation, load from API based on recent searches
      const suggestions = [
        '1º Ano EF',
        'Bolsa Família',
        'Transporte Escolar',
        'Centro',
        'Necessidades Especiais'
      ]
      setQuickSuggestions(suggestions)
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    }
  }

  // Perform search
  const performSearch = async () => {
    if (!searchTerm.trim() && Object.keys(activeFilters).length === 0) {
      toast.error('Digite um termo de busca ou selecione filtros')
      return
    }

    setIsSearching(true)
    try {
      const searchData = {
        query: searchTerm,
        filters: activeFilters,
        sort: { field: sortBy, order: sortOrder }
      }

      const results = await onSearch(searchData)
      setSearchResults(results)

      // Update URL
      const params = new URLSearchParams()
      if (searchTerm) params.set('q', searchTerm)
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.set(key, Array.isArray(value) ? value.join(',') : value.toString())
        }
      })

      router.push(`?${params.toString()}`, { scroll: false })

      toast.success(`${results.length} resultados encontrados`)
    } catch (error) {
      console.error('Search failed:', error)
      toast.error('Erro na busca. Tente novamente.')
    } finally {
      setIsSearching(false)
    }
  }

  // Handle filter change
  const handleFilterChange = (filterId: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: value
    }))
  }

  // Remove filter
  const removeFilter = (filterId: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[filterId]
      return newFilters
    })
  }

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({})
    setSearchTerm('')
    setSearchResults([])
    router.push('', { scroll: false })
  }

  // Save current search
  const saveCurrentSearch = async () => {
    if (!searchTerm.trim() && Object.keys(activeFilters).length === 0) {
      toast.error('Nenhuma busca para salvar')
      return
    }

    const searchName = prompt('Nome para esta busca:')
    if (!searchName) return

    const searchData = {
      name: searchName,
      filters: { query: searchTerm, ...activeFilters }
    }

    try {
      if (onSaveSearch) {
        await onSaveSearch(searchData)
      }

      const newSavedSearch: SavedSearch = {
        id: Date.now().toString(),
        name: searchName,
        filters: searchData.filters,
        created: new Date(),
        lastUsed: new Date(),
        useCount: 1,
        category: searchType
      }

      const updatedSaved = [...savedSearches, newSavedSearch]
      setSavedSearches(updatedSaved)
      localStorage.setItem(`saved-searches-${searchType}`, JSON.stringify(updatedSaved))

      toast.success('Busca salva com sucesso!')
    } catch (error) {
      console.error('Failed to save search:', error)
      toast.error('Erro ao salvar busca')
    }
  }

  // Load saved search
  const loadSavedSearch = (savedSearch: SavedSearch) => {
    const { query, ...filters } = savedSearch.filters
    setSearchTerm(query || '')
    setActiveFilters(filters)
    setShowAdvanced(Object.keys(filters).length > 0)

    // Update usage statistics
    const updatedSaved = savedSearches.map(s =>
      s.id === savedSearch.id
        ? { ...s, lastUsed: new Date(), useCount: s.useCount + 1 }
        : s
    )
    setSavedSearches(updatedSaved)
    localStorage.setItem(`saved-searches-${searchType}`, JSON.stringify(updatedSaved))
  }

  // Render filter input
  const renderFilterInput = (filter: SearchFilter) => {
    const value = activeFilters[filter.id]

    switch (filter.type) {
      case 'text':
        return (
          <Input
            placeholder={filter.placeholder}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
          />
        )

      case 'select':
        return (
          <Select value={value || ''} onValueChange={(val) => handleFilterChange(filter.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div>{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-between">
                {selectedValues.length > 0
                  ? `${selectedValues.length} selecionado(s)`
                  : 'Selecione...'}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                {filter.options?.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={selectedValues.includes(option.value)}
                      onCheckedChange={(checked) => {
                        const newValues = checked
                          ? [...selectedValues, option.value]
                          : selectedValues.filter(v => v !== option.value)
                        handleFilterChange(filter.id, newValues)
                      }}
                    />
                    <Label htmlFor={option.value} className="text-sm font-normal">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )

      case 'number':
        return (
          <Input
            type="number"
            placeholder={filter.placeholder}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
          />
        )

      case 'boolean':
        return (
          <Select value={value?.toString() || ''} onValueChange={(val) => handleFilterChange(filter.id, val === 'true')}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sim</SelectItem>
              <SelectItem value="false">Não</SelectItem>
            </SelectContent>
          </Select>
        )

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleFilterChange(filter.id, date?.toISOString())}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )

      default:
        return null
    }
  }

  // Get active filter count
  const activeFilterCount = Object.keys(activeFilters).length

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar estudantes, CPF, nomes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                className="pl-9"
              />

              {/* Quick Suggestions */}
              {showSuggestions && quickSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg">
                  <ScrollArea className="max-h-40">
                    {quickSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setSearchTerm(suggestion)
                          setShowSuggestions(false)
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>

            <Button
              onClick={() => setShowAdvanced(!showAdvanced)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            <Button onClick={performSearch} disabled={isSearching} className="flex items-center gap-2">
              {isSearching ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar
            </Button>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(activeFilters).map(([key, value]) => {
                const filter = availableFilters.find(f => f.id === key)
                if (!filter || !value) return null

                return (
                  <Badge key={key} variant="secondary" className="flex items-center gap-1">
                    {filter.label}: {Array.isArray(value) ? value.join(', ') : value.toString()}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => removeFilter(key)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-auto px-2 py-1 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Limpar tudo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Avançados
            </CardTitle>
            <CardDescription>
              Refine sua busca com filtros específicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="educational">Educacional</TabsTrigger>
                <TabsTrigger value="demographic">Demografia</TabsTrigger>
                <TabsTrigger value="location">Localização</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableFilters
                    .filter(f => f.priority === 'high')
                    .map((filter) => (
                      <div key={filter.id} className="space-y-2">
                        <Label className="text-sm font-medium">{filter.label}</Label>
                        {renderFilterInput(filter)}
                        {filter.helpText && (
                          <p className="text-xs text-muted-foreground">{filter.helpText}</p>
                        )}
                      </div>
                    ))}
                </div>
              </TabsContent>

              {filterCategories.map((category) => (
                <TabsContent key={category} value={category} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableFilters
                      .filter(f => f.category === category)
                      .map((filter) => (
                        <div key={filter.id} className="space-y-2">
                          <Label className="text-sm font-medium">{filter.label}</Label>
                          {renderFilterInput(filter)}
                          {filter.helpText && (
                            <p className="text-xs text-muted-foreground">{filter.helpText}</p>
                          )}
                        </div>
                      ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={saveCurrentSearch}>
                  <Save className="h-4 w-4 mr-1" />
                  Salvar Busca
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Exportar
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm">Ordenar por:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevância</SelectItem>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="date">Data</SelectItem>
                    <SelectItem value="age">Idade</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Buscas Salvas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedSearches.slice(0, 5).map((savedSearch) => (
                <Button
                  key={savedSearch.id}
                  variant="outline"
                  size="sm"
                  onClick={() => loadSavedSearch(savedSearch)}
                  className="flex items-center gap-2"
                >
                  <Star className="h-3 w-3" />
                  {savedSearch.name}
                  <Badge variant="secondary" className="text-xs">
                    {savedSearch.useCount}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Resultados da Busca
              <Badge variant="secondary">{searchResults.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {result.type === 'student' && <User className="h-4 w-4" />}
                        {result.type === 'teacher' && <GraduationCap className="h-4 w-4" />}
                        {result.type === 'school' && <School className="h-4 w-4" />}
                        <h4 className="font-medium">{result.data.nome_completo || result.data.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {result.type}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.type === 'student' && (
                          <>
                            CPF: {result.data.cpf} • Série: {result.data.serie_ano} •
                            Escola: {result.data.escola}
                          </>
                        )}
                        {result.type === 'teacher' && (
                          <>
                            CPF: {result.data.cpf} • Disciplina: {result.data.disciplina} •
                            Escola: {result.data.escola}
                          </>
                        )}
                      </div>
                      {result.matchedFields.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.matchedFields.map((field) => (
                            <Badge key={field} variant="secondary" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={result.relevanceScore > 0.8 ? 'default' : 'secondary'}>
                        {Math.round(result.relevanceScore * 100)}%
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Atualizado: {format(result.lastUpdated, 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {searchResults.length === 0 && searchTerm && !isSearching && (
        <Alert>
          <Search className="h-4 w-4" />
          <AlertDescription>
            Nenhum resultado encontrado para "{searchTerm}".
            Tente termos diferentes ou use os filtros avançados.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}