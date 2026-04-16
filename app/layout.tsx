import type { Metadata } from 'next'
import { DM_Sans, DM_Mono, Fraunces } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'FlowDesk — Workflow & Request Management',
    template: '%s | FlowDesk',
  },
  description:
    'A production-ready SaaS platform for managing requests, automating workflows, and collaborating across teams.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${fraunces.variable} ${dmMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  )
}