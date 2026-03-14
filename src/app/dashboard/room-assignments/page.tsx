'use client';

import React, { useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Company, Volunteer, RoomAssignment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AssignRoomDialog } from '@/components/dashboard/assign-room-dialog';
import { MapPin, Building, PlusCircle, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function RoomAssignmentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<RoomAssignment | null>(null);

  const db = useFirestore();

  const companiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'companies'), where('status', '==', 'approved'));
  }, [db]);

  const volunteersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'volunteers'), where('status', '==', 'approved'));
  }, [db]);

  const assignmentsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'jobFairs', 'main-job-fair-2024', 'roomAssignments');
  }, [db]);

  const { data: companies, isLoading: companiesLoading } = useCollection<Company>(companiesQuery);
  const { data: volunteers, isLoading: volunteersLoading } = useCollection<Volunteer>(volunteersQuery);
  const { data: assignments, isLoading: assignmentsLoading } = useCollection<RoomAssignment>(assignmentsQuery);

  const isLoading = companiesLoading || volunteersLoading || assignmentsLoading;

  const handleEdit = (assignment: RoomAssignment) => {
    setSelectedAssignment(assignment);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedAssignment(null);
    setIsDialogOpen(true);
  };

  // Group assignments by room to visualize multi-company rooms
  const assignmentsByRoom = (assignments || []).reduce((acc, curr) => {
    if (!acc[curr.roomNumber]) acc[curr.roomNumber] = [];
    acc[curr.roomNumber].push(curr);
    return acc;
  }, {} as Record<string, RoomAssignment[]>);

  const AssignmentRow = ({ assignment }: { assignment: RoomAssignment }) => (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            {assignment.companyName}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono">{assignment.roomNumber}</Badge>
      </TableCell>
      <TableCell>{assignment.volunteerName || <span className="text-muted-foreground italic">Not Assigned</span>}</TableCell>
      <TableCell>
        {assignment.checkInStatus ? (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">Checked In</Badge>
        ) : (
          <Badge variant="secondary">Pending</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={() => handleEdit(assignment)}>
          Edit
        </Button>
      </TableCell>
    </TableRow>
  );

  const SkeletonRow = () => (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-8 w-16" /></TableCell>
    </TableRow>
  );

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Room & Volunteer Assignments</CardTitle>
            <CardDescription>Assign companies to rooms. Note: Rooms can accommodate up to 2 companies.</CardDescription>
          </div>
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Assignment
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Assigned Volunteer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                {!isLoading && assignments && assignments.length > 0 ? (
                  assignments.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)).map((assignment) => (
                    <AssignmentRow key={assignment.id} assignment={assignment} />
                  ))
                ) : (
                  !isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4">No assignments created yet.</p>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {isDialogOpen && (
        <AssignRoomDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          companies={companies || []}
          volunteers={volunteers || []}
          existingAssignment={selectedAssignment}
        />
      )}
    </div>
  );
}