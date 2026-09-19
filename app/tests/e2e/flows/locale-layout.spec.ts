import { test, expect } from '../support/diagnostics'

for (const viewport of [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'compact desktop', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`keeps language and student form actions usable on ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/dashboard/alunos/novo')

    const language = page.getByRole('button', { name: 'Mudar idioma para English', exact: true })
    await expect(language).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)

    // An ordinary click must reach the form, even after scrolling to its footer.
    // The former fixed locale selector intercepted this action on desktop.
    await page.getByRole('button', { name: 'Cadastrar Aluno', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/alunos\/novo$/)
    await expect(page.getByLabel('Nome Completo *', { exact: true })).toHaveValue('')

    await testInfo.attach(`locale-layout-${viewport.name}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    })

    await language.click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page).toHaveURL(/\/dashboard\/alunos\/novo$/)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)
  })
}

test.describe('mobile school selection', () => {
  test.use({ hasTouch: true })

  test('selects a school by touch and restores focus when closing nested menus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard')
    const openMenu = page.getByRole('button', { name: 'Abrir menu', exact: true })
    await openMenu.tap()
    const drawer = page.getByRole('dialog', { name: 'Menu principal', exact: true })
    const closeMenu = drawer.getByRole('button', { name: 'Fechar sidebar', exact: true })
    const school = drawer.locator('button[role="combobox"]')
    await school.tap()
    const option = page.getByRole('option').first()
    const schoolName = (await option.innerText()).trim()
    await option.tap()
    await expect(school).toHaveAttribute('aria-label', schoolName)
    await expect(page.getByRole('listbox')).toBeHidden()
    await expect(closeMenu).toBeVisible()

    await school.tap()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox')).toBeHidden()
    await expect(school).toBeFocused()
    await expect(closeMenu).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(closeMenu).toBeHidden()
    await expect(openMenu).toBeFocused()
  })
})
