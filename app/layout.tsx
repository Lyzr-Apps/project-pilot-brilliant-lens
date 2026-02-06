import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { IframeLoggerInit } from '@/components/IframeLoggerInit'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KLARIS - Your Curriculum, Clarified',
  description: 'AI-powered curriculum organizer with task generation, timeline planning, and focus sessions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <IframeLoggerInit />
        {children}
      </body>
    </html>
  )
}
