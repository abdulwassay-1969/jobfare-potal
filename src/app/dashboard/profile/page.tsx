'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { StudentProfile } from './student-profile';
import { VolunteerProfile } from '@/components/profile/volunteer-profile';
import { CompanyProfile } from '@/components/profile/company-profile';

export default function ProfilePage() {
  const { user, loading: authLoading, role } = useAuth();

  if (authLoading || !user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-6 mt-6">
            <div className="flex items-center gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className='space-y-2'>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (role === 'volunteer') {
    return <VolunteerProfile />;
  }

  if (role === 'company') {
    return <CompanyProfile />;
  }
  
  // Default to student profile
  return <StudentProfile />;
}
