/**
 * Search Context - Global Search State Management
 * Provides search functionality across the entire application
 * Optimized for Brazilian educational data and workflows
 */

'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

// Types
interface SearchFilter {
  id: string
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'boolean'
  label: string
  value: any
  category: string
}

interface SearchResult {
  id: string
  type: 'student' | 'teacher' | 'class' | 'school'
  data: any
  relevanceScore: number
  matchedFields: string[]
  lastUpdated: Date
  status?: 'active' | 'inactive' | 'pending'
}

interface SavedSearch {
  id: string
  name: string
  query: string
  filters: Record<string, any>
  created: Date
  lastUsed: Date
  useCount: number
  category: string
}

interface SearchState {
  // Current search
  query: string
  filters: Record<string, any>
  results: SearchResult[]
  isSearching: boolean
  lastSearchTime: Date | null

  // UI state
  viewMode: 'grid' | 'list' | 'table'
  sortBy: string
  sortOrder: 'asc' | 'desc'
  currentPage: number
  pageSize: number
  totalCount: number

  // Saved searches
  savedSearches: SavedSearch[]
  recentSearches: string[]

  // Configuration
  searchType: 'students' | 'teachers' | 'classes' | 'all'

  // Error handling
  error: string | null
}

interface SearchContextType extends SearchState {
  // Search actions
  setQuery: (query: string) => void
  setFilters: (filters: Record<string, any>) => void
  addFilter: (key: string, value: any) => void
  removeFilter: (key: string) => void
  clearFilters: () => void
  performSearch: () => Promise<void>

  // UI actions
  setViewMode: (mode: 'grid' | 'list' | 'table') => void
  setSortBy: (field: string) => void
  setSortOrder: (order: 'asc' | 'desc') => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void

  // Saved searches
  saveCurrentSearch: (name: string) => Promise<void>
  loadSavedSearch: (search: SavedSearch) => void
  deleteSavedSearch: (id: string) => void

  // Search suggestions
  getSearchSuggestions: (query: string) => Promise<string[]>
  addToRecentSearches: (query: string) => void

  // Configuration
  setSearchType: (type: 'students' | 'teachers' | 'classes' | 'all') => void

  // Error handling
  clearError: () => void
}

const SearchContext = React.createContext<SearchContextType | null>(null)

// Search Provider Component
interface SearchProviderProps {
  children: React.ReactNode
  defaultSearchType?: 'students' | 'teachers' | 'classes' | 'all'
}

