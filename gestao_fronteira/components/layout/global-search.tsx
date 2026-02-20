'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, User, Users, School, BookOpen, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  type: 'aluno' | 'professor' | 'escola' | 'turma'
  nome: string
  subtitle?: string
  href: string
}

const typeConfig = {
  aluno: { icon: User, label: 'Aluno', color: 'text-jardim-green-600 bg-jardim-green-50' },
  professor: { icon: User, label: 'Professor', color: 'text-jardim-blue-500 bg-jardim-blue-50' },
  escola: { icon: School, label: 'Escola', color: 'text-amber-600 bg-jardim-yellow-50' },
  turma: { icon: Users, label: 'Turma', color: 'text-jardim-pink-400 bg-jardim-pink-50' },
}

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Debounced search
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=8`)
      if (res.ok) {
        const data = await res.json()

        // Transform API response to SearchResult format
        const transformedResults: SearchResult[] = []

        // Add students
        if (data.results?.alunos) {
          data.results.alunos.forEach((aluno: any) => {
            transformedResults.push({
              id: aluno.id,
              type: 'aluno',
              nome: aluno.nome,
              subtitle: aluno.turma_nome || aluno.escola_nome,
              href: `/dashboard/alunos/${aluno.id}`
            })
          })
        }

        // Add teachers
        if (data.results?.professores) {
          data.results.professores.forEach((prof: any) => {
            transformedResults.push({
              id: prof.id,
              type: 'professor',
              nome: prof.nome,
              subtitle: prof.escola_nome,
              href: `/dashboard/usuarios/${prof.id}`
            })
          })
        }

        // Add schools
        if (data.results?.escolas) {
          data.results.escolas.forEach((escola: any) => {
            transformedResults.push({
              id: escola.id,
              type: 'escola',
              nome: escola.nome,
              subtitle: escola.endereco,
              href: `/dashboard/escolas/${escola.id}`
            })
          })
        }

        // Add classes
        if (data.results?.turmas) {
          data.results.turmas.forEach((turma: any) => {
            transformedResults.push({
              id: turma.id,
              type: 'turma',
              nome: turma.nome,
              subtitle: `${turma.serie} - ${turma.turno}`,
              href: `/dashboard/turmas/${turma.id}`
            })
          })
        }

        setResults(transformedResults)
        setSelectedIndex(0)
      }
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, search])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          router.push(results[selectedIndex].href)
          setIsOpen(false)
          setQuery('')
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleResultClick = (result: SearchResult) => {
    router.push(result.href)
    setIsOpen(false)
    setQuery('')
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-nav-item w-[280px] focus-within:border-jardim-green-500 focus-within:ring-2 focus-within:ring-jardim-green-100 transition-all">
        {isLoading ? (
          <Loader2 className="w-[18px] h-[18px] text-gray-400 animate-spin" />
        ) : (
          <Search className="w-[18px] h-[18px] text-gray-400" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar aluno, turma..."
          className="bg-transparent border-none outline-none text-[0.9rem] text-gray-800 w-full placeholder:text-gray-400"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-card shadow-xl z-50 max-h-[400px] overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => {
                const config = typeConfig[result.type]
                const Icon = config.icon
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left",
                      index === selectedIndex && "bg-jardim-green-50"
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-nav-item flex items-center justify-center", config.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {result.nome}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {result.subtitle || config.label}
                      </p>
                    </div>
                    <span className={cn("text-[0.65rem] font-semibold px-2 py-0.5 rounded-nav-item", config.color)}>
                      {config.label}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : query.length >= 2 && !isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Nenhum resultado encontrado</p>
              <p className="text-xs">Tente outro termo de busca</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
