import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'HTV | Building the Future of Home',
  description: 'Home Technology Ventures - Venture Capital Operating System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="antialiased">
        <Providers>
          <div className="min-h-screen bg-white dark:bg-black">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}