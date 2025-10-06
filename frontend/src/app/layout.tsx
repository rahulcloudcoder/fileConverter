import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'File Converter Pro - Convert Any File Format Online Free',
    template: '%s | FileConverter Pro'
  },
  description: 'Free online file converter. Convert images (JPG, PNG, WEBP, GIF), documents (PDF, DOCX, TXT) and more. No registration required. Secure & private file conversion.',
  keywords: 'file converter, image converter, pdf converter, document converter, online converter, jpg to png, pdf to docx, free file conversion',
  authors: [{ name: 'FileConverter Pro' }],
  metadataBase: new URL('https://yourdomain.com'),
  openGraph: {
    title: 'File Converter Pro - Convert Any File Format Online Free',
    description: 'Free online file converter for all your file conversion needs.',
    type: 'website',
    locale: 'en_US',
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
        {/* Google AdSense - Replace with your actual ID */}
        <Script
          id="adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className}>
        {children}
        
        {/* Initialize AdSense */}
        <Script
          id="adsense-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(adsbygoogle = window.adsbygoogle || []).push({});`
          }}
        />
      </body>
    </html>
  )
}