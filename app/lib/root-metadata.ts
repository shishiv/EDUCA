import type { Metadata } from 'next'

export function createRootMetadata(copy: { title: string; description: string }): Metadata {
  return {
    metadataBase: new URL('https://geteduca.vercel.app'),
    manifest: '/site.webmanifest',
    title: copy.title,
    description: copy.description,
  }
}
