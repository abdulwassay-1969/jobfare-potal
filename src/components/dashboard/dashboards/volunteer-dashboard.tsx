
'use client';

import { useAuth } from '@/hooks/use-auth';
import { VolunteerAssignmentCard } from '@/components/dashboard/volunteer-assignment-card';
import { VolunteerRoleCard } from '@/components/dashboard/volunteer-role-card';
import { ActionCard } from '@/components/dashboard/action-card';
import { User } from 'lucide-react';
import { BreakBanner } from '../break-banner';


export function VolunteerDashboard() {
  const { user, profileName } = useAuth();
  const name = profileName || 'Volunteer';

  return (
    <div className="space-y-6">
      <BreakBanner />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {name}!</h1>
        <p className="text-muted-foreground max-w-3xl">
          Thanks for supporting the C@SE Job Fair. Review your role, shift timing, and assigned company details below.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {user && <VolunteerRoleCard volunteerId={user.uid} />}
        {user && <VolunteerAssignmentCard volunteerId={user.uid} />}
        <ActionCard
          title="My Profile"
          description="Update your contact information and personal details."
          href="/dashboard/profile"
          icon={<User className="w-7 h-7" />}
        />
      </div>
    </div>
  );
}