export function SearchProvider({ children, defaultSearchType = 'students' }: SearchProviderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initial state
  const [state, setState] = React.useState<SearchState>({
    query: '',
    filters: {},
    results: [],
    isSearching: false,
    lastSearchTime: null,
    viewMode: 'list',
    sortBy: 'relevance',
    sortOrder: 'desc',
    currentPage: 1,
    pageSize: 20,
    totalCount: 0,
    savedSearches: [],
    recentSearches: [],
    searchType: defaultSearchType,
    error: null
  })

  // Load saved data on mount
  React.useEffect(() => {
    loadSavedData()
  }, [])

  // Load from URL parameters
  React.useEffect(() => {
    const urlQuery = searchParams.get('q') || ''
    const urlFilters: Record<string, any> = {}

    searchParams.forEach((value, key) => {
      if (key !== 'q') {
        urlFilters[key] = value.includes(',') ? value.split(',') : value
      }
    })

    setState(prev => ({
      ...prev,
      query: urlQuery,
      filters: urlFilters
    }))
  }, [searchParams])

  // Load saved data from localStorage
  const loadSavedData = async () => {
    try {
      const savedSearches = localStorage.getItem('gestao-fronteira-saved-searches')
      const recentSearches = localStorage.getItem('gestao-fronteira-recent-searches')
      const userPreferences = localStorage.getItem('gestao-fronteira-search-preferences')

      setState(prev => ({
        ...prev,
        savedSearches: savedSearches ? JSON.parse(savedSearches) : [],
        recentSearches: recentSearches ? JSON.parse(recentSearches) : [],
        ...(userPreferences ? JSON.parse(userPreferences) : {})
      }))
    } catch (error) {
      console.error('Failed to load saved search data:', error)
    }
  }

  // Save user preferences
  const saveUserPreferences = () => {
    try {
      const preferences = {
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        pageSize: state.pageSize
      }
      localStorage.setItem('gestao-fronteira-search-preferences', JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to save user preferences:', error)
    }
  }

  // Update URL with search parameters
  const updateURL = (query: string, filters: Record<string, any>) => {
    const params = new URLSearchParams()

    if (query.trim()) {
      params.set('q', query)
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.set(key, Array.isArray(value) ? value.join(',') : value.toString())
      }
    })

    const newUrl = params.toString() ? `?${params.toString()}` : ''
    router.push(newUrl, { scroll: false })
  }

  // Perform search API call
  const performSearchAPI = async (query: string, filters: Record<string, any>, sortConfig: any) => {
    // This would be your actual API call
    // For now, return mock data
    return new Promise<{ results: SearchResult[]; totalCount: number }>((resolve) => {
      setTimeout(() => {
        const mockResults: SearchResult[] = [
          {
            id: '1',
            type: 'student',
            data: {
              nome_completo: 'João Silva Santos',
              cpf: '123.456.789-00',
              serie_ano: '5º Ano EF',
              turno: 'matutino',
              escola: 'E.M. José de Alencar',
              telefone: '(31) 99999-8888',
              endereco: 'Rua das Flores, 123',
              bairro: 'Centro'
            },
            relevanceScore: 0.95,
            matchedFields: ['nome_completo', 'cpf'],
            lastUpdated: new Date(),
            status: 'active'
          },
          {
            id: '2',
            type: 'teacher',
            data: {
              nome_completo: 'Maria Eduarda Oliveira',
              cpf: '987.654.321-00',
              disciplina: 'Matemática',
              escola: 'E.M. José de Alencar',
              telefone: '(31) 88888-7777'
            },
            relevanceScore: 0.87,
            matchedFields: ['nome_completo'],
            lastUpdated: new Date(),
            status: 'active'
          }
        ]

        // Filter by query
        let filtered = mockResults
        if (query.trim()) {
          filtered = mockResults.filter(result =>
            result.data.nome_completo?.toLowerCase().includes(query.toLowerCase()) ||
            result.data.cpf?.includes(query)
          )
        }

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            filtered = filtered.filter(result => {
              const fieldValue = result.data[key]
              if (Array.isArray(value)) {
                return value.includes(fieldValue)
              }
              return fieldValue === value || fieldValue?.toString().includes(value.toString())
            })
          }
        })

        resolve({
          results: filtered,
          totalCount: filtered.length
        })
      }, 1000) // Simulate API delay
    })
  }

  // Actions
  const setQuery = (query: string) => {
    setState(prev => ({ ...prev, query }))
  }

  const setFilters = (filters: Record<string, any>) => {
    setState(prev => ({ ...prev, filters }))
  }

  const addFilter = (key: string, value: any) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value }
    }))
  }

  const removeFilter = (key: string) => {
    setState(prev => {
      const newFilters = { ...prev.filters }
      delete newFilters[key]
      return { ...prev, filters: newFilters }
    })
  }

  const clearFilters = () => {
    setState(prev => ({ ...prev, filters: {}, query: '', results: [] }))
    router.push('', { scroll: false })
  }

  const performSearch = async () => {
    if (!state.query.trim() && Object.keys(state.filters).length === 0) {
      setState(prev => ({ ...prev, error: 'Digite um termo de busca ou selecione filtros' }))
      return
    }

    setState(prev => ({ ...prev, isSearching: true, error: null }))

    try {
      const { results, totalCount } = await performSearchAPI(
        state.query,
        state.filters,
        { field: state.sortBy, order: state.sortOrder }
      )

      setState(prev => ({
        ...prev,
        results,
        totalCount,
        lastSearchTime: new Date(),
        currentPage: 1
      }))

      // Update URL
      updateURL(state.query, state.filters)

      // Add to recent searches
      if (state.query.trim()) {
        addToRecentSearches(state.query)
      }

      toast.success(`${results.length} resultados encontrados`)
    } catch (error) {
      console.error('Search failed:', error)
      setState(prev => ({ ...prev, error: 'Erro na busca. Tente novamente.' }))
      toast.error('Erro na busca. Tente novamente.')
    } finally {
      setState(prev => ({ ...prev, isSearching: false }))
    }
  }

  const setViewMode = (viewMode: 'grid' | 'list' | 'table') => {
    setState(prev => ({ ...prev, viewMode }))
    saveUserPreferences()
  }

  const setSortBy = (sortBy: string) => {
    setState(prev => ({ ...prev, sortBy }))
  }

  const setSortOrder = (sortOrder: 'asc' | 'desc') => {
    setState(prev => ({ ...prev, sortOrder }))
  }

  const setCurrentPage = (currentPage: number) => {
    setState(prev => ({ ...prev, currentPage }))
  }

  const setPageSize = (pageSize: number) => {
    setState(prev => ({ ...prev, pageSize, currentPage: 1 }))
    saveUserPreferences()
  }

  const saveCurrentSearch = async (name: string) => {
    const newSavedSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      query: state.query,
      filters: state.filters,
      created: new Date(),
      lastUsed: new Date(),
      useCount: 1,
      category: state.searchType
    }

    const updatedSaved = [...state.savedSearches, newSavedSearch]
    setState(prev => ({ ...prev, savedSearches: updatedSaved }))

    try {
      localStorage.setItem('gestao-fronteira-saved-searches', JSON.stringify(updatedSaved))
      toast.success('Busca salva com sucesso!')
    } catch (error) {
      console.error('Failed to save search:', error)
      toast.error('Erro ao salvar busca')
    }
  }

  const loadSavedSearch = (search: SavedSearch) => {
    setState(prev => ({
      ...prev,
      query: search.query,
      filters: search.filters
    }))

    // Update usage statistics
    const updatedSaved = state.savedSearches.map(s =>
      s.id === search.id
        ? { ...s, lastUsed: new Date(), useCount: s.useCount + 1 }
        : s
    )
    setState(prev => ({ ...prev, savedSearches: updatedSaved }))

    try {
      localStorage.setItem('gestao-fronteira-saved-searches', JSON.stringify(updatedSaved))
    } catch (error) {
      console.error('Failed to update saved search:', error)
    }
  }

  const deleteSavedSearch = (id: string) => {
    const updatedSaved = state.savedSearches.filter(s => s.id !== id)
    setState(prev => ({ ...prev, savedSearches: updatedSaved }))

    try {
      localStorage.setItem('gestao-fronteira-saved-searches', JSON.stringify(updatedSaved))
      toast.success('Busca removida')
    } catch (error) {
      console.error('Failed to delete saved search:', error)
      toast.error('Erro ao remover busca')
    }
  }

  const getSearchSuggestions = async (query: string): Promise<string[]> => {
    // In real implementation, this would call an API
    const suggestions = [
      'João Silva',
      'Maria Santos',
      '1º Ano EF',
      'Bolsa Família',
      'Centro',
      'Transporte Escolar'
    ].filter(s => s.toLowerCase().includes(query.toLowerCase()))

    return suggestions.slice(0, 5)
  }

  const addToRecentSearches = (query: string) => {
    if (!query.trim()) return

    const updatedRecent = [
      query,
      ...state.recentSearches.filter(s => s !== query)
    ].slice(0, 10)

    setState(prev => ({ ...prev, recentSearches: updatedRecent }))

    try {
      localStorage.setItem('gestao-fronteira-recent-searches', JSON.stringify(updatedRecent))
    } catch (error) {
      console.error('Failed to save recent search:', error)
    }
  }

  const setSearchType = (searchType: 'students' | 'teachers' | 'classes' | 'all') => {
    setState(prev => ({ ...prev, searchType, results: [], query: '', filters: {} }))
  }

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }))
  }

  const contextValue: SearchContextType = {
    ...state,
    setQuery,
    setFilters,
    addFilter,
    removeFilter,
    clearFilters,
    performSearch,
    setViewMode,
    setSortBy,
    setSortOrder,
    setCurrentPage,
    setPageSize,
    saveCurrentSearch,
    loadSavedSearch,
    deleteSavedSearch,
    getSearchSuggestions,
    addToRecentSearches,
    setSearchType,
    clearError
  }

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  )
}

// Custom hook to use search context
export function useSearch() {
  const context = React.useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}

// Hook for quick search functionality
export function useQuickSearch() {
  const { setQuery, performSearch, isSearching } = useSearch()

  const quickSearch = async (query: string) => {
    setQuery(query)
    await performSearch()
  }

  return { quickSearch, isSearching }
}

// Hook for search suggestions
export function useSearchSuggestions() {
  const { getSearchSuggestions } = useSearch()
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)

  const loadSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const results = await getSearchSuggestions(query)
      setSuggestions(results)
    } catch (error) {
      console.error('Failed to load suggestions:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  return { suggestions, loading, loadSuggestions }
}