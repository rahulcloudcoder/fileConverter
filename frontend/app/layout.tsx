import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-fileconverter.vercel.app'

export const metadata: Metadata = {
  title: {
    default: 'FileConverter Pro - Free Online File Conversion Tool',
    template: '%s | FileConverter Pro'
  },
  description: 'Free online file converter. Convert images (JPG, PNG, WEBP, GIF), documents (PDF, DOCX, TXT) and more. No registration required. Secure & private.',
   keywords: [
    'file converter',
    'image converter', 
    'pdf converter',
    'document converter',
    'online converter',
    'jpg to png',
    'pdf to docx',
    'pdf to word',
    'free file conversion',
    'webp to jpg',
    'png to jpg',
    'docx to pdf',
    'image format converter',
    'document format converter',
    'free online converter',
    'secure file converter',
    'privacy focused converter'
  ].join(', '),
  authors: [{ name: 'FileConverter Pro' }],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    title: 'FileConverter Pro - Free Online File Conversion Tool',
    description: 'Free online file converter for all your file conversion needs.',
    siteName: 'FileConverter Pro',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "FileConverter Pro",
              "description": "Free online file conversion service",
              "url": SITE_URL,
              "applicationCategory": "UtilityApplication",
              "operatingSystem": "All",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            })
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}