/**
 * J1 - Visitante público (non-destructive smoke)
 *
 * Dedicated configs run this spec against a local app or an explicitly
 * configured public demo origin.
 * It performs NO server mutations; explicit submission is intercepted locally.
 * Safe to run against the shared sandbox.
 */
import { createHash } from 'node:crypto'
import { expect, test, type Locator, type Page } from '@playwright/test'

async function focusAppearance(target: Locator) {
  return target.evaluate(element => {
    const style = getComputedStyle(element)
    return { outline: style.outline, boxShadow: style.boxShadow }
  })
}

async function tabTo(page: Page, target: Locator, key: 'Tab' | 'Shift+Tab' = 'Tab') {
  await expect(target).toBeVisible()
  if (await target.evaluate(element => element === document.activeElement)) {
    await page.keyboard.press(key)
  }
  const unfocused = await focusAppearance(target)
  // Safety bound, not an assertion about incidental tab order or tab count.
  for (let step = 0; step < 50; step += 1) {
    await page.keyboard.press(key)
    if (await target.evaluate(element => element === document.activeElement)) {
      await expect(target).toBeInViewport()
      expect(await target.evaluate(element => element.matches(':focus-visible'))).toBe(true)
      await expect.poll(() => focusAppearance(target)).not.toEqual(unfocused)
      return
    }
  }
  await expect(target, `Control must be reachable with ${key}`).toBeFocused()
}

