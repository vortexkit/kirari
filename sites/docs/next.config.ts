import type { NextConfig } from 'next'
import { resolve } from 'node:path'

const config: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  rewrites: async () => [
    { source: '/docs/installation.md', destination: '/markdown/overview' },
    { source: '/docs/:slug.md', destination: '/markdown/:slug' },
    { source: '/docs.md', destination: '/markdown/overview' },
    { source: '/changelog/:package.md', destination: '/markdown/changelog/:package' },
  ],
  turbopack: { root: resolve(import.meta.dirname, '../..') },
  outputFileTracingRoot: resolve(import.meta.dirname, '../..'),
  outputFileTracingIncludes: { '/*': ['./content/*.md', '../../packages/kirari/themes/*.css'] },
}

export default config
