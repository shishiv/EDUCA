/**
 * Dashboard hero evidence capture (durable, reproducible).
 *
 * Captures before/after screenshots (desktop + mobile), the hero's rendered
 * HTML, and measured contrast / readability / keyboard focus / hierarchy /
 * action reachability for the dashboard of commit f28d304.
 *
 * Run from app/ so @playwright/test resolves:
 *   STATE=after  node ../data/decisions/evidence/2026-08-12-dashboard-hero/capture.mjs
 * Revert the two dashboard files to the parent commit, then:
 *   STATE=before node ../data/decisions/evidence/2026-08-12-dashboard-hero/capture.mjs
 *
 * Contrast note: the hero background is the brand gradient
 * (from-emerald-700 via-teal-700 to-sky-800). For each hero text run we
 * composite every translucent ancestor panel (e.g. the white/10 metric chip,
 * the emerald-400/25 badge) and the text's own alpha over EACH gradient stop,
 * then report the worst-case (minimum) WCAG ratio across the three stops.
 */
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire(
  process.env.APP_DIR || '/home/shiv/.treehouse/EDUCA-027bb4/1/EDUCA/app/package.json'
)
const { chromium } = require('@playwright/test')

const STATE = process.env.STATE || 'after'
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const EMAIL = process.env.EMAIL || 'admin@test.com'
const PASSWORD = process.env.PASSWORD || 'test123456'
const OUT = process.env.OUT_DIR ||
  '/home/shiv/.treehouse/EDUCA-027bb4/1/EDUCA/data/decisions/evidence/2026-08-12-dashboard-hero'
mkdirSync(OUT, { recursive: true })

// Brand gradient stops the hero uses (from-emerald-700 via-teal-700 to-sky-800).
const STOPS = { 'emerald-700': [4, 120, 87], 'teal-700': [15, 118, 110], 'sky-800': [7, 89, 133] }

const viewports = [
  { name: 'desktop', width: 1280, height: 860 },
  { name: 'mobile', width: 390, height: 844 },
]

function relLum([r, g, b]) {
  const a = [r, g, b].map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}
const contrast = (a, b) => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
// fg (with alpha 0..1) painted over opaque bg -> opaque color.
const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]))

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  const email = page.locator('input[type="email"], input[name="email"], input#email').first()
  const pass = page.locator('input[type="password"], input[name="password"], input#password').first()
  await email.waitFor({ timeout: 10000 })
  await email.fill(EMAIL)
  await pass.fill(PASSWORD)
  await page.getByRole('button', { name: /entrar/i }).click()
  try {
    await page.waitForURL('**/dashboard', { timeout: 30000 })
  } catch {
    await page.screenshot({ path: join(OUT, `_debug-login-${STATE}.png`), fullPage: true }).catch(() => {})
    const body = await page.locator('body').innerText().catch(() => '')
    throw new Error(`login did not reach /dashboard; url=${page.url()}; body=${body.slice(0, 300).replace(/\s+/g, ' ')}`)
  }
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(800)
}

async function measure(page) {
  return await page.evaluate(() => {
    const parse = (s) => {
      const m = s && s.match(/rgba?\(([^)]+)\)/)
      if (!m) return null
      const p = m[1].split(',').map((x) => parseFloat(x.trim()))
      return [p[0], p[1], p[2], p[3] ?? 1]
    }
    const out = { contrast: [], readability: [], hierarchy: [], actions: [] }
    const hero = document.querySelector('main header') || document.querySelector('header')

    if (hero) {
      hero.querySelectorAll('h1, p, span').forEach((el) => {
        const t = (el.textContent || '').trim()
        if (!t) return
        // Only leaf-ish runs (avoid double counting a <p> that wraps <span>s).
        if (el.querySelector('h1, p, span')) return
        const cs = getComputedStyle(el)
        const color = parse(cs.color) || [255, 255, 255, 1]
        // Collect translucent ancestor background layers up to the hero (nearest first).
        const layers = []
        let node = el
        while (node && node !== hero.parentElement) {
          const bc = parse(getComputedStyle(node).backgroundColor)
          if (bc && bc[3] > 0.01) layers.push(bc)
          node = node.parentElement
        }
        out.contrast.push({
          text: t.slice(0, 40), tag: el.tagName.toLowerCase(), color, layers,
          fontSizePx: parseFloat(cs.fontSize), fontWeight: cs.fontWeight,
        })
        out.readability.push({
          text: t.slice(0, 40), tag: el.tagName.toLowerCase(),
          fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, ''),
          fontSizePx: parseFloat(cs.fontSize), lineHeight: cs.lineHeight,
          fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing,
        })
      })
    }

    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
      const t = (h.textContent || '').trim()
      if (!t) return
      const cs = getComputedStyle(h)
      out.hierarchy.push({
        level: h.tagName.toLowerCase(), text: t.slice(0, 48),
        fontSizePx: parseFloat(cs.fontSize), fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, ''),
      })
    })

    const main = document.querySelector('main') || document.body
    main.querySelectorAll('a[href], button, [role="button"], input, select, textarea').forEach((el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      const visible = r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'
      const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ')
      out.actions.push({
        tag: el.tagName.toLowerCase(), name: name.slice(0, 40),
        href: el.getAttribute('href') || undefined, tabIndex: el.tabIndex,
        focusable: visible && el.tabIndex !== -1, hitPx: Math.round(Math.min(r.width, r.height)),
      })
    })
    return out
  })
}

