import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { z } from 'zod'
import { startRecoveryBrowser, type RecoveryBrowser } from './axi-browser'

const origin = z.string().url().parse(process.env.F03_ORIGIN)
const mail = z.string().url().parse(process.env.F03_MAIL)
const project = z.string().min(1).parse(process.env.F03_PROJECT)
const api = z.string().url().parse(process.env.NEXT_PUBLIC_SUPABASE_URL)
const database = z.string().min(1).parse(process.env.SUPABASE_DB_URL)
for (const endpoint of [origin, mail, api, database]) {
  if (new URL(endpoint).hostname !== '127.0.0.1') throw new Error('F03_LOCAL_ENDPOINT_REQUIRED')
}
const oldPassword = 'Synthetic-Only-2026!'
const newPassword = `Recovery-${crypto.randomUUID()}!`
const emailA = 'diretora.a@synthetic.invalid'
const emailB = 'diretora.b@synthetic.invalid'
const submit = 'button[type="submit"]'

async function emailLink(email: string): Promise<string> {
  const listing = z.object({ messages: z.array(z.object({ ID: z.string(), To: z.array(z.object({ Address: z.string() })) })) })
  for (let attempt = 0; attempt < 20; attempt++) {
    const messages = listing.parse(await (await fetch(`${mail}/api/v1/messages`)).json()).messages
    const message = messages.find(item => item.To.some(recipient => recipient.Address === email))
    if (message) {
      const detail = z.object({ HTML: z.string(), From: z.object({ Address: z.string() }) }).parse(await (await fetch(`${mail}/api/v1/message/${message.ID}`)).json())
      if (!detail.From.Address.endsWith('.invalid')) throw new Error('F03_SYNTHETIC_SENDER_REQUIRED')
      const link = detail.HTML.match(/href="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&')
      if (!link || new URL(link).origin !== api) throw new Error('F03_LOCAL_LINK_REQUIRED')
      return link
    }
    await delay(500)
  }
  throw new Error('F03_LOCAL_EMAIL_MISSING')
}

async function requestRecovery(browser: RecoveryBrowser, email: string) {
  await fetch(`${mail}/api/v1/messages`, { method: 'DELETE' })
  browser.open(`${origin}/reset-password`)
  await browser.assert('recovery form ready', `document.querySelector('form[data-auth-ready="true"]') !== null`)
  browser.fill('#reset-email', email)
  browser.click(submit)
  await browser.assert('recovery email requested', `document.body.textContent.includes('Confira seu e-mail')`)
  return emailLink(email)
}

async function login(browser: RecoveryBrowser, email: string, password: string) {
  browser.open(`${origin}/login`)
  // Native typing follows the hydrated controls, not React's value tracker.
  await browser.assert('login ready', `document.querySelector('#email') !== null`)
  submitCredentials(browser, email, password)
}

function submitCredentials(browser: RecoveryBrowser, email: string, password: string) {
  browser.fill('#email', email)
  browser.fill('#password', password)
  browser.click(submit)
}

async function invalidLink(browser: RecoveryBrowser, label: string, link: string) {
  browser.open(link)
  await browser.assert(label, `document.body.textContent.includes('Este link é inválido') && !document.querySelector('#recovery-password')`)
  await browser.assert('callback parameters removed', `!location.search && !location.hash`)
}

function fillPasswords(browser: RecoveryBrowser, password: string, confirmation = password) {
  browser.fill('#recovery-password', password)
  browser.fill('#recovery-confirm', confirmation)
  browser.click(submit)
}

async function validRecovery(browser: RecoveryBrowser) {
  const link = await requestRecovery(browser, emailA)
  browser.open(link)
  console.info(`OBSERVED recovery landing path=${browser.run('console.log(await page.eval(() => location.pathname))')}`)
  await browser.assert('valid recovery reaches new password form', `document.querySelector('#recovery-password') !== null`)
  await browser.assert('exactly one automatic PKCE exchange', `performance.getEntriesByType('resource').filter(entry => entry.name.includes('grant_type=pkce')).length === 1`)
  browser.resize(1280, 900)
  browser.screenshot(path.resolve('../.pilot-evidence/f03-form-desktop.png'))
  browser.resize(390, 844)
  browser.screenshot(path.resolve('../.pilot-evidence/f03-form-mobile.png'))
  await browser.assert('mobile form has no horizontal overflow', `document.documentElement.scrollWidth <= innerWidth`)
  browser.resize(1280, 900)
  fillPasswords(browser, 'short')
  await browser.assert('weak password rejected', `document.querySelector('[role="alert"]')?.textContent.includes('12 a 128')`)
  fillPasswords(browser, newPassword, `${newPassword}different`)
  await browser.assert('confirmation mismatch rejected', `document.querySelector('[role="alert"]')?.textContent.includes('não coincidem')`)
  fillPasswords(browser, oldPassword)
  await browser.assert('same password rejected by Auth', `document.querySelector('[role="alert"]')?.textContent.includes('diferente da anterior')`)
  fillPasswords(browser, newPassword)
  await browser.assert('password changed', `document.body.textContent.includes('Senha redefinida')`)
  browser.screenshot(path.resolve('../.pilot-evidence/f03-success.png'))
  await browser.assert('recovery session ended', `new URL((await fetch('/dashboard')).url).pathname === '/login'`)
  browser.click('a[href="/login"]')
  await browser.assert('login ready after client navigation', `document.querySelector('#email') !== null`)
  submitCredentials(browser, emailA, oldPassword)
  await browser.assert('previous password refused', `document.body.textContent.includes('E-mail ou senha inválidos')`)
  submitCredentials(browser, emailA, newPassword)
  await browser.assert('new password login succeeds without Auth lock deadlock', `location.pathname === '/dashboard'`)
  browser.run('await page.back();')
  await browser.assert('completed recovery cannot resume through client history', `location.pathname === '/reset-password/complete' && document.body.textContent.includes('Este link é inválido')`)
  await invalidLink(browser, 'reused email link rejected', link)
}

async function isolatedRecovery(requester: RecoveryBrowser, other: RecoveryBrowser) {
  // Verify the email once without exchanging its PKCE code. The wrong profile
  // cannot exchange it, so the requesting profile can still finish afterwards.
  const link = await requestRecovery(requester, 'professora.a@synthetic.invalid')
  const response = await fetch(link, { redirect: 'manual' })
  const callback = response.headers.get('location')
  if (!callback || new URL(callback).origin !== origin || !new URL(callback).searchParams.get('code')) throw new Error('F03_CALLBACK_REQUIRED')
  await invalidLink(other, 'another browser cannot use requester PKCE code', callback)
  other.open(`${origin}/dashboard/perfil`)
  await other.assert('wrong-browser attempt preserves its own identity', `document.querySelector('#nome')?.value === 'Diretora Sintetica B'`)
  requester.open(callback)
  await requester.assert('requesting browser can still consume the code', `document.querySelector('#recovery-password') !== null`)
  fillPasswords(requester, `Teacher-${crypto.randomUUID()}!`)
  await requester.assert('isolated recovery completes', `document.body.textContent.includes('Senha redefinida')`)
  await invalidLink(requester, 'reused PKCE callback rejected', callback)
}

async function expiredRecovery(browser: RecoveryBrowser) {
  const email = 'secretaria@synthetic.invalid'
  const link = await requestRecovery(browser, email)
  // Only this disposable synthetic identity is backdated. No token is read.
  execFileSync('psql', [database, '-X', '-v', 'ON_ERROR_STOP=1', '-c', `UPDATE auth.users SET recovery_sent_at = now() - interval '2 hours' WHERE email = '${email}'`], { stdio: 'ignore' })
  await invalidLink(browser, 'actually expired email link rejected', link)
  const invalid = new URL(link)
  invalid.searchParams.set('token', 'invalid-synthetic-token')
  await invalidLink(browser, 'invalid email token rejected', invalid.href)
}

async function run() {
  const requester = await startRecoveryBrowser(project, 'requester', origin)
  try {
    await validRecovery(requester)
    const other = await startRecoveryBrowser(project, 'other', origin)
    try {
      await login(other, emailB, oldPassword)
      await other.assert('ordinary login succeeds in a clean independent browser', `location.pathname === '/dashboard'`)
      await invalidLink(other, 'ordinary login does not authorize a recovery form', `${origin}/reset-password/complete`)
      await isolatedRecovery(requester, other)
      await expiredRecovery(requester)
      other.open(`${origin}/dashboard/perfil`)
      await other.assert('other identity remains isolated after recovery', `document.querySelector('#nome')?.value === 'Diretora Sintetica B'`)
    } finally { await other.stop() }
  } finally { await requester.stop() }
  console.info('PASS all F03 browser scenarios; workers=1; credentials retained=false')
}

run().catch(error => {
  // Failure messages above contain case labels only, never credential values.
  console.error(error instanceof Error && error.message.startsWith('F03_') ? error.message : 'F03_FAILED: local harness setup')
  process.exitCode = 1
})
