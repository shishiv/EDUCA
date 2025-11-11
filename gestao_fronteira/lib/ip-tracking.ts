/**
 * IP Tracking Utility for Audit Logs
 * Provides accurate IP address detection for both client-side and server-side contexts
 * Supports Brazilian educational compliance requirements (LGPD)
 */

/**
 * Get client IP address from Next.js request headers
 * Checks multiple headers in order of reliability:
 * 1. CF-Connecting-IP (Cloudflare)
 * 2. X-Real-IP (Nginx/proxy)
 * 3. X-Forwarded-For (standard proxy header)
 * 4. Falls back to 'unknown' if none available
 */
export function getIPFromHeaders(headers: Headers): string {
  // Cloudflare provides the most reliable IP
  const cfConnectingIP = headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return sanitizeIP(cfConnectingIP)
  }

  // Nginx and other proxies use X-Real-IP
  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return sanitizeIP(realIP)
  }

  // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
  // We want the first one (the original client)
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIP = forwardedFor.split(',')[0].trim()
    return sanitizeIP(firstIP)
  }

  // Vercel-specific headers
  const vercelIP = headers.get('x-vercel-forwarded-for')
  if (vercelIP) {
    const firstIP = vercelIP.split(',')[0].trim()
    return sanitizeIP(firstIP)
  }

  return 'unknown'
}

/**
 * Get client IP address in browser context
 * Note: This is limited in browsers for security reasons
 * Returns 'client-side' with additional context when possible
 */
export async function getIPFromBrowser(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'server-side'
  }

  // Check if we're in development mode
  if (process.env.NODE_ENV === 'development') {
    return 'localhost'
  }

  // In production, we can't reliably get IP from client-side
  // The server should handle this via headers
  return 'client-side'
}

/**
 * Universal IP getter - works in both server and client contexts
 * For server-side (API routes, Server Actions), pass the request headers
 * For client-side, it will return 'client-side' marker
 */
export async function getClientIP(headers?: Headers): Promise<string> {
  // Server-side with headers
  if (headers) {
    return getIPFromHeaders(headers)
  }

  // Client-side fallback
  return await getIPFromBrowser()
}

/**
 * Sanitize IP address to prevent injection attacks
 * Validates IPv4 and IPv6 formats
 */
function sanitizeIP(ip: string): string {
  // Remove whitespace
  const trimmed = ip.trim()

  // Validate IPv4 format (e.g., 192.168.1.1)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4Regex.test(trimmed)) {
    // Check each octet is 0-255
    const octets = trimmed.split('.')
    if (octets.every(octet => {
      const num = parseInt(octet, 10)
      return num >= 0 && num <= 255
    })) {
      return trimmed
    }
  }

  // Validate IPv6 format (e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/
  if (ipv6Regex.test(trimmed)) {
    return trimmed.toLowerCase()
  }

  // Validate compressed IPv6 format (e.g., 2001:db8::1)
  const ipv6CompressedRegex = /^([0-9a-fA-F]{0,4}:){1,7}:([0-9a-fA-F]{0,4}:){0,6}[0-9a-fA-F]{0,4}$/
  if (ipv6CompressedRegex.test(trimmed)) {
    return trimmed.toLowerCase()
  }

  // If invalid format, return 'invalid' instead of potentially malicious input
  console.warn(`Invalid IP format detected: ${ip}`)
  return 'invalid-ip-format'
}

/**
 * Get detailed client information for audit logs
 * Includes IP, user agent, and other metadata
 */
export interface ClientInfo {
  ip_address: string
  user_agent: string
  platform?: string
  is_mobile?: boolean
  browser?: string
  timestamp: string
}

export async function getClientInfo(headers?: Headers): Promise<ClientInfo> {
  const ip_address = await getClientIP(headers)
  const user_agent = headers?.get('user-agent') || (typeof window !== 'undefined' ? navigator.userAgent : 'server')

  // Parse user agent for additional context (basic implementation)
  const is_mobile = /mobile|android|iphone|ipad|tablet/i.test(user_agent)
  const platform = typeof window !== 'undefined' ? navigator.platform : 'server'

  // Basic browser detection
  let browser = 'unknown'
  if (user_agent.includes('Chrome')) browser = 'Chrome'
  else if (user_agent.includes('Firefox')) browser = 'Firefox'
  else if (user_agent.includes('Safari')) browser = 'Safari'
  else if (user_agent.includes('Edge')) browser = 'Edge'

  return {
    ip_address,
    user_agent,
    platform,
    is_mobile,
    browser,
    timestamp: new Date().toISOString()
  }
}

/**
 * Check if IP is from a private network (for security/logging)
 */
export function isPrivateIP(ip: string): boolean {
  if (ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') {
    return true
  }

  // Private IPv4 ranges
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
  ]

  return privateRanges.some(range => range.test(ip))
}

/**
 * Format IP address for display (mask for privacy if needed)
 */
export function formatIPForDisplay(ip: string, maskPrivacy: boolean = false): string {
  if (!maskPrivacy || ip === 'unknown' || ip === 'client-side' || ip === 'server-side') {
    return ip
  }

  // For LGPD compliance, you may want to mask the last octet
  // Example: 192.168.1.100 -> 192.168.1.***
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.***`
  }

  // For IPv6, mask the last segment
  const ipv6Parts = ip.split(':')
  if (ipv6Parts.length > 1) {
    ipv6Parts[ipv6Parts.length - 1] = '****'
    return ipv6Parts.join(':')
  }

  return ip
}

/**
 * Rate limiting helper - get client identifier
 * Combines IP and user agent for more accurate rate limiting
 */
export function getClientIdentifier(headers?: Headers): string {
  const ip = headers ? getIPFromHeaders(headers) : 'unknown'
  const userAgent = headers?.get('user-agent') || 'unknown'

  // Create a simple hash of IP + user agent for rate limiting
  return `${ip}|${userAgent.substring(0, 50)}`
}
