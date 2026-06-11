import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET || 'http://localhost:8080'

const nextConfig = {
  // Repo root also has a package-lock.json; pin tracing to this app.
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  eslint: {
    // Lint is run separately; don't block builds during the migration.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // The ported legacy code is large; surface type errors via `tsc` rather than
    // blocking the dev/build loop while the migration settles.
    ignoreBuildErrors: true,
  },
  async rewrites() {
    // In dev, proxy /api/* to the backend so the cookie-based session
    // (credentials: 'include') stays same-origin. In prod, the deployment
    // serves the API behind the same origin (or set API_PROXY_TARGET).
    if (isProd) return []
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
