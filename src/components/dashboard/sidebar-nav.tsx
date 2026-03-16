"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard,
  User, 
  Building,
  Calendar,
  Users,
  GraduationCap,
  ListChecks,
  FolderKanban,
  UserCheck,
  ClipboardList,
  MapPin,
  LayoutGrid,
  QrCode as QrCodeIcon,
  ClipboardCheck,
  Star,
  MessageSquare
} from "lucide-react"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import type { UserRole } from "@/lib/types"

const navItems = {
  admin: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/admin/scanner", icon: QrCodeIcon, label: "QR Scanner" },
    { href: "/dashboard/volunteers/attendance", icon: ClipboardCheck, label: "Attendance" },
    { href: "/dashboard/student-spots", icon: LayoutGrid, label: "Student Spots" },
    { href: "/dashboard/room-assignments", icon: MapPin, label: "Room Assignments" },
    { href: "/dashboard/volunteers", icon: Users, label: "Manage Volunteers" },
    { href: "/dashboard/manage-companies", icon: UserCheck, label: "Manage Companies" },
    { href: "/dashboard/manage-students", icon: GraduationCap, label: "Manage Students" },
    { href: "/dashboard/all-students", icon: Users, label: "All Students" },
    { href: "/dashboard/all-volunteers", icon: ClipboardList, label: "All Volunteers" },
    { href: "/dashboard/all-companies", icon: Building, label: "All Companies" },
    { href: "/dashboard/all-student-spots", icon: ClipboardList, label: "Export Spot List" },
    { href: "/dashboard/admin/reviews", icon: MessageSquare, label: "Portal Reviews" },
  ],
  student: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/profile", icon: User, label: "My Profile" },
    { href: "/dashboard/interviews", icon: Calendar, label: "My Interviews" },
    { href: "/dashboard/participating-companies", icon: Building, label: "Companies" },
  ],
  company: [
    { href: "/dashboard/companies", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/profile", icon: Building, label: "Company Profile" },
    { href: "/dashboard/projects", icon: FolderKanban, label: "Student Projects" },
    { href: "/dashboard/shortlist", icon: ListChecks, label: "Shortlisted" },
    { href: "/dashboard/interviews", icon: Calendar, label: "My Interviews" },
    { href: "/dashboard/portal-review", icon: Star, label: "Rate This Portal" },
  ],
  volunteer: [
     { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
     { href: "/dashboard/profile", icon: User, label: "My Profile" },
  ],
};

const navTitles: Record<UserRole, string> = {
    admin: "Admin",
    student: "Student",
    company: "Company",
    volunteer: "Volunteer"
}

export function SidebarNav({ userRole, profileStatus }: { userRole: UserRole | null, profileStatus: string | null }) {
  const pathname = usePathname()

  if (!userRole || !navItems[userRole]) {
      return null;
  }

  let items = navItems[userRole];
  
  if (profileStatus !== 'approved' && userRole !== 'admin') {
    if (userRole === 'student') {
        items = [
            { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
            { href: "/dashboard/profile", icon: User, label: "My Profile" },
        ];
    } else if (userRole === 'company') {
        items = [
            { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
            { href: "/dashboard/profile", icon: Building, label: "Company Profile" },
        ];
    } else if (userRole === 'volunteer') {
         items = [
            { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
            { href: "/dashboard/profile", icon: User, label: "My Profile" },
        ];
    }
  }

  const title = navTitles[userRole];

  return (
    <div className="flex flex-col h-full">
        <div className="flex-1">
            <p className="px-4 pt-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase group-data-[collapsible=icon]:hidden">{title}</p>
            <div className="p-2">
                <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                        tooltip={item.label}
                    >
                        <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
                </SidebarMenu>
            </div>
        </div>
    </div>
  );
}