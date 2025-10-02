/**
 * Mock Supabase Server Client for Jest Tests
 *
 * Provides mock implementation for server-side Supabase operations.
 * Used in unit tests for server actions and hooks.
 */

export const createClient = jest.fn(() =>
  Promise.resolve({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({
          data: { user: null },
          error: null,
        })
      ),
    },
  })
)

export const createAdminClient = jest.fn(() =>
  Promise.resolve({
    from: jest.fn().mockReturnThis(),
    auth: {
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
      },
    },
  })
)

export const getCurrentUser = jest.fn(() => Promise.resolve(null))

export const verifyUserRole = jest.fn(() => Promise.resolve(false))