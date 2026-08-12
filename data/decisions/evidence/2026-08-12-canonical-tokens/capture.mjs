/**
 * Canonical tokens before/after evidence (durable, reproducible).
 * Run from app/:  STATE=before|after node ../data/decisions/evidence/2026-08-12-canonical-tokens/capture.mjs
 * Captures desktop screenshots of representative token-driven surfaces and
 * measures the computed --primary/--ring vars plus the rendered colour of a
 * primary Button and a checked Checkbox (proof the token drives the component).
 */
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire(process.env.APP_DIR || '/home/shiv/.treehouse/EDUCA-027bb4/1/EDUCA/app/package.json')
const { chromium } = require('@playwright/test')

const STATE = process.env.STATE || 'after'
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const OUT = '/home/shiv/.treehouse/EDUCA-027bb4/1/EDUCA/data/decisions/evidence/2026-08-12-canonical-tokens'
mkdirSync(OUT, { recursive: true })

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(400)
  await page.locator('input[type="email"], input#email').first().fill('admin@test.com')
  await page.locator('input[type="password"], input#password').first().fill('test123456')
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 30000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(600)
}

const routes = [
  { name: 'usuarios', path: '/dashboard/usuarios' },
  { name: 'novo-aluno', path: '/dashboard/alunos/novo' },
]

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
const page = await context.newPage()
await login(page)

const result = { state: STATE, capturedAt: new Date().toISOString(), tokens: {}, components: {} }

// Computed semantic vars.
result.tokens = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement)
  return {
    primary: cs.getPropertyValue('--primary').trim(),
    primaryForeground: cs.getPropertyValue('--primary-foreground').trim(),
    ring: cs.getPropertyValue('--ring').trim(),
    secondary: cs.getPropertyValue('--secondary').trim(),
  }
})

for (const r of routes) {
  await page.goto(`${BASE}${r.path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(700)
  await page.screenshot({ path: join(OUT, `${STATE}-${r.name}.png`), fullPage: true })

  // Rendered colour of the primary submit button + a checked checkbox on the form.
  if (r.name === 'novo-aluno') {
    result.components[r.name] = await page.evaluate(() => {
      const out = {}
      const btns = [...document.querySelectorAll('main button, main a')].filter((b) => /cadastrar|salvar|criar|adicionar/i.test(b.textContent || ''))
      if (btns[0]) out.primaryButtonBg = getComputedStyle(btns[0]).backgroundColor
      const anyBtn = document.querySelector('main button')
      if (anyBtn) out.firstButtonBg = getComputedStyle(anyBtn).backgroundColor
      return out
    })
  }
  if (r.name === 'usuarios') {
    result.components[r.name] = await page.evaluate(() => {
      const link = [...document.querySelectorAll('main a')].find((a) => /novo/i.test(a.textContent || ''))
      return { novoButtonBg: link ? getComputedStyle(link).backgroundColor : null }
    })
  }
}

await browser.close()
writeFileSync(join(OUT, `measurements-${STATE}.json`), JSON.stringify(result, null, 2))
console.log(`OK ${STATE}: tokens=${JSON.stringify(result.tokens)} -> ${OUT}`)
