import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "AgentOps – Visual Workflow Builder",
  description: "Build AI-powered workflows visually",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 antialiased">
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
