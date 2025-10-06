import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

// Update this with your actual domain after deployment
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-app.vercel.app'

export const metadata: Metadata = {
  title: {
    default: 'FileConverter Pro - Free Online File Conversion Tool',
    template: '%s | FileConverter Pro'
  },
  description: 'Free online file converter. Convert images (JPG, PNG, WEBP, GIF), documents (PDF, DOCX, TXT) and more. No registration required. Secure & private.',
  keywords: 'file converter, image converter, pdf converter, document converter, online converter, jpg to png, pdf to docx, free file conversion',
  authors: [{ name: 'FileConverter Pro' }],
  creator: 'FileConverter Pro',
  publisher: 'FileConverter Pro',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    title: 'FileConverter Pro - Free Online File Conversion Tool',
    description: 'Free online file converter for all your file conversion needs. Support for images, PDFs, documents and more.',
    siteName: 'FileConverter Pro',
    images: [
      {
        url: '/og-image.jpg', // You can add this later
        width: 1200,
        height: 630,
        alt: 'FileConverter Pro - Universal File Conversion',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FileConverter Pro - Free Online File Conversion Tool',
    description: 'Free online file converter for all your file conversion needs.',
    creator: '@fileconverterpro',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isProduction = process.env.NODE_ENV === 'production';

  return (
    <html lang="en">
      <head>
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

        {/* Only include AdSense in production and after approval */}
        {isProduction && (
          <>
            <Script
              id="adsbygoogle-init"
              strategy="afterInteractive"
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID`}
              crossOrigin="anonymous"
              data-checked-head="true"
            />
          </>
        )}

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
              "permissions": "browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "FileConverter Pro"
              },
              "featureList": [
                "Image conversion",
                "Document conversion", 
                "PDF conversion",
                "Free service",
                "No registration required"
              ]
            })
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
        
        {/* AdSense Auto Ads - Only in production */}
        {isProduction && (
          <Script
            id="adsbygoogle-auto"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (adsbygoogle = window.adsbygoogle || []).push({
                  google_ad_client: "ca-pub-YOUR_PUBLISHER_ID",
                  enable_page_level_ads: true,
                  overlays: {bottom: true}
                });
              `,
            }}
          />
        )}
      </body>
    </html>
  )
}