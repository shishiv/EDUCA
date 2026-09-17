import { createHealthRouteHandlers } from '@/lib/health/health-route-handlers'

const handlers = createHealthRouteHandlers()

/** Public liveness exposes only status and timestamp. */
export const GET = handlers.GET
export const HEAD = handlers.HEAD
