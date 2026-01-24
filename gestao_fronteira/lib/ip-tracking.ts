/**
 * IP Tracking Utilities
 * Simple implementation for audit logging
 */

/**
 * Get client IP address from request headers
 * Checks common proxy headers in order of priority
 */
export async function getClientIP(headers?: Headers): Promise<string> {
  if (!headers) {
    return 'unknown'
  }

  // Check common proxy headers in priority order
  const ipHeaders = [
    'x-real-ip',
    'x-forwarded-for',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'x-cluster-client-ip',
  ]

  for (const header of ipHeaders) {
    const value = headers.get(header)
    if (value) {
      // x-forwarded-for may contain multiple IPs, take the first
      const ip = value.split(',')[0].trim()
      if (ip && ip !== 'unknown') {
        return ip
      }
    }
  }

  return 'unknown'
}

/**
 * Get client info from request headers
 */
export async function getClientInfo(headers?: Headers): Promise<{
  ip: string
  userAgent: string
}> {
  const ip = await getClientIP(headers)
  const userAgent = headers?.get('user-agent') ||
    (typeof window !== 'undefined' ? navigator.userAgent : 'server')

  return { ip, userAgent }
}
