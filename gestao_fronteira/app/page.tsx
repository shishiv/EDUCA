import { redirect } from 'next/navigation'

/**
 * Root page - redirects to login
 *
 * The login page (/login) is the canonical entry point.
 * This redirect ensures all root traffic goes to the proper auth flow.
 */
export default function RootPage() {
  redirect('/login')
}
