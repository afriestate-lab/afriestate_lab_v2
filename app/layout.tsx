import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { LanguageProvider } from '@/lib/languageContext'
import { AuthProvider } from '@/components/auth-provider'
import { Navigation } from '@/components/navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Afri Estate - Easy Rentals, Better Life',
    template: '%s | Afri Estate',
  },
  description: 'A comprehensive property management platform for landlords, tenants, and property managers. Easy rentals, better life.',
  keywords: ['property management', 'rentals', 'real estate', 'Rwanda', 'Kigali'],
  authors: [{ name: 'Afri Estate' }],
  creator: 'Afri Estate',
  publisher: 'Afri Estate',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://afriestate.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://afriestate.com',
    siteName: 'Afri Estate',
    title: 'Afri Estate - Easy Rentals, Better Life',
    description: 'A comprehensive property management platform',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Afri Estate - Easy Rentals, Better Life',
    description: 'A comprehensive property management platform',
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <AuthProvider>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
                <Navigation />
              </Suspense>
              <main className="lg:pl-64 pt-16 lg:pt-0">
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
                  {children}
                </Suspense>
              </main>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

