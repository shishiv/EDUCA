/** Optional browser API; unsupported engines expose no `sync` property. */
interface SyncManager {
  getTags(): Promise<string[]>
  register(tag: string): Promise<void>
}

interface ServiceWorkerRegistration {
  readonly sync?: SyncManager
}
