const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations for educational management system
  images: {
    // Next.js 16+ - Image configuration for student photos and municipal assets
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'fronteira.localhost',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '*.fronteira.mg.gov.br',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    // Student photo optimization settings
    deviceSizes: [320, 420, 768, 1024, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // React 19 compatibility
  reactStrictMode: true,

  // Performance optimizations
  compress: true,

  // Server Actions config (stable in Next.js 15+, but allowedOrigins still under experimental)
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000', // Development - legacy
        'localhost:3001', // Development - secondary port
        'fronteira.localhost:3000', // Municipal development domain
        'fronteira.localhost:3001', // Municipal development domain - secondary
        'sme.fronteira.mg.gov.br', // Production domain
        '*.fronteira.mg.gov.br', // Municipal subdomains
        '*.vercel.app', // Vercel deployments
        '*.netlify.app', // Netlify deployments
      ],
    },
    // Enable optimizePackageImports for better bundle optimization
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
    ],
  },

  // Headers for performance and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  },

};

module.exports = withBundleAnalyzer(nextConfig);
