
'use client';

import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { collection } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Users,
  Building,
  AlertCircle,
  QrCode,
  MapPin,
  LayoutGrid,
  ChevronRight,
  ClipboardCheck,
  UserCheck,
  Briefcase,
  CalendarDays,
  Clock,
  Activity,
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Student, Company, Placement, Volunteer, Interview } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { BreakControl } from '../admin/break-control';

const QuickAction = ({ href, icon: Icon, label, description }: { href: string, icon: any, label: string, description: string }) => (
    <Link href={href} className="group block h-full">
        <Card className="h-full border-primary/10 transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.98]">
            <CardContent className="p-4 flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="font-bold text-sm truncate">{label}</p>
                    <p className="text-xs text-muted-foreground truncate">{description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </CardContent>
        </Card>
    </Link>
);

const PendingApprovalCard = ({
  title,
  count,
  href,
  loading,
}: {
  title: string;
  count: number;
  href: string;
  loading: boolean;
}) => (
  <Link href={href} className="flex">
    <Card className="w-full transition-colors border-yellow-500/50 hover:bg-yellow-500/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-400">{title}</CardTitle>
        <AlertCircle className="h-4 w-4 text-yellow-600" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-12 mt-1" />
        ) : (
          <div className="text-2xl font-bold">{count}</div>
        )}
      </CardContent>
    </Card>
  </Link>
);

