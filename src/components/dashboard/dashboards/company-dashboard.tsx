
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Users, Building, Calendar } from 'lucide-react';
import { ActionCard } from '@/components/dashboard/action-card';
import { BreakBanner } from '../break-banner';

export function CompanyDashboard() {
  const { profileName } = useAuth();
  const name = profileName || 'Company';

  return (
    <div className="space-y-6">
      <BreakBanner />
      
      <h1 className="text-3xl font-bold">Welcome, {name}!</h1>

      <p className="text-muted-foreground">
        Manage your recruitment activities for the C@SE Job Fair.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
         <ActionCard
          title="Student Finder"
          description="Browse student profiles and projects."
          href="/dashboard/companies"
          icon={<Users className="w-7 h-7" />}
        />
        <ActionCard
          title="Company Profile"
          description="Manage your company's information and branding."
          href="/dashboard/profile"
          icon={<Building className="w-7 h-7" />}
        />
        <ActionCard
          title="Scheduled Interviews"
          description="View and manage all your scheduled interviews."
          href="/dashboard/interviews"
          icon={<Calendar className="w-7 h-7" />}
        />
      </div>
    </div>
  );
}
