import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "@/components/shared/providers"
import DevToolbar from "@/components/dev-toolbar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "IBL Excellence & Innovation Award — Idea Platform",
  description: "IBL Group Excellence & Innovation Award 2026 — Idea Management Platform",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
        {process.env.NODE_ENV === "development" && <DevToolbar />}
      </body>
    </html>
  )
}