async function focusWalk(page, n = 16) {
  const seq = []
  await page.evaluate(() => (document.activeElement && document.activeElement.blur && document.activeElement.blur()))
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const cs = getComputedStyle(el)
      const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ')
      return {
        tag: el.tagName.toLowerCase(), name: name.slice(0, 36),
        hasOutline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0,
        hasShadowRing: cs.boxShadow !== 'none',
        visibleRing: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none',
      }
    })
    if (info) seq.push(info)
  }
  return seq
}

const browser = await chromium.launch()
const results = { state: STATE, base: BASE, capturedAt: new Date().toISOString(), gradientStops: STOPS, viewports: {} }

for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  await login(page)

  await page.screenshot({ path: join(OUT, `${STATE}-${vp.name}-full.png`), fullPage: true })
  const hero = page.locator('main header').first()
  try {
    await hero.scrollIntoViewIfNeeded()
    await hero.screenshot({ path: join(OUT, `${STATE}-${vp.name}-hero.png`) })
  } catch (e) {
    console.warn(`hero screenshot ${vp.name}: ${e.message}`)
  }
  const heroHTML = await hero.evaluate((el) => el.outerHTML).catch(() => '')
  writeFileSync(join(OUT, `${STATE}-${vp.name}-hero.html`), heroHTML)

  const m = await measure(page)
  m.focusWalk = await focusWalk(page)

  // Visual proof of a keyboard focus ring on a real action (first quick-access link).
  try {
    const firstAction = page.locator('main a[href], main button').first()
    await firstAction.focus()
    await page.waitForTimeout(150)
    await page.screenshot({ path: join(OUT, `${STATE}-${vp.name}-focus.png`) })
  } catch { /* best effort */ }

  results.viewports[vp.name] = m
  await context.close()
}
await browser.close()

// Accurate contrast: composite ancestor panels + text alpha over each gradient stop.
for (const m of Object.values(results.viewports)) {
  m.contrast = m.contrast.map((c) => {
    const perStop = {}
    for (const [k, stop] of Object.entries(STOPS)) {
      let bg = stop.slice()
      for (const layer of [...c.layers].reverse()) bg = over(layer, bg) // bottom-up
      const fg = over(c.color, bg) // paint text (with its alpha) over the effective bg
      perStop[k] = +contrast(fg, bg).toFixed(2)
    }
    const min = Math.min(...Object.values(perStop))
    const large = c.fontSizePx >= 24 || (c.fontSizePx >= 18.66 && Number(c.fontWeight) >= 700)
    return {
      text: c.text, tag: c.tag, fontSizePx: c.fontSizePx, isLargeText: large,
      overChip: c.layers.length > 0, perStop, minRatio: +min.toFixed(2),
      passesAA: large ? min >= 3 : min >= 4.5, aaThreshold: large ? 3 : 4.5,
    }
  })
  m.focusSummary = {
    interactive: m.actions.length,
    focusable: m.actions.filter((a) => a.focusable).length,
    walkStops: m.focusWalk.length,
    withVisibleRing: m.focusWalk.filter((f) => f.visibleRing).length,
  }
}

writeFileSync(join(OUT, `measurements-${STATE}.json`), JSON.stringify(results, null, 2))
console.log(`OK ${STATE}: screenshots + hero HTML + measurements-${STATE}.json -> ${OUT}`)
