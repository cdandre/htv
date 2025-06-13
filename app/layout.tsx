import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HTV Operating System',
  description: 'Venture Capital Operating System for Home Technology Ventures',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical styles for production */
            body { 
              margin: 0; 
              padding: 0;
              min-height: 100vh;
              background-color: #f9fafb;
            }
            .dark body {
              background-color: #111827;
            }
            /* Ensure animations work */
            @keyframes slide-up {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes shimmer {
              100% {
                transform: translateX(100%);
              }
            }
            /* Loading state styles */
            .loading-gradient {
              background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
              background-size: 200% 100%;
              animation: shimmer 1.5s ease-in-out infinite;
            }
          `
        }} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {children}
        </div>
      </body>
    </html>
  )
}