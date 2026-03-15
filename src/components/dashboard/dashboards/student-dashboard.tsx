
'use client';

import { useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { GraduationCap, Calendar, Building, Clock, CheckCircle2, CalendarDays, MapPin } from 'lucide-react';
import { ProjectSpotInfoCard } from '@/components/dashboard/project-spot-info-card';
import { ActionCard } from '@/components/dashboard/action-card';
import { BreakBanner } from '../break-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Interview } from '@/lib/types';


export function StudentDashboard() {
  const { user, profileName } = useAuth();
  const db = useFirestore();
  const name = profileName || 'Student';

  const interviewsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'interviews'), where('studentId', '==', user.uid));
  }, [db, user]);

  const { data: interviews } = useCollection<Interview>(interviewsQuery);
  const interviewList = interviews ?? [];

  const getInterviewDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
      return (value as any).toDate();
    }
    if (value instanceof Date) return value;
    return null;
  };

  const dashboardStats = useMemo(() => {
    const now = Date.now();
    const all = interviewList.length;
    const upcoming = interviewList.filter((interview) => {
      const startDate = getInterviewDate(interview.startTime);
      return interview.status === 'Scheduled' && !!startDate && startDate.getTime() >= now;
    }).length;
    const completed = interviewList.filter((interview) => interview.status === 'Completed').length;

    return { all, upcoming, completed };
  }, [interviewList]);

  const nextInterview = useMemo(() => {
    const now = Date.now();

    return interviewList
      .filter((interview) => {
        const startDate = getInterviewDate(interview.startTime);
        return interview.status === 'Scheduled' && !!startDate && startDate.getTime() >= now;
      })
      .sort((a, b) => {
        const aTime = getInterviewDate(a.startTime)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bTime = getInterviewDate(b.startTime)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })[0] ?? null;
  }, [interviewList]);

  const nextInterviewDate = nextInterview ? getInterviewDate(nextInterview.startTime) : null;

  return (
    <div className="space-y-6">
      <BreakBanner />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Welcome, {name}!</h1>
        <p className="text-muted-foreground">
          Your student hub for profile updates, interviews, and participating companies.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Interviews</p>
              <p className="text-2xl font-bold">{dashboardStats.all}</p>
            </div>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Upcoming</p>
              <p className="text-2xl font-bold">{dashboardStats.upcoming}</p>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{dashboardStats.completed}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Next Interview</CardTitle>
        </CardHeader>
        <CardContent>
          {nextInterview && nextInterviewDate ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{nextInterview.companyName}</p>
                  <Badge variant="outline">Scheduled</Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {nextInterviewDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at{' '}
                  {nextInterviewDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {nextInterview.location}
                </p>
              </div>
              <Button asChild className="w-full md:w-auto">
                <Link href="/dashboard/interviews">Open Interviews</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">No upcoming interviews yet. Keep your profile updated to improve your chances.</p>
              <Button asChild variant="outline" className="w-full md:w-auto">
                <Link href="/dashboard/profile">Update Profile</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {user && <ProjectSpotInfoCard studentId={user.uid} />}
        <ActionCard
          title="My Profile"
          description="Keep your skills, CV, and experience up to date."
          href="/dashboard/profile"
          icon={<GraduationCap className="w-7 h-7" />}
        />
         <ActionCard
          title="My Interviews"
          description="Track interviews, status updates, and schedule changes."
          href="/dashboard/interviews"
          icon={<Calendar className="w-7 h-7" />}
        />
         <ActionCard
          title="Participating Companies"
          description="Explore companies and opportunities in the fair."
          href="/dashboard/participating-companies"
          icon={<Building className="w-7 h-7" />}
        />
      </div>
    </div>
  );
}
