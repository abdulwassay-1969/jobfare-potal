'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, query } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { RoomAssignment, Volunteer } from '@/lib/types';
import { ArrowLeft, Search, Users } from 'lucide-react';

type VolunteerAssignmentOverview = {
  volunteer: Volunteer;
  companyName: string | null;
  roomNumber: string | null;
  companyStatus: 'Pending' | 'Checked In' | 'Left' | 'Unassigned';
};

type CompanyAssignmentStatus = VolunteerAssignmentOverview['companyStatus'];

export default function VolunteerAssignmentsOverviewPage() {
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');

  const volunteersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'volunteers'));
  }, [db]);

  const assignmentsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'jobFairs', 'main-job-fair-2024', 'roomAssignments');
  }, [db]);

  const { data: volunteers, isLoading: volunteersLoading, error: volunteersError } = useCollection<Volunteer>(volunteersQuery);
  const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useCollection<RoomAssignment>(assignmentsQuery);

  const rows = useMemo<VolunteerAssignmentOverview[]>(() => {
    if (!volunteers) return [];

    const assignmentMap = new Map<string, { companyName: string; roomNumber: string; companyStatus: CompanyAssignmentStatus }>();

    (assignments || []).forEach((assignment) => {
      const volunteerIds = assignment.volunteerIds?.length
        ? assignment.volunteerIds
        : assignment.volunteerId
          ? [assignment.volunteerId]
          : [];

      const companyStatus: CompanyAssignmentStatus = assignment.companyLeftStatus
        ? 'Left'
        : assignment.checkInStatus
          ? 'Checked In'
          : 'Pending';

      volunteerIds.forEach((volunteerId) => {
        assignmentMap.set(volunteerId, {
          companyName: assignment.companyName,
          roomNumber: assignment.roomNumber,
          companyStatus,
        });
      });
    });

    return volunteers
      .map((volunteer) => {
        const assignment = assignmentMap.get(volunteer.id);
        return {
          volunteer,
          companyName: assignment?.companyName || null,
          roomNumber: assignment?.roomNumber || null,
          companyStatus: assignment?.companyStatus || 'Unassigned',
        };
      })
      .sort((a, b) => {
        if (!!a.companyName !== !!b.companyName) {
          return a.companyName ? -1 : 1;
        }
        return a.volunteer.fullName.localeCompare(b.volunteer.fullName);
      });
  }, [assignments, volunteers]);

  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(({ volunteer, companyName, roomNumber, companyStatus }) =>
      volunteer.fullName.toLowerCase().includes(q) ||
      volunteer.department.toLowerCase().includes(q) ||
      volunteer.email.toLowerCase().includes(q) ||
      (volunteer.assignedRole || '').toLowerCase().includes(q) ||
      (companyName || '').toLowerCase().includes(q) ||
      (roomNumber || '').toLowerCase().includes(q) ||
      companyStatus.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const isLoading = volunteersLoading || assignmentsLoading;

  const getCompanyStatusBadge = (status: VolunteerAssignmentOverview['companyStatus']) => {
    switch (status) {
      case 'Checked In':
        return <Badge className="bg-green-600 hover:bg-green-700">Checked In</Badge>;
      case 'Left':
        return <Badge variant="destructive">Left</Badge>;
      case 'Pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Unassigned</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Volunteer Assignment Overview</CardTitle>
              <CardDescription>
                Track each volunteer, their assigned company, room, and the current company status in one place.
              </CardDescription>
            </div>
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <div className="font-semibold">Total Volunteers</div>
              <div className="text-2xl font-bold">{rows.length}</div>
            </div>
          </div>
          <div className="pt-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                placeholder="Search by volunteer, company, room, or status..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Volunteer</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Assigned Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Company Status</TableHead>
                  <TableHead>Volunteer Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredRows.length > 0 ? (
                  filteredRows.map(({ volunteer, companyName, roomNumber, companyStatus }) => (
                    <TableRow key={volunteer.id}>
                      <TableCell>
                        <div className="font-medium">{volunteer.fullName}</div>
                        <div className="text-xs text-muted-foreground">{volunteer.email}</div>
                      </TableCell>
                      <TableCell>{volunteer.department}</TableCell>
                      <TableCell>{volunteer.assignedRole || <span className="text-muted-foreground italic">Not assigned</span>}</TableCell>
                      <TableCell>{companyName || <span className="text-muted-foreground italic">No company assigned</span>}</TableCell>
                      <TableCell>{roomNumber || <span className="text-muted-foreground italic">—</span>}</TableCell>
                      <TableCell>{getCompanyStatusBadge(companyStatus)}</TableCell>
                      <TableCell>
                        <Badge variant={volunteer.status === 'approved' ? 'default' : 'secondary'} className="capitalize">
                          {volunteer.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-10 w-10" />
                        <p>No volunteer assignment records matched your search.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {(volunteersError || assignmentsError) && (
            <p className="mt-4 text-sm text-red-500">
              Error loading assignment overview: {volunteersError?.message || assignmentsError?.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
