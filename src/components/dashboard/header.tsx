"use client";

import { UserNav } from "@/components/dashboard/user-nav"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
       <SidebarTrigger className="md:hidden" />
      <div className="flex-1" />
       <UserNav />
    </header>
  )
}
