"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen">
      {/* Sidebar desktop */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-60">
              <Sidebar onClose={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="font-semibold">Uy Finanzas Personales</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
