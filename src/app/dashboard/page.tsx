'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { AdminDashboard } from '@/components/dashboard/dashboards/admin-dashboard';
import { StudentDashboard } from '@/components/dashboard/dashboards/student-dashboard';
import { CompanyDashboard } from '@/components/dashboard/dashboards/company-dashboard';
import { VolunteerDashboard } from '@/components/dashboard/dashboards/volunteer-dashboard';
import { PendingApprovalMessage, RejectedMessage } from '@/components/dashboard/dashboards/status-messages';
import { Card, CardContent, CardHeader } from '@/components/ui/card';


// Main router component
export default function DashboardPage() {
  const { role, loading, profileStatus } = useAuth();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user's registration is still pending or rejected, show the respective message.
  // Admins are 'approved' by default.
  if (role && role !== 'admin') {
      if (profileStatus === 'pending') {
          return <PendingApprovalMessage />;
      }
      if (profileStatus === 'rejected') {
          return <RejectedMessage />;
      }
  }

  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'student':
      return <StudentDashboard />;
    case 'company':
      return <CompanyDashboard />;
    case 'volunteer':
      return <VolunteerDashboard />;
    default:
      // Fallback for users who have just signed up but whose profile doc hasn't been created yet.
      return <PendingApprovalMessage />;
  }
}
