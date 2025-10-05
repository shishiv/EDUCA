'use client'

import { useQuery } from '@tanstack/react-query'
import { logger } from '@/lib/logger'

export interface ComplianceWarning {
  id: string
  title: string
  message: string
  type: 'critical' | 'warning' | 'info'
  icon: string
  actionUrl: string
  actionText: string
  deadline?: string
  count?: number
}

interface ComplianceResponse {
  success: boolean
  warnings: ComplianceWarning[]
  total: number
  timestamp: string
}

export function useComplianceWarnings() {
  return useQuery({
    queryKey: ['compliance-warnings'],
    queryFn: async (): Promise<ComplianceWarning[]> => {
      try {
        const response = await fetch('/api/compliance/warnings')

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: ComplianceResponse = await response.json()

        if (!data.success) {
          throw new Error('Failed to fetch compliance warnings')
        }

        return data.warnings
      } catch (error) {
        logger.error('Error fetching compliance warnings', { error })
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    refetchOnWindowFocus: true
  })
}
