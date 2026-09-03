export interface PilotRpcResult<T> {
  data: T | null
  error: { message: string } | null
}

export interface PilotRpcClient {
  rpc<T = unknown>(functionName: string, args?: Record<string, unknown>): Promise<PilotRpcResult<T>>
}

/** Narrows the Supabase RPC surface available to pilot workflows. */
export function asPilotRpcClient(client: unknown): PilotRpcClient {
  return client as PilotRpcClient
}
