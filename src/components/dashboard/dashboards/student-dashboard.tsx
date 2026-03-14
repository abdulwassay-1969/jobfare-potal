
'use client';

import { useAuth } from '@/hooks/use-auth';
import { GraduationCap, Calendar, Building } from 'lucide-react';
import { ProjectSpotInfoCard } from '@/components/dashboard/project-spot-info-card';
import { ActionCard } from '@/components/dashboard/action-card';
import { BreakBanner } from '../break-banner';


export function StudentDashboard() {
  const { user, profileName } = useAuth();
  const name = profileName || 'Student';

  return (
    <div className="space-y-6">
      <BreakBanner />
      
      <h1 className="text-3xl font-bold">Welcome, {name}!</h1>
      <p className="text-muted-foreground">
        Here are some quick links to get you started on your career journey.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {user && <ProjectSpotInfoCard studentId={user.uid} />}
        <ActionCard
          title="My Profile"
          description="Keep your skills and experience up-to-date."
          href="/dashboard/profile"
          icon={<GraduationCap className="w-7 h-7" />}
        />
         <ActionCard
          title="My Interviews"
          description="Manage your interview schedule with companies."
          href="/dashboard/interviews"
          icon={<Calendar className="w-7 h-7" />}
        />
         <ActionCard
          title="Participating Companies"
          description="See which companies are at the job fair."
          href="/dashboard/participating-companies"
          icon={<Building className="w-7 h-7" />}
        />
      </div>
    </div>
  );
}