test.describe('J1: public visitor journey', () => {
  test('visitor can move from landing to demo, login, and home', async ({ page, isMobile }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { level: 1, name: 'Gestão escolar para redes municipais, com código aberto.' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'EDUCA' }).first()).toBeVisible()
    if (isMobile) {
      await tabTo(page, page.getByLabel('Abrir menu', { exact: true }))
      await page.keyboard.press('Enter')
    }
    await expect(page.getByRole('button', { name: 'Mudar idioma para English' }).first()).toHaveText('PT')
    await expect(page.locator('header').getByRole('link', { name: 'Ver a demonstração' })).toHaveAttribute('href', '/demo')
    if (isMobile) await page.keyboard.press('Escape')

    // The demo call to action is repeated in the header and in the hero under
    // the same label; the hero one is the in-page next step.
    await tabTo(page, page.locator('main').getByRole('link', { name: 'Ver a demonstração' }))
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/demo\/?$/)
    await expect(page.getByRole('heading', { level: 1, name: /sandbox público do educa/i })).toBeVisible()
    await expect(page.getByText(/não insira dados pessoais ou escolares reais/i)).toBeVisible()

    let signInRequests = 0
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/auth/v1/token') signInRequests += 1
    })
    // Never send credentials or create a session on a shared sandbox.
    await page.route('**/auth/v1/token**', route => route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'invalid_credentials', message: 'Invalid login credentials' }),
    }))
    await tabTo(page, page.getByRole('link', { name: /continuar para o login do demo/i }))
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/login\/?$/)
    await page.setViewportSize({ width: 390, height: 844 })
    const email = page.getByLabel('E-mail', { exact: true })
    const password = page.getByLabel('Senha', { exact: true })
    const fillDemo = page.getByRole('button', { name: 'Preencher credenciais demo' })
    const submit = page.getByRole('button', { name: 'Entrar', exact: true })
    await expect(email).toBeInViewport()
    await expect(password).toBeInViewport()
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeInViewport()
    if ((process.env.NEXT_PUBLIC_DEMO_SANDBOX ?? 'true') === 'true') {
      await expect(page.getByText('Experimente o EDUCA com dados de demonstração e ajude a melhorar o projeto')).toBeInViewport()
      await expect(email).toHaveValue('demo@educa.app.br')
      // Pin the existing synthetic credential without exposing it in assertion output.
      const initialPassword = await password.inputValue()
      expect(createHash('sha256').update(initialPassword).digest('hex')).toBe('6269bdc44514c668efb1ee9442d68ac81c662367fa36c1883e3027ee197f4036')
      expect(signInRequests).toBe(0)
      // Initial values above are visible before interaction. Let the route's
      // client scripts finish loading before testing its restore handler.
      await page.waitForLoadState('networkidle')
      await tabTo(page, email)
      await page.keyboard.press('ControlOrMeta+A')
      await page.keyboard.type('edited@synthetic.invalid')
      await tabTo(page, password)
      await page.keyboard.press('ControlOrMeta+A')
      await page.keyboard.press('Backspace')
      await tabTo(page, fillDemo)
      await page.keyboard.press('Space')
      await expect(email).toHaveValue('demo@educa.app.br')
      expect(await password.inputValue() === initialPassword).toBe(true)
    } else {
      await expect(page.getByRole('heading', { name: 'Entrar no sistema' })).toBeVisible()
      await expect(email).toHaveValue('')
      expect(await password.inputValue() === '').toBe(true)
      await expect(fillDemo).toHaveCount(0)
    }
    expect(signInRequests).toBe(0)
    await expect(page).toHaveURL(/\/login\/?$/)
    await expect(page.getByTestId('locale-switcher')).toHaveCount(0)
    await page.waitForLoadState('networkidle')
    const remember = page.getByRole('checkbox', { name: 'Manter conectado' })
    await tabTo(page, remember)
    await page.keyboard.press('Space')
    await expect(remember).not.toBeChecked()
    await page.keyboard.press('Space')
    await expect(remember).toBeChecked()
    const recovery = page.getByRole('link', { name: 'Esqueci minha senha' })
    await tabTo(page, recovery)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/reset-password\/?$/)
    await expect(page.getByLabel(/e-mail/i)).toBeVisible()
    await tabTo(page, page.getByRole('link', { name: 'Voltar ao login' }))
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/login\/?$/)
    await page.waitForLoadState('networkidle')
    await tabTo(page, password)
    await tabTo(page, email, 'Shift+Tab')
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.type('keyboard@synthetic.invalid')
    await tabTo(page, password)
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.type('synthetic-keyboard-input')
    await tabTo(page, submit)
    expect(signInRequests).toBe(0)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('alert').first()).toHaveText('E-mail ou senha inválidos.')
    expect(signInRequests).toBe(1)
    await expect(submit).toBeEnabled()
    await expect(email).toHaveValue('keyboard@synthetic.invalid')
    await expect(page).toHaveURL(/\/login\/?$/)
    await tabTo(page, page.getByRole('link', { name: /voltar ao início/i }), 'Shift+Tab')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/$/)
  })

  test('public headers use the compact locale button and login has no locale control', async ({ page, isMobile }) => {
    await page.goto('/')
    if (isMobile) await page.getByLabel('Abrir menu', { exact: true }).click()
    await page.getByRole('button', { name: 'Mudar idioma para English' }).first().click()
    await expect.poll(async () => (await page.context().cookies()).find(cookie => cookie.name === 'EDUCA_LOCALE')?.value).toBe('en')
    await expect(page.getByRole('heading', { level: 1, name: 'School management for municipal networks, with open-source code.' })).toBeVisible()

    for (const path of ['/demo', '/politica-privacidade']) {
      await page.goto(path)
      await expect(page.getByRole('button', { name: 'Switch language to Português (Brasil)' })).toHaveText('EN')
    }

    await page.goto('/login')
    await expect(page.getByTestId('locale-switcher')).toHaveCount(0)
  })


  test('Portuguese-only blog routes hide the locale button', async ({ page }) => {
    for (const path of [
      '/blog',
      '/blog/lgpd-em-escola-municipal',
      '/blog/encarregado-de-dados-em-prefeitura',
      '/blog/dado-de-crianca-no-educacenso',
    ]) {
      await page.goto(path)
      await expect(page.getByTestId('locale-switcher')).toHaveCount(0)
    }
  })
  test('privacy policy remains public', async ({ page }) => {
    const response = await page.goto('/politica-privacidade')
    expect(response?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { level: 1, name: /política de privacidade/i })).toBeVisible()
  })

  test('blog index and all migrated articles remain public with working OG images', async ({ page, request }) => {
    await page.goto('/blog')
    await expect(page.getByRole('heading', { level: 1, name: 'LGPD aplicada à rede municipal' })).toBeVisible()

    const posts = [
      ['lgpd-em-escola-municipal', 'LGPD em escola municipal: controlador, operador, bases legais e direitos', '/brand/og-blog-lgpd-em-escola-municipal.jpg'],
      ['encarregado-de-dados-em-prefeitura', 'Encarregado de dados em prefeitura: como designar e publicar o contato', '/brand/og-blog-encarregado-de-dados-em-prefeitura.jpg'],
      ['dado-de-crianca-no-educacenso', 'Dado de criança no Educacenso: base legal, limites e proteção', '/brand/og-blog-dado-de-crianca-no-educacenso.jpg'],
    ] as const

    for (const [slug, title, image] of posts) {
      await page.goto(`/blog/${slug}`)
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Fontes primárias' })).toBeVisible()
      expect((await request.get(image)).ok()).toBe(true)
    }
  })

  test('legacy public URLs redirect permanently to equivalent canonical destinations', async ({ request }) => {
    const expected = {
      '/privacidade': '/politica-privacidade',
      '/funcionalidades': '/#recursos',
      '/comunidade': 'https://github.com/shishiv/EDUCA/discussions',
      '/contribuidores': 'https://github.com/shishiv/EDUCA',
      '/patrocinadores': 'https://github.com/shishiv/EDUCA/discussions',
      '/piloto-municipal': '/demo',
      '/roadmap': 'https://github.com/shishiv/EDUCA/issues',
      '/whatsapp': 'https://github.com/shishiv/EDUCA/tree/dev/app/lib/notifications',
      '/blog/bem-vindo': '/blog',
    }

    for (const [path, destination] of Object.entries(expected)) {
      const response = await request.get(path, { maxRedirects: 0 })
      expect(response.status(), path).toBe(308)
      expect(new URL(response.headers().location, response.url()).toString(), path).toBe(new URL(destination, response.url()).toString())
    }
  })

  test('/reset-password is accessible without auth', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByLabel(/e-mail/i)).toBeVisible()
  })

  test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
