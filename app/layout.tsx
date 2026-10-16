import type { Metadata } from "next"
import { Geist } from "next/font/google"
import NextTopLoader from "nextjs-toploader"
import "./globals.css"

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Finanzas Personales",
  description: "App de finanzas personales",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={geist.variable}>
      <body className="antialiased">
        <NextTopLoader showSpinner={false} />
        {children}
      </body>
    </html>
  )
}
