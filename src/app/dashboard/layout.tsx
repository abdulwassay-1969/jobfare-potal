"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/dashboard/header"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { GraduationCap } from "lucide-react"
import { useAuth } from "@/hooks/use-auth";
import { EmailVerificationMessage } from "@/components/dashboard/dashboards/status-messages";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, role, profileStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Redirect unauthenticated users back to portal selection
    if (!user || user.isAnonymous) {
      router.push("/");
      return;
    }
    
    // Check for roles
    if (!role) {
      router.push("/");
    }
  }, [user, loading, role, router]);

  if (loading || !user || user.isAnonymous || !role) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <GraduationCap className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-muted-foreground font-medium">Securing your session...</p>
        </div>
      </div>
    );
  }

  // Mandatory Email Verification Check (except master admin)
  if (!user.emailVerified && role !== 'admin') {
    return (
        <div className="min-h-screen bg-muted/20 flex flex-col">
            <header className="h-14 border-b bg-background flex items-center px-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
                    <GraduationCap className="w-8 h-8" />
                    <span>C@SE JOBFAIR</span>
                </Link>
            </header>
            <main className="flex-1 bg-background">
                <EmailVerificationMessage />
            </main>
        </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-primary">
            <ProjectLogo className="w-8 h-8" />
            <span className="group-data-[collapsible=icon]:hidden tracking-tight">C@SE JOBFAIR</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav userRole={role} profileStatus={profileStatus} />
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="bg-muted/20">
        <Header />
        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function ProjectLogo({ className }: { className?: string }) {
    return <GraduationCap className={className} />
}
