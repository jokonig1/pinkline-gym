import type { MetadataRoute } from 'next'

const BASE_URL = 'https://pinklinegym.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/api', '/login'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
