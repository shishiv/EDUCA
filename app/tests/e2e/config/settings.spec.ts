import type { Page, Response } from '@playwright/test'
import { test, expect } from '../support/diagnostics'

const AUTH = 'playwright/.auth'
const MUNICIPAL_ENDPOINT = '/api/school-settings/municipal'
const ACADEMIC_YEAR_ENDPOINT = '/api/school-settings/academic-year'

function matchesApiResponse(response: Response, pathname: string, method: 'GET' | 'PATCH') {
  return new URL(response.url()).pathname === pathname && response.request().method() === method
}

async function openSettings(page: Page, expectedEndpoint: string) {
  const settingsResponse = page.waitForResponse(response =>
    matchesApiResponse(response, expectedEndpoint, 'GET'))

  await page.goto('/dashboard/configuracoes')
  expect((await settingsResponse).ok()).toBe(true)
  await expect(page.getByRole('heading', { name: 'Configurações', exact: true })).toBeVisible()
}

async function saveMunicipalName(page: Page, municipalityName: string) {
  const responsePromise = page.waitForResponse(response =>
    matchesApiResponse(response, MUNICIPAL_ENDPOINT, 'PATCH'))

  await page.getByLabel('Município', { exact: true }).fill(municipalityName)
  await page.getByRole('button', { name: 'Salvar configurações municipais', exact: true }).click()

  const response = await responsePromise
  expect(response.ok()).toBe(true)
  expect(await response.json()).toMatchObject({
    settings: { municipality_name: municipalityName },
  })
  await expect(page.getByRole('status').filter({
    hasText: 'Configurações municipais salvas com sucesso.',
  })).toHaveText('Configurações municipais salvas com sucesso.')
}

async function reloadMunicipalSettings(page: Page) {
  const responsePromise = page.waitForResponse(response =>
    matchesApiResponse(response, MUNICIPAL_ENDPOINT, 'GET'))
  await page.reload()
  expect((await responsePromise).ok()).toBe(true)
}

async function saveAcademicYear(page: Page, startDate: string, endDate: string) {
  const responsePromise = page.waitForResponse(response =>
    matchesApiResponse(response, ACADEMIC_YEAR_ENDPOINT, 'PATCH'))

  await page.getByLabel('Data de início', { exact: true }).fill(startDate)
  await page.getByLabel('Data de término', { exact: true }).fill(endDate)
  await page.getByRole('button', { name: 'Salvar período letivo', exact: true }).click()

  const response = await responsePromise
  expect(response.ok()).toBe(true)
  expect(await response.json()).toMatchObject({
    academicYear: {
      data_inicio: startDate,
      data_fim: endDate,
    },
  })
  await expect(page.getByRole('status').filter({
    hasText: 'Período letivo salvo com sucesso.',
  })).toHaveText('Período letivo salvo com sucesso.')
}

async function reloadAcademicYear(page: Page) {
  const municipalResponse = page.waitForResponse(response =>
    matchesApiResponse(response, MUNICIPAL_ENDPOINT, 'GET'))
  const academicYearResponse = page.waitForResponse(response =>
    matchesApiResponse(response, ACADEMIC_YEAR_ENDPOINT, 'GET'))

  await page.reload()
  expect((await municipalResponse).ok()).toBe(true)
  expect((await academicYearResponse).ok()).toBe(true)
}

async function savePeriods(page: Page) {
  const saved = page.waitForResponse(response => matchesApiResponse(response, '/api/school-settings/periods', 'PATCH'))
  await page.getByRole('button', { name: 'Salvar períodos', exact: true }).click()
  expect((await saved).ok()).toBe(true)
}

function alternateAcademicPeriod(originalStart: string, originalEnd: string) {
  const year = originalStart.slice(0, 4)
  const candidates = [
    { startDate: `${year}-02-01`, endDate: `${year}-11-30` },
    { startDate: `${year}-03-01`, endDate: `${year}-10-31` },
  ]
  const alternative = candidates.find(candidate =>
    candidate.startDate !== originalStart || candidate.endDate !== originalEnd)

  if (!alternative) throw new Error('No alternate academic period available')
  return alternative
}

