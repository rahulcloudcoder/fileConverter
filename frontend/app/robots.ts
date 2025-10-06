import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*', // Applies to all search engines
      allow: '/', // Allow crawling all pages
      disallow: '/api/', // Don't crawl API routes
    },
    sitemap: 'https://your-fileconverter.vercel.app/sitemap.xml',
  }
}