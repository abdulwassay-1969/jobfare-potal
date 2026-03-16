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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import type { UserRole } from "@/lib/types"

type NavItem = { href: string; icon: React.ComponentType<{ className?: string }>; label: string }
type NavGroup = { title: string; items: NavItem[] }

const adminNavGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    title: "Operations",
    items: [
      { href: "/dashboard/admin/scanner", icon: QrCodeIcon, label: "QR Scanner" },
      { href: "/dashboard/volunteers/attendance", icon: ClipboardCheck, label: "Volunteer Attendance" },
      { href: "/dashboard/room-assignments", icon: MapPin, label: "Room Assignments" },
      { href: "/dashboard/student-spots", icon: LayoutGrid, label: "Student Spots" },
      { href: "/dashboard/all-student-spots", icon: ClipboardList, label: "Spot List Export" },
    ],
  },
  {
    title: "Volunteers",
    items: [
      { href: "/dashboard/volunteers", icon: Users, label: "Manage Volunteers" },
      { href: "/dashboard/all-volunteers", icon: ClipboardList, label: "All Volunteers" },
    ],
  },
  {
    title: "Students",
    items: [
      { href: "/dashboard/manage-students", icon: GraduationCap, label: "Manage Students" },
      { href: "/dashboard/all-students", icon: Users, label: "All Students" },
    ],
  },
  {
    title: "Companies",
    items: [
      { href: "/dashboard/manage-companies", icon: UserCheck, label: "Manage Companies" },
      { href: "/dashboard/all-companies", icon: Building, label: "All Companies" },
    ],
  },
  {
    title: "Feedback",
    items: [{ href: "/dashboard/admin/reviews", icon: MessageSquare, label: "Portal Reviews" }],
  },
]

const navItems: Record<UserRole, NavItem[]> = {
  admin: adminNavGroups.flatMap((group) => group.items),
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

  const renderNavItem = (item: NavItem) => (
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
  );

  return (
    <div className="flex flex-col h-full">
        <div className="flex-1">
            <p className="px-4 pt-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase group-data-[collapsible=icon]:hidden">{title}</p>
            {userRole === 'admin' && profileStatus === 'approved' ? (
              <div className="py-2">
                {adminNavGroups.map((group) => (
                  <SidebarGroup key={group.title}>
                    <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/90">
                      {group.title}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((item) => renderNavItem(item))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                ))}
              </div>
            ) : (
              <div className="p-2">
                <SidebarMenu>
                  {items.map((item) => renderNavItem(item))}
                </SidebarMenu>
              </div>
            )}
        </div>
    </div>
  );
}