test.describe('Settings - municipal authority', () => {
  test.use({ storageState: `${AUTH}/user.json` })

  test('persists and restores the governed municipal identity', async ({ page }) => {
    await openSettings(page, MUNICIPAL_ENDPOINT)

    await expect(page.getByRole('heading', { name: 'Identidade municipal e Educacenso', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Calendário do ano letivo', exact: true })).toHaveCount(0)

    const municipality = page.getByLabel('Município', { exact: true })
    await expect(municipality).toBeEditable()
    await expect(municipality).toHaveValue(/\S+/)
    const originalName = await municipality.inputValue()
    const suffix = originalName.endsWith(' E2E') ? ' Teste' : ' E2E'
    const changedName = `${originalName.slice(0, 120 - suffix.length)}${suffix}`

    try {
      await saveMunicipalName(page, changedName)
      await reloadMunicipalSettings(page)
      await expect(municipality).toHaveValue(changedName)
    } finally {
      await saveMunicipalName(page, originalName)
      await reloadMunicipalSettings(page)
      await expect(municipality).toHaveValue(originalName)
    }
  })
})

test.describe('Settings - director authority', () => {
  test.use({ storageState: `${AUTH}/diretor.json` })

  test('persists explicit school periods without inventing an absent calendar', async ({ page }, testInfo) => {
    await openSettings(page, ACADEMIC_YEAR_ENDPOINT)
    await expect(page.locator('#period-primeiro-name')).toHaveValue('')
    const year = await page.locator('#academic-year-number').inputValue()
    try {
      await page.locator('#period-primeiro-name').fill('Primeiro período sintético')
      await page.locator('#period-primeiro-start').fill(`${year}-02-01`)
      await page.locator('#period-primeiro-end').fill(`${year}-06-30`)
      await savePeriods(page)
      await reloadAcademicYear(page)
      await expect(page.locator('#period-primeiro-name')).toHaveValue('Primeiro período sintético')
      await expect(page.locator('#period-primeiro-start')).toHaveValue(`${year}-02-01`)
      await page.locator('section[aria-label="Períodos escolares"]').screenshot({ path: testInfo.outputPath('school-period-settings.png') })
    } finally {
      const restored = await page.request.patch('/api/school-settings/periods', { data: { year: Number(year), periods: [] } })
      expect(restored.ok()).toBe(true)
    }
    await reloadAcademicYear(page)
    await expect(page.locator('#period-primeiro-name')).toHaveValue('')
    for (const route of ['/relatorios/frequencia', '/relatorios/conteudo']) {
      await page.goto(route)
      await page.getByLabel('Turma', { exact: true }).click()
      await page.getByRole('option', { name: /1º Ano A E2E/ }).click()
      await page.getByLabel('Período', { exact: true }).click()
      await expect(page.getByRole('option', { name: 'Períodos escolares não configurados', exact: true })).toBeDisabled()
      await page.getByRole('option', { name: 'Personalizado', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Gerar Relatorio', exact: true })).toBeEnabled()
    }
  })

  test('keeps municipal identity read-only and persists the school academic year', async ({ page }) => {
    await openSettings(page, ACADEMIC_YEAR_ENDPOINT)

    await expect(page.getByRole('heading', { name: 'Identidade municipal e Educacenso', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Calendário do ano letivo', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salvar configurações municipais', exact: true })).toHaveCount(0)

    for (const label of [
      'Município',
      'Secretaria de educação',
      'Estado',
      'Telefone de contato',
      'E-mail do encarregado',
      'Endereço do encarregado',
    ]) {
      await expect(page.getByLabel(label, { exact: true })).toBeDisabled()
    }
    await expect(page.getByLabel(/^Prazo Educacenso \d{4}$/)).toBeDisabled()

    const startDate = page.getByLabel('Data de início', { exact: true })
    const endDate = page.getByLabel('Data de término', { exact: true })
    await expect(startDate).toBeEditable()
    await expect(endDate).toBeEditable()
    await expect(startDate).toHaveValue(/^\d{4}-\d{2}-\d{2}$/)
    await expect(endDate).toHaveValue(/^\d{4}-\d{2}-\d{2}$/)

    const originalStart = await startDate.inputValue()
    const originalEnd = await endDate.inputValue()
    const alternative = alternateAcademicPeriod(originalStart, originalEnd)

    try {
      await saveAcademicYear(page, alternative.startDate, alternative.endDate)
      await reloadAcademicYear(page)
      await expect(startDate).toHaveValue(alternative.startDate)
      await expect(endDate).toHaveValue(alternative.endDate)
    } finally {
      await saveAcademicYear(page, originalStart, originalEnd)
      await reloadAcademicYear(page)
      await expect(startDate).toHaveValue(originalStart)
      await expect(endDate).toHaveValue(originalEnd)
    }
  })
})
