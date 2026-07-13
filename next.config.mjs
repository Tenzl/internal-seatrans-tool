import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

// Backend origin the proxy forwards to. Server-only (no NEXT_PUBLIC_ prefix), so
// it is never exposed to the browser. In prod set API_PROXY_TARGET to the backend
// URL (e.g. the Render origin); in dev it defaults to localhost.
const explicitProxyTarget =
  process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_BASE_URL || ''
const API_PROXY_TARGET = (explicitProxyTarget || 'http://localhost:8080')
  .replace(/\/+$/, '')
  .replace(/\/api(?:\/v\d+)?$/, '')

const nextConfig = {
  // Repo root also has a package-lock.json; pin tracing to this app.
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  eslint: {
    // Lint is run separately; don't block builds during the migration.
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
      },
    ],
  },
  async rewrites() {
    // Proxy /api/* to the backend so the session cookie stays same-origin
    // (first-party) — this is what makes login work on mobile, where cross-site
    // cookies are blocked. Enabled in prod too (BFF pattern), but only when a
    // backend target is explicitly configured; otherwise the client is expected
    // to call an absolute NEXT_PUBLIC_API_BASE_URL directly.
    if (isProd && !explicitProxyTarget) return []
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
