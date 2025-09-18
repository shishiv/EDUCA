/**
 * Contract Test: GET /audit/mcp
 * Validates API contract compliance for MCP configurations retrieval
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'

// Test imports - these will initially fail until implementation is created
// This is expected for TDD approach
import { GET } from '../../app/api/audit/mcp/route'

describe('Contract Test: GET /audit/mcp', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup after each test
  })

  describe('Request Validation', () => {
    it('should accept GET request with no query parameters', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      // This will fail until implementation exists - TDD requirement
      const response = await GET(mockRequest)
      expect(response).toBeDefined()
    })

    it('should accept GET request and return MCP configurations', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      expect(response.status).toBe(200)
    })
  })

  describe('Response Contract Validation', () => {
    it('should return 200 status for successful request', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      expect(response.status).toBe(200)
    })

    it('should return array of MCPConfiguration objects', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      // Validate response is an array per API contract
      expect(Array.isArray(data)).toBe(true)
    })

    it('should return valid MCPConfiguration schema in array items', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      if (data.length > 0) {
        const mcpConfig = data[0]

        // Validate required MCPConfiguration fields per API contract
        expect(mcpConfig).toHaveProperty('name')
        expect(mcpConfig).toHaveProperty('type')
        expect(mcpConfig).toHaveProperty('status')

        // Validate data types
        expect(typeof mcpConfig.name).toBe('string')
        expect(['supabase', 'shadcn-ui', 'playwright', 'custom']).toContain(mcpConfig.type)
        expect(['not_configured', 'configured', 'active', 'error']).toContain(mcpConfig.status)

        // Validate optional fields if present
        if (mcpConfig.id !== undefined) {
          expect(typeof mcpConfig.id).toBe('string')
          expect(mcpConfig.id.length).toBeGreaterThan(0)
        }

        if (mcpConfig.config !== undefined) {
          expect(typeof mcpConfig.config).toBe('object')
        }

        if (mcpConfig.last_updated !== undefined) {
          expect(typeof mcpConfig.last_updated).toBe('string')
          expect(new Date(mcpConfig.last_updated)).toBeInstanceOf(Date)
        }

        if (mcpConfig.health_check_url !== undefined) {
          expect(typeof mcpConfig.health_check_url).toBe('string')
          // Basic URL validation
          expect(mcpConfig.health_check_url).toMatch(/^https?:\/\//)
        }
      }
    })

    it('should include standard MCP integrations for educational system', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should include expected MCP integrations for Brazilian educational system
      const mcpNames = data.map((config: any) => config.name)
      const mcpTypes = data.map((config: any) => config.type)

      // Should have essential MCP integrations
      const expectedTypes = ['supabase', 'shadcn-ui', 'playwright']
      expectedTypes.forEach(type => {
        expect(mcpTypes).toContain(type)
      })
    })

    it('should return proper Content-Type header', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('MCP Integration Validation', () => {
    it('should include Supabase MCP configuration', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      const supabaseMcp = data.find((config: any) => config.type === 'supabase')
      expect(supabaseMcp).toBeDefined()

      if (supabaseMcp) {
        expect(supabaseMcp.name).toBeTruthy()
        expect(['not_configured', 'configured', 'active', 'error']).toContain(supabaseMcp.status)
      }
    })

    it('should include shadcn/ui MCP configuration', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      const shadcnMcp = data.find((config: any) => config.type === 'shadcn-ui')
      expect(shadcnMcp).toBeDefined()

      if (shadcnMcp) {
        expect(shadcnMcp.name).toBeTruthy()
        expect(['not_configured', 'configured', 'active', 'error']).toContain(shadcnMcp.status)
      }
    })

    it('should include Playwright MCP configuration', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      const playwrightMcp = data.find((config: any) => config.type === 'playwright')
      expect(playwrightMcp).toBeDefined()

      if (playwrightMcp) {
        expect(playwrightMcp.name).toBeTruthy()
        expect(['not_configured', 'configured', 'active', 'error']).toContain(playwrightMcp.status)
      }
    })

    it('should provide health check URLs for active MCPs', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      const activeMcps = data.filter((config: any) => config.status === 'active')

      activeMcps.forEach((mcp: any) => {
        // Active MCPs should ideally have health check URLs
        if (mcp.health_check_url) {
          expect(typeof mcp.health_check_url).toBe('string')
          expect(mcp.health_check_url).toMatch(/^https?:\/\//)
        }
      })
    })

    it('should include configuration details for configured MCPs', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      const configuredMcps = data.filter((config: any) =>
        config.status === 'configured' || config.status === 'active'
      )

      configuredMcps.forEach((mcp: any) => {
        // Configured MCPs should have configuration details
        if (mcp.config) {
          expect(typeof mcp.config).toBe('object')
        }

        if (mcp.last_updated) {
          expect(typeof mcp.last_updated).toBe('string')
          expect(new Date(mcp.last_updated)).toBeInstanceOf(Date)
        }
      })
    })
  })

  describe('Brazilian Educational Context Validation', () => {
    it('should support educational MCP integrations', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should include MCPs relevant to Brazilian educational system
      const mcpTypes = data.map((config: any) => config.type)

      // Essential for educational management
      expect(mcpTypes).toContain('supabase') // Database operations
      expect(mcpTypes).toContain('shadcn-ui') // UI components
    })

    it('should handle UTF-8 encoding for MCP names and configs', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      // Should properly handle any Brazilian Portuguese configuration names
      data.forEach((config: any) => {
        expect(typeof config.name).toBe('string')
        expect(config.name.length).toBeGreaterThan(0)
      })
    })

    it('should provide educational system specific MCP status', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      // All MCPs should have valid status
      data.forEach((config: any) => {
        expect(['not_configured', 'configured', 'active', 'error']).toContain(config.status)
      })

      // For production readiness, critical MCPs should be active
      const supabaseMcp = data.find((config: any) => config.type === 'supabase')
      if (supabaseMcp) {
        // In production, Supabase should be active
        expect(['configured', 'active']).toContain(supabaseMcp.status)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle MCP service connection errors gracefully', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)

      // Should not crash the application even if some MCPs are down
      expect(response).toBeDefined()
      expect(typeof response.status).toBe('number')
    })

    it('should return empty array if no MCPs configured', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      // Should return empty array rather than error if no MCPs configured
    })

    it('should handle individual MCP errors without failing entire request', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should include MCPs with error status rather than excluding them
      const errorMcps = data.filter((config: any) => config.status === 'error')

      errorMcps.forEach((mcp: any) => {
        expect(mcp).toHaveProperty('name')
        expect(mcp).toHaveProperty('type')
        expect(mcp.status).toBe('error')
      })
    })
  })

  describe('Performance Contract', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now()

      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response).toBeDefined()
      // MCP status check should be under 3 seconds for production readiness
      expect(responseTime).toBeLessThan(3000)
    })

    it('should not block on slow MCP health checks', async () => {
      const startTime = Date.now()

      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)

      // Should return quickly even if some MCPs are slow to respond
      // Should use cached status or timeout rather than blocking
      expect(responseTime).toBeLessThan(5000)
    })
  })

  describe('Security Validation', () => {
    it('should not expose sensitive MCP configuration data', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      data.forEach((config: any) => {
        // Should not expose sensitive credentials
        if (config.config) {
          const configStr = JSON.stringify(config.config)

          // Should not contain obvious secrets
          expect(configStr).not.toMatch(/password/i)
          expect(configStr).not.toMatch(/secret/i)
          expect(configStr).not.toMatch(/key.*[a-zA-Z0-9]{20,}/i)
          expect(configStr).not.toMatch(/token/i)
        }
      })
    })

    it('should provide safe health check URLs only', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/audit/mcp', {
        method: 'GET'
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      data.forEach((config: any) => {
        if (config.health_check_url) {
          // Should be proper HTTPS URLs for production
          expect(config.health_check_url).toMatch(/^https:\/\//)

          // Should not include credentials in URL
          expect(config.health_check_url).not.toMatch(/:\/\/[^@]*:[^@]*@/)
        }
      })
    })
  })
})