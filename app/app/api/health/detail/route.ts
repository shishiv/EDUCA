import { createHealthRouteHandlers } from '@/lib/health/health-route-handlers'

/** Full diagnostics require an authenticated administrator. */
export const GET = createHealthRouteHandlers().detailGET
