"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "../theme-toggle"
import { useAuth as useFirebaseAuth } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { NotificationBell } from "./notification-bell";

export function UserNav() {
  const { user, role } = useAuth();
  const firebaseAuth = useFirebaseAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(firebaseAuth);
    router.push('/'); // Redirect to the main portal selection page
  };

  if (!user) {
    return (
       <div className="flex items-center gap-2">
        <ThemeToggle />
        <Avatar className="h-8 w-8">
            <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    );
  }

  const fallback = user.email ? user.email.charAt(0).toUpperCase() : "U";

  return (
    <div className="flex items-center gap-2">
      {(role === 'student' || role === 'volunteer') && <NotificationBell />}
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} alt="User" />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none capitalize">{role || 'User'}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {role !== 'admin' && (
            <>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleLogout}>
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
