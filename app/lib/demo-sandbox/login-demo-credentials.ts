export function showDemoCredentialButton(sandboxFlag = process.env.NEXT_PUBLIC_DEMO_SANDBOX) {
  return sandboxFlag === 'true'
}
