import { expect, test } from '@playwright/test'
import { z } from 'zod'

const LIFECYCLE_KEY = 'educa-public-sw-lifecycle'
const lifecycleEventsSchema = z.array(z.enum(['document', 'pageshow', 'beforeunload', 'controllerchange']))

async function lifecycleEventCount(page: import('@playwright/test').Page, event: z.infer<typeof lifecycleEventsSchema>[number]) {
  const serializedEvents = await page.evaluate(storageKey => window.sessionStorage.getItem(storageKey) ?? '[]', LIFECYCLE_KEY)
  return lifecycleEventsSchema.parse(JSON.parse(serializedEvents)).filter(item => item === event).length
}

async function lifecycleSnapshot(page: import('@playwright/test').Page) {
  const snapshot = await page.evaluate(async storageKey => {
    await navigator.serviceWorker.ready
    return {
      controlled: navigator.serviceWorker.controller !== null,
      serializedEvents: window.sessionStorage.getItem(storageKey) ?? '[]',
    }
  }, LIFECYCLE_KEY)
  return {
    controlled: snapshot.controlled,
    controllerChanges: lifecycleEventsSchema.parse(JSON.parse(snapshot.serializedEvents))
      .filter(event => event === 'controllerchange').length,
  }
}

test.use({ serviceWorkers: 'allow' })

test('the first service-worker controller does not reload a public visit', async ({ page }) => {
  await page.addInitScript((storageKey) => {
    const record = (event: string) => {
      const storedEvents = JSON.parse(window.sessionStorage.getItem(storageKey) ?? '[]')
      if (Array.isArray(storedEvents)) {
        storedEvents.push(event)
        window.sessionStorage.setItem(storageKey, JSON.stringify(storedEvents))
      }
    }

    record('document')
    window.addEventListener('pageshow', () => record('pageshow'))
    window.addEventListener('beforeunload', () => record('beforeunload'))
    navigator.serviceWorker?.addEventListener('controllerchange', () => record('controllerchange'))
  }, LIFECYCLE_KEY)

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Gestão escolar para redes municipais, com código aberto.' })).toBeVisible()

  await expect.poll(() => lifecycleSnapshot(page)).toEqual({ controllerChanges: 1, controlled: true })

  await expect.poll(() => lifecycleEventCount(page, 'pageshow')).toBe(1)
})

test('an explicit update activation reloads a page that already has a worker', async ({ page }) => {
  await page.addInitScript((storageKey) => {
    const record = (event: string) => {
      const storedEvents = JSON.parse(window.sessionStorage.getItem(storageKey) ?? '[]')
      if (Array.isArray(storedEvents)) {
        storedEvents.push(event)
        window.sessionStorage.setItem(storageKey, JSON.stringify(storedEvents))
      }
    }

    record('document')
    window.addEventListener('pageshow', () => record('pageshow'))
    navigator.serviceWorker?.addEventListener('controllerchange', () => record('controllerchange'))
  }, LIFECYCLE_KEY)

  await page.goto('/')
  await expect.poll(async () => page.evaluate(async () => {
    await navigator.serviceWorker.ready
    return navigator.serviceWorker.controller !== null
  })).toBe(true)

  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js?lifecycle-update=1', { scope: '/' })
  })

  await expect.poll(async () => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/')
    return registration !== undefined && registration.waiting !== null
  })).toBe(true)
  await page.reload()
  const activateUpdate = page.getByRole('button', { name: 'Atualizar', exact: true })
  await expect(activateUpdate).toBeVisible()
  const reload = page.waitForEvent('framenavigated', frame => frame === page.mainFrame())
  await activateUpdate.click()
  await reload
  await expect.poll(() => lifecycleEventCount(page, 'controllerchange')).toBe(2)
  await expect.poll(() => lifecycleEventCount(page, 'pageshow')).toBe(2)
})
