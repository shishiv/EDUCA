import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  ApiError,
  BaseApiService,
  type ApiErrorDetails,
  type CountFilter,
} from '@/lib/api/base'
import { isInvalidRefreshTokenError } from '@/lib/auth-session-recovery'
import { fuzzySearchStudent, type FuzzySearchResult } from '@/lib/utils/fuzzy-search'
import type { AuditLog } from '@/lib/audit'
import type { Tables } from '@/lib/supabase'

class SchoolContractService extends BaseApiService<'escolas'> {
  constructor() {
    super('escolas')
  }
}

interface ExpectedFuzzyStudent {
  nome_completo: string
  cpf?: string
  matricula?: string
}

function schoolProjection(service: SchoolContractService) {
  return service.getAll<{ id: string; nome: string }>()
}

describe('shared contracts', () => {
  it('binds BaseApiService results and filters to its table', () => {
    type SchoolRows = Awaited<ReturnType<typeof schoolProjection>>
    type SchoolById = Awaited<ReturnType<SchoolContractService['getById']>>

    expectTypeOf<SchoolRows>().toEqualTypeOf<Tables<'escolas'>[]>()
    expectTypeOf<SchoolById>().toEqualTypeOf<Tables<'escolas'> | null>()
    expect(schoolProjection).toBeTypeOf('function')

    const filter = {
      ativo: true,
      tipo: 'municipal',
    } satisfies CountFilter<'escolas'>
    expect(filter).toEqual({ ativo: true, tipo: 'municipal' })
  })

  it('derives API and audit details from their owning adapters', () => {
    expectTypeOf<ApiErrorDetails>().toEqualTypeOf<string>()
    expectTypeOf<AuditLog['id']>().toEqualTypeOf<Tables<'audit_logs'>['id']>()
    expectTypeOf<AuditLog['action']>().toEqualTypeOf<Tables<'audit_logs'>['action']>()

    const error = new ApiError('Falha de consulta', 'PGRST001', 'detalhes')
    expect(error.details).toBe('detalhes')
  })

  it('keeps fuzzy-search results tied to the supplied student contract', () => {
    const student = {
      nome_completo: 'Maria da Silva',
      cpf: '12345678901',
      matricula: 'MAT-1',
    }
    const result = fuzzySearchStudent('Maria', student)

    expectTypeOf(result).toEqualTypeOf<FuzzySearchResult<ExpectedFuzzyStudent> | null>()
    expect(result?.item).toBe(student)
  })

  it('recognizes a valid refresh-token message independently of an invalid code', () => {
    expect(isInvalidRefreshTokenError({
      code: null,
      message: 'Invalid Refresh Token: Refresh Token Not Found',
    })).toBe(true)
    expect(isInvalidRefreshTokenError({
      code: 401,
      message: 'Refresh token is not valid',
    })).toBe(true)
  })
})
