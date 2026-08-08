import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

// Backend origin for the same-origin API proxy. API_PROXY_TARGET is preferred;
// NEXT_PUBLIC_API_BASE_URL remains a compatibility fallback for older deploys.
const explicitProxyTarget =
  process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_BASE_URL || ''

if (isProd && !explicitProxyTarget.trim()) {
  throw new Error(
    'API_PROXY_TARGET (or NEXT_PUBLIC_API_BASE_URL) is required in production so /api/* can proxy to the Nest backend. Refusing to start with a silent empty rewrite list.',
  )
}

const API_PROXY_TARGET = (explicitProxyTarget || 'http://localhost:8080')
  .replace(/\/+$/, '')
  .replace(/\/api(?:\/v\d+)?$/, '')

// Baseline browser hardening that does not depend on runtime CSP nonces.
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value:
      "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(isProd
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
]

const nextConfig = {
  // Repo root also has a package-lock.json; pin tracing to this app.
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  async rewrites() {
    // Proxy /api/* to the backend so the session cookie stays same-origin
    // (first-party) — this is what makes login work on mobile, where cross-site
    // cookies are blocked. Enabled in prod too (BFF pattern).
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
