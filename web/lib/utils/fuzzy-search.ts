/**
 * Fuzzy Search Utilities for Brazilian Portuguese
 * Handles typos, accents, and variations in Brazilian names
 */

/**
 * Calculate Levenshtein distance (edit distance) between two strings
 * Used to find how similar two strings are
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length

  // Create matrix for dynamic programming
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0))

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) matrix[i][0] = i
  for (let j = 0; j <= len2; j++) matrix[0][j] = j

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[len1][len2]
}

/**
 * Remove accents from Brazilian Portuguese characters
 * "José" → "Jose", "André" → "Andre"
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Normalize string for fuzzy matching
 * - Convert to lowercase
 * - Remove accents
 * - Remove extra spaces
 * - Trim whitespace
 */
export function normalizeForFuzzy(str: string): string {
  return removeAccents(str)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculate similarity score (0-1) between two strings
 * 1.0 = exact match, 0.0 = completely different
 */
export function similarityScore(str1: string, str2: string): number {
  // Normalize both strings
  const norm1 = normalizeForFuzzy(str1)
  const norm2 = normalizeForFuzzy(str2)

  // Exact match after normalization
  if (norm1 === norm2) return 1.0

  // Calculate distance
  const distance = levenshteinDistance(norm1, norm2)
  const maxLength = Math.max(norm1.length, norm2.length)

  // Convert distance to similarity (0-1)
  return 1 - (distance / maxLength)
}

/**
 * Check if query matches target with fuzzy logic
 * Returns true if similarity is above threshold
 */
export function fuzzyMatch(
  query: string,
  target: string,
  threshold: number = 0.7
): boolean {
  const score = similarityScore(query, target)
  return score >= threshold
}

/**
 * Find best fuzzy matches from a list of candidates
 * Returns matches sorted by similarity score (best first)
 */
export function findFuzzyMatches<T>(
  query: string,
  candidates: T[],
  extractText: (item: T) => string,
  options: {
    threshold?: number
    maxResults?: number
  } = {}
): Array<{ item: T; score: number }> {
  const {
    threshold = 0.6,
    maxResults = 10
  } = options

  // Calculate scores for all candidates
  const scored = candidates.map(item => ({
    item,
    score: similarityScore(query, extractText(item))
  }))

  // Filter by threshold and sort by score
  return scored
    .filter(result => result.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
}

/**
 * Highlight matching parts of text
 * Used for search result display
 */
export function highlightMatches(
  text: string,
  query: string
): { text: string; isHighlight: boolean }[] {
  const normalizedText = normalizeForFuzzy(text)
  const normalizedQuery = normalizeForFuzzy(query)

  if (!normalizedQuery || !normalizedText.includes(normalizedQuery)) {
    return [{ text, isHighlight: false }]
  }

  const startIndex = normalizedText.indexOf(normalizedQuery)
  const endIndex = startIndex + normalizedQuery.length

  const result: { text: string; isHighlight: boolean }[] = []

  if (startIndex > 0) {
    result.push({
      text: text.substring(0, startIndex),
      isHighlight: false
    })
  }

  result.push({
    text: text.substring(startIndex, endIndex),
    isHighlight: true
  })

  if (endIndex < text.length) {
    result.push({
      text: text.substring(endIndex),
      isHighlight: false
    })
  }

  return result
}

/**
 * Brazilian name-specific fuzzy search
 * Handles compound names and common variations
 */
export function fuzzySearchBrazilianName(
  query: string,
  fullName: string
): boolean {
  // Normalize both strings
  const normalizedQuery = normalizeForFuzzy(query)
  const normalizedName = normalizeForFuzzy(fullName)

  // Exact substring match (after normalization)
  if (normalizedName.includes(normalizedQuery)) {
    return true
  }

  // Split into parts for compound name matching
  const queryParts = normalizedQuery.split(' ').filter(p => p.length > 0)
  const nameParts = normalizedName.split(' ').filter(p => p.length > 0)

  // Check if all query parts match at least one name part
  return queryParts.every(queryPart => {
    return nameParts.some(namePart => {
      // Allow fuzzy match for each part
      const score = similarityScore(queryPart, namePart)
      return score >= 0.75 // Higher threshold for name parts
    })
  })
}

/**
 * Fuzzy CPF search
 * Handles partial CPF matching with typo tolerance
 */
export function fuzzyCPFSearch(query: string, cpf: string): boolean {
  // Remove formatting from both
  const cleanQuery = query.replace(/[.\-]/g, '')
  const cleanCPF = cpf.replace(/[.\-]/g, '')

  // Exact match
  if (cleanCPF.includes(cleanQuery)) {
    return true
  }

  // Allow 1-2 digit typos for longer queries
  if (cleanQuery.length >= 6) {
    const distance = levenshteinDistance(cleanQuery, cleanCPF)
    const maxErrors = cleanQuery.length >= 9 ? 2 : 1
    return distance <= maxErrors
  }

  return false
}

/**
 * Search result with fuzzy match information
 */
export interface FuzzySearchResult<T> {
  item: T
  score: number
  matchType: 'exact' | 'fuzzy' | 'partial'
  matchedField: string
}

/**
 * Perform comprehensive fuzzy search on student records
 */
export function fuzzySearchStudent(
  query: string,
  student: {
    nome_completo: string
    cpf?: string
    matricula?: string
  }
): FuzzySearchResult<any> | null {
  const normalizedQuery = normalizeForFuzzy(query)

  // Try exact match first (highest priority)
  if (normalizeForFuzzy(student.nome_completo).includes(normalizedQuery)) {
    return {
      item: student,
      score: 1.0,
      matchType: 'exact',
      matchedField: 'nome_completo'
    }
  }

  // Try CPF match
  if (student.cpf && fuzzyCPFSearch(query, student.cpf)) {
    return {
      item: student,
      score: 0.95,
      matchType: 'exact',
      matchedField: 'cpf'
    }
  }

  // Try fuzzy name match
  if (fuzzySearchBrazilianName(query, student.nome_completo)) {
    const score = similarityScore(query, student.nome_completo)
    return {
      item: student,
      score,
      matchType: 'fuzzy',
      matchedField: 'nome_completo'
    }
  }

  return null
}
