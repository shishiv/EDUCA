/**
 * J1 - Visitante público (non-destructive smoke)
 *
 * This spec runs only against an explicitly configured public demo origin.
 * It performs NO mutations - read-only assertions only.
 * Safe to run against the shared sandbox.
 */
import { expect, test } from '@playwright/test'

test.describe('J1: public visitor journey', () => {
  test('visitor can move from landing to demo, login, and home', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { level: 1, name: 'Gestão escolar para redes municipais, com código aberto.' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'EDUCA' }).first()).toBeVisible()
    await expect(page.getByTestId('locale-switcher')).toBeVisible()
    await expect(page.getByTestId('locale-switcher')).toHaveCSS('position', 'relative')

    await page.getByRole('link', { name: 'Ver a demonstração' }).click()
    await expect(page).toHaveURL(/\/demo\/?$/)
    await expect(page.getByRole('heading', { level: 1, name: /sandbox público do educa/i })).toBeVisible()
    await expect(page.getByText(/não insira dados pessoais ou escolares reais/i)).toBeVisible()

    await page.getByRole('link', { name: /continuar para o login do demo/i }).click()
    await expect(page).toHaveURL(/\/login\/?$/)
    await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Senha', { exact: true })).toBeVisible()
    await page.getByRole('link', { name: /voltar ao início/i }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('public pages keep the language selector in layout flow', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('combobox', { name: 'Idioma da aplicação' }).selectOption('en')
    await expect.poll(async () => (await page.context().cookies()).find(cookie => cookie.name === 'EDUCA_LOCALE')?.value).toBe('en')
    await expect(page.getByRole('heading', { level: 1, name: 'School management for municipal networks, with open-source code.' })).toBeVisible()

    for (const path of ['/demo', '/login', '/politica-privacidade']) {
      await page.goto(path)
      const selector = page.getByTestId('locale-switcher')
      await expect(selector).toBeVisible()
      await expect(selector).toHaveCSS('position', 'relative')
    }
  })


  test('Portuguese-only blog routes hide the locale selector', async ({ page }) => {
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
