'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Search } from 'lucide-react'
import type { GlobalSearchResponse, GlobalSearchResult } from '@/lib/global-search'

const resultTypeKeys = {
  student: 'student',
  teacher: 'teacher',
  school: 'school',
  class: 'class',
} as const

export function GlobalSearch() {
  const t = useTranslations('layout.header')
  const router = useRouter()
  const resultsId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    const normalizedQuery = query.trim()
    if (normalizedQuery.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ query: normalizedQuery, type: 'all', limit: '8' })
        const response = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
        if (!response.ok) {
          setResults([])
          return
        }
        const body = await response.json() as GlobalSearchResponse
        setResults(body.results)
      } catch {
        if (!controller.signal.aborted) setResults([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  const chooseResult = (result: GlobalSearchResult) => {
    setOpen(false)
    setQuery('')
    router.push(result.href)
  }

  const showResults = open && query.trim().length >= 2

  return (
    <div className="app-global-search" ref={rootRef}>
      <div className="app-search">
        {loading ? <Loader2 aria-hidden="true" className="app-global-search__spinner" /> : <Search aria-hidden="true" />}
        <input
          type="search"
          role="combobox"
          value={query}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchLabel')}
          aria-controls={resultsId}
          aria-expanded={showResults}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onChange={event => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              setOpen(false)
              setQuery('')
            }
          }}
        />
      </div>

      {showResults && (
        <div id={resultsId} className="app-global-search__results" role="listbox" aria-label={t('searchResults')}>
          {loading ? (
            <p className="app-global-search__empty">{t('searchLoading')}</p>
          ) : results.length === 0 ? (
            <p className="app-global-search__empty">{t('searchNoResults')}</p>
          ) : (
            results.map(result => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                className="app-global-search__result"
                role="option"
                aria-selected="false"
                onClick={() => chooseResult(result)}
              >
                <span className="app-global-search__result-copy">
                  <strong>{result.title}</strong>
                  <small>{result.subtitle || t(`searchTypes.${resultTypeKeys[result.type]}`)}</small>
                </span>
                <span className="app-global-search__result-type">{t(`searchTypes.${resultTypeKeys[result.type]}`)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
