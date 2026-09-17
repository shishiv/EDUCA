import type { Database, Json } from '@/types/database'

export interface PilotRpcResult<T> {
  data: T | null
  error: { message: string } | null
}

type PublicFunctions = Database['public']['Functions']

interface PilotRpcArgumentOverrides {
  get_authorized_guardian_profiles: {
    p_guardian_id?: string | null
    p_school_id?: string | null
  }
  get_authorized_student_profiles: {
    p_school_id?: string | null
    p_student_id?: string | null
  }
  get_municipal_settings: {
    p_ano: number
    p_escola_id: string | null
  }
  set_municipal_settings: Omit<PublicFunctions['set_municipal_settings']['Args'], 'p_educacenso_deadline' | 'p_escola_id'> & {
    p_educacenso_deadline: string | null
    p_escola_id: string | null
  }
  write_pilot_audit_event: Omit<PublicFunctions['write_pilot_audit_event']['Args'], 'p_entity_id' | 'p_escola_id' | 'p_metadata'> & {
    p_entity_id?: string | null
    p_escola_id?: string | null
    p_metadata?: Json
  }
  write_pilot_user_revocation_audit: Omit<PublicFunctions['write_pilot_user_revocation_audit']['Args'], 'p_escola_id'> & {
    p_escola_id?: string | null
  }
}

export type PilotRpcFunctionName = keyof PublicFunctions
export type PilotRpcArguments<FunctionName extends PilotRpcFunctionName> =
  FunctionName extends keyof PilotRpcArgumentOverrides
    ? PilotRpcArgumentOverrides[FunctionName]
    : PublicFunctions[FunctionName]['Args']
export type PilotRpcReturn<FunctionName extends PilotRpcFunctionName> = PublicFunctions[FunctionName]['Returns']

export interface PilotRpcClient {
  rpc<FunctionName extends PilotRpcFunctionName>(
    functionName: FunctionName,
    ...args: PilotRpcArguments<FunctionName> extends never
      ? []
      : [args: PilotRpcArguments<FunctionName>]
  ): Promise<PilotRpcResult<PilotRpcReturn<FunctionName>>>
}

/** Narrows the Supabase RPC surface available to pilot workflows. */
export function asPilotRpcClient<Client>(client: Client): PilotRpcClient {
  // SAFETY: callers pass Supabase client adapters whose shared runtime contract is the generic rpc method above.
  return client as PilotRpcClient
}