const StatCard = ({
    title,
    value,
    icon,
    loading,
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    loading: boolean;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20 mt-1" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
);

export function AdminDashboard() {
  const chartConfig = {
    Placed: {
      label: 'Placed',
      color: 'hsl(var(--chart-1))',
    },
    Total: {
      label: 'Total Students',
      color: 'hsl(var(--chart-2))',
    },
  };

  const db = useFirestore();

  const studentsQuery = useMemoFirebase(() => db ? collection(db, 'students') : null, [db]);
  const companiesQuery = useMemoFirebase(() => db ? collection(db, 'companies') : null, [db]);
  const volunteersQuery = useMemoFirebase(() => db ? collection(db, 'volunteers') : null, [db]);
  const placementsQuery = useMemoFirebase(() => db ? collection(db, 'placements') : null, [db]);
  const interviewsQuery = useMemoFirebase(() => db ? collection(db, 'interviews') : null, [db]);

  const { data: allStudents, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
  const { data: allCompanies, isLoading: companiesLoading } = useCollection<Company>(companiesQuery);
  const { data: allVolunteers, isLoading: volunteersLoading } = useCollection<Volunteer>(volunteersQuery);
  const { data: placements, isLoading: placementsLoading } = useCollection<Placement>(placementsQuery);
  const { data: allInterviews, isLoading: interviewsLoading } = useCollection<Interview>(interviewsQuery);

  const isLoading = studentsLoading || companiesLoading || placementsLoading || volunteersLoading || interviewsLoading;

  const approvedStudents = useMemo(() => allStudents?.filter(s => s.status === 'approved') ?? [], [allStudents]);
  const pendingStudentsCount = useMemo(() => allStudents?.filter(s => s.status === 'pending').length ?? 0, [allStudents]);
  const approvedCompaniesCount = useMemo(() => allCompanies?.filter(c => c.status === 'approved').length ?? 0, [allCompanies]);
  const pendingCompaniesCount = useMemo(() => allCompanies?.filter(c => c.status === 'pending').length ?? 0, [allCompanies]);
  const approvedVolunteersCount = useMemo(() => allVolunteers?.filter(v => v.status === 'approved').length ?? 0, [allVolunteers]);
  const pendingVolunteersCount = useMemo(() => allVolunteers?.filter(v => v.status === 'pending').length ?? 0, [allVolunteers]);
  const totalPendingApprovals = pendingStudentsCount + pendingCompaniesCount + pendingVolunteersCount;

  const interviewStats = useMemo(() => {
    const list = allInterviews ?? [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const getDate = (value: unknown): Date | null => {
      if (!value) return null;
      if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
        return (value as any).toDate();
      }
      if (value instanceof Date) return value;
      return null;
    };

    const today = list.filter((interview) => {
      const date = getDate(interview.startTime);
      return !!date && date >= startOfToday && date < endOfToday;
    }).length;

    return {
      total: list.length,
      scheduled: list.filter((interview) => interview.status === 'Scheduled').length,
      completed: list.filter((interview) => interview.status === 'Completed').length,
      noShow: list.filter((interview) => interview.status === 'No Show').length,
      canceled: list.filter((interview) => interview.status === 'Canceled').length,
      today,
    };
  }, [allInterviews]);

  const departmentPlacements = useMemo(() => {
    if (!allStudents || !placements) return [];
    const approvedStudentsForChart = allStudents.filter(s => s.status === 'approved');
    const studentMap = new Map(approvedStudentsForChart.map((s) => [s.id, s]));
    const departmentCounts: { [key: string]: { Placed: number; Total: number } } = {};

    for (const student of approvedStudentsForChart) {
      if (!student.department) continue;
      if (!departmentCounts[student.department]) {
        departmentCounts[student.department] = { Placed: 0, Total: 0 };
      }
      departmentCounts[student.department].Total++;
    }

    const placedStudentIds = new Set<string>();
    for (const placement of placements) {
      if (placedStudentIds.has(placement.studentId)) continue;
      const student = studentMap.get(placement.studentId);
      if (student && student.department && departmentCounts[student.department]) {
        departmentCounts[student.department].Placed++;
        placedStudentIds.add(student.id);
      }
    }

    return Object.entries(departmentCounts).map(([name, counts]) => ({ name, ...counts }));
  }, [allStudents, placements]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Main Command Center</h1>
            <p className="text-muted-foreground">Unified management for C@SE Job Fair.</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={totalPendingApprovals > 0 ? 'destructive' : 'outline'}>
                {totalPendingApprovals} Pending Approvals
              </Badge>
              <Badge variant="outline" className="text-green-700 border-green-700/20 bg-green-700/5">
                System Online
              </Badge>
            </div>
        </div>
        <div className="flex gap-2">
            <Button asChild size="sm">
                <Link href="/dashboard/admin/scanner">
                    <QrCode className="mr-2 h-4 w-4" /> Scan Badge
                </Link>
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <QuickAction href="/dashboard/volunteers/attendance" icon={ClipboardCheck} label="Attendance" description="Check-in logs" />
        <QuickAction href="/dashboard/student-spots" icon={LayoutGrid} label="Student Spots" description="Booth assignments" />
        <QuickAction href="/dashboard/room-assignments" icon={MapPin} label="Rooming" description="Company locations" />
        <QuickAction href="/dashboard/manage-students" icon={UserCheck} label="Student Reviews" description="Approve/reject" />
        <QuickAction href="/dashboard/manage-companies" icon={Building} label="Company Reviews" description="Approve/reject" />
        <QuickAction href="/dashboard/volunteers" icon={Users} label="Volunteer Reviews" description="Approve/reject" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <BreakControl />
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total Students" value={approvedStudents.length} icon={<Users className="h-4 w-4 text-primary" />} loading={isLoading} />
                <StatCard title="Participating Companies" value={approvedCompaniesCount} icon={<Building className="h-4 w-4 text-primary" />} loading={isLoading} />
                <StatCard title="Active Volunteers" value={approvedVolunteersCount} icon={<Briefcase className="h-4 w-4 text-primary" />} loading={isLoading} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <StatCard title="Interviews Today" value={interviewStats.today} icon={<CalendarDays className="h-4 w-4 text-primary" />} loading={isLoading} />
              <StatCard title="Total Interviews" value={interviewStats.total} icon={<Clock className="h-4 w-4 text-primary" />} loading={isLoading} />
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Placement Metrics</CardTitle>
                    <CardDescription>Department-wise distribution of hired candidates.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[300px] w-full" /> : departmentPlacements.length === 0 ? (
                        <div className="h-[300px] rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                          No placement data available yet.
                        </div>
                    ) : (
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={departmentPlacements} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                                    <YAxis hide />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                                    <Bar dataKey="Placed" fill="var(--color-Placed)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Total" fill="var(--color-Total)" radius={[4, 4, 0, 0]} opacity={0.3} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardHeader>
                    <CardTitle className="text-lg">Action Required</CardTitle>
              <CardDescription>Pending registrations requiring admin review.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <PendingApprovalCard title="Students" count={pendingStudentsCount} href="/dashboard/manage-students" loading={isLoading} />
                    <PendingApprovalCard title="Companies" count={pendingCompaniesCount} href="/dashboard/manage-companies" loading={isLoading} />
                    <PendingApprovalCard title="Volunteers" count={pendingVolunteersCount} href="/dashboard/volunteers" loading={isLoading} />
                </CardContent>
            </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-4 w-4" /> Interview Operations
              </CardTitle>
              <CardDescription>Live status across all interviews.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Scheduled</span><span className="font-semibold">{interviewStats.scheduled}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Completed</span><span className="font-semibold">{interviewStats.completed}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">No Show</span><span className="font-semibold">{interviewStats.noShow}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Canceled</span><span className="font-semibold">{interviewStats.canceled}</span></div>
            </CardContent>
          </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Database Sync</span>
                        <Badge variant="outline" className="text-green-600 border-green-600/20 bg-green-600/5">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Admin Authority</span>
                        <span className="font-bold">Master Mode</span>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
