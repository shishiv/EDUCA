export function getDemoLoginCredentials(
  sandboxFlag = process.env.NEXT_PUBLIC_DEMO_SANDBOX,
) {
  if (sandboxFlag !== 'true') return null

  // Public sandbox persona, not the separate local synthetic pilot identity.
  return { email: 'demo@educa.app.br', password: 'Demo@2026' }
}
