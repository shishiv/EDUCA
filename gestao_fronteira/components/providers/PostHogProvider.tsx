'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PHProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
        const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

        if (key) {
            posthog.init(key, {
                api_host: host,
                capture_pageview: false, // Handled manually or via router if needed, but Next.js 13+ app router needs special handling
                persistence: 'localStorage',
                autocapture: true,
            })
        }
    }, [])

    return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
