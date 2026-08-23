import { isIP } from 'node:net'

function isPrivateOrLoopbackIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map(Number)
  if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet))) return false

  const [first, second] = octets
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  )
}

function expandIpv6(hostname: string): number[] | null {
  const parts = hostname.split('::')
  if (parts.length > 2) return null

  const left = parts[0] ? parts[0].split(':') : []
  const right = parts[1] ? parts[1].split(':') : []
  const omitted = 8 - left.length - right.length
  if ((parts.length === 1 && omitted !== 0) || omitted < 0) return null

  const words = [...left, ...Array(omitted).fill('0'), ...right].map(part => Number.parseInt(part || '0', 16))
  return words.length === 8 && words.every(word => Number.isInteger(word)) ? words : null
}

export function isLocalOrLoopbackHostname(rawHostname: string): boolean {
  const hostname = rawHostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  const ipVersion = isIP(hostname)

  if (ipVersion === 0 && (
    !hostname.includes('.') ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.home.arpa')
  )) {
    return true
  }

  if (ipVersion === 4) return isPrivateOrLoopbackIpv4(hostname)
  if (ipVersion !== 6) return false

  const words = expandIpv6(hostname)
  if (!words) return true

  const unspecifiedOrLoopback = words.slice(0, 7).every(word => word === 0) && words[7] <= 1
  const uniqueLocal = (words[0] & 0xfe00) === 0xfc00
  const linkLocal = (words[0] & 0xffc0) === 0xfe80
  const ipv4Mapped = words.slice(0, 5).every(word => word === 0) && words[5] === 0xffff
  const mappedAddress = `${words[6] >> 8}.${words[6] & 0xff}.${words[7] >> 8}.${words[7] & 0xff}`

  return unspecifiedOrLoopback || uniqueLocal || linkLocal || (ipv4Mapped && isPrivateOrLoopbackIpv4(mappedAddress))
}

export function assertPublicDemoBaseURL(value: string): URL {
  const url = new URL(value)
  if (url.protocol !== 'https:' || isLocalOrLoopbackHostname(url.hostname)) {
    throw new Error('PUBLIC_DEMO_BASE_URL must be an HTTPS public origin')
  }
  return url
}
