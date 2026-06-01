import { Page, expect } from '@playwright/test'

/**
 * E2E Test Utilities for EDUCA
 */

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
}

/**
 * Login helper for tests that need fresh authentication
 */
export async function loginAs(
  page: Page, 
  email: string, 
  password: string = 'test123456'
) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
}

/**
 * Fill a select/combobox by label
 */
export async function selectOption(
  page: Page, 
  labelPattern: RegExp, 
  optionPattern?: RegExp
) {
  const select = page.getByLabel(labelPattern)
  await select.click()
  
  if (optionPattern) {
    await page.getByRole('option', { name: optionPattern }).click()
  } else {
    await page.getByRole('option').first().click()
  }
}

/**
 * Fill date field
 */
export async function fillDate(page: Page, labelPattern: RegExp, date: Date) {
  const dateStr = date.toISOString().split('T')[0]
  const field = page.getByLabel(labelPattern)
  await field.fill(dateStr)
}

/**
 * Generate valid Brazilian CPF for testing
 * This generates a mathematically valid CPF
 */
export function generateValidCPF(): string {
  const randomDigits = () => Math.floor(Math.random() * 9)
  
  const digits = Array.from({ length: 9 }, randomDigits)
  
  // Calculate first check digit
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i)
  }
  let check1 = 11 - (sum % 11)
  if (check1 >= 10) check1 = 0
  digits.push(check1)
  
  // Calculate second check digit
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i)
  }
  let check2 = 11 - (sum % 11)
  if (check2 >= 10) check2 = 0
  digits.push(check2)
  
  // Format as XXX.XXX.XXX-XX
  const cpf = digits.join('')
  return `${cpf.slice(0,3)}.${cpf.slice(3,6)}.${cpf.slice(6,9)}-${cpf.slice(9,11)}`
}

/**
 * Generate random email for testing
 */
export function generateTestEmail(prefix: string = 'test'): string {
  return `${prefix}${Date.now()}@teste.com`
}

/**
 * Wait for toast/notification message
 */
export async function expectToast(page: Page, messagePattern: RegExp) {
  await expect(page.getByText(messagePattern)).toBeVisible({ timeout: 10000 })
}

/**
 * Wait for form submission success
 */
export async function expectFormSuccess(page: Page) {
  await expect(
    page.getByText(/sucesso|salvo|criado|atualizado|cadastrado/i)
  ).toBeVisible({ timeout: 10000 })
}

/**
 * Wait for form validation error
 */
export async function expectFormError(page: Page, errorPattern?: RegExp) {
  const pattern = errorPattern || /erro|inválido|obrigatório|falha/i
  await expect(page.getByText(pattern)).toBeVisible()
}

/**
 * Navigate to a dashboard section
 */
export async function navigateTo(page: Page, section: string) {
  await page.goto(`/dashboard/${section}`)
  await waitForPageLoad(page)
}

/**
 * Check if user is on authenticated page
 */
export async function assertAuthenticated(page: Page) {
  // Should not be on login page
  await expect(page).not.toHaveURL(/login/)
}

/**
 * Verify navigation menu is visible
 */
export async function assertNavigationVisible(page: Page) {
  // Check for sidebar or nav
  const nav = page.getByRole('navigation')
  await expect(nav).toBeVisible()
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page): Promise<number> {
  const rows = page.getByRole('row')
  return await rows.count() - 1 // Subtract header row
}

/**
 * Brazilian phone formatter
 */
export function formatBrazilianPhone(number: string): string {
  const clean = number.replace(/\D/g, '')
  if (clean.length === 11) {
    return `(${clean.slice(0,2)}) ${clean.slice(2,7)}-${clean.slice(7)}`
  }
  if (clean.length === 10) {
    return `(${clean.slice(0,2)}) ${clean.slice(2,6)}-${clean.slice(6)}`
  }
  return number
}
