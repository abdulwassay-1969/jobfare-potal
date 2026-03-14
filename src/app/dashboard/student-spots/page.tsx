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
import { Student, ProjectSpotAssignment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AssignStudentSpotDialog } from '@/components/dashboard/assign-student-spot-dialog';
import { LayoutGrid, PlusCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StudentSpotsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ProjectSpotAssignment | null>(null);

  const db = useFirestore();

  const studentsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'students'), where('status', '==', 'approved'));
  }, [db]);

  // In a multi-fair setup, you'd parameterize the jobFairId
  const jobFairId = 'main-job-fair-2024';
  const assignmentsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'jobFairs', jobFairId, 'projectSpotAssignments');
  }, [db, jobFairId]);

  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
  const { data: assignments, isLoading: assignmentsLoading } = useCollection<ProjectSpotAssignment>(assignmentsQuery);

  const isLoading = studentsLoading || assignmentsLoading;

  const handleEdit = (assignment: ProjectSpotAssignment) => {
    setSelectedAssignment(assignment);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedAssignment(null);
    setIsDialogOpen(true);
  };

  const AssignmentRow = ({ assignment }: { assignment: ProjectSpotAssignment }) => (
    <TableRow>
      <TableCell className="font-medium">{assignment.studentName}</TableCell>
      <TableCell>{assignment.roomNumber}</TableCell>
      <TableCell>{assignment.spotNumber}</TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm" onClick={() => handleEdit(assignment)}>
          Edit
        </Button>
      </TableCell>
    </TableRow>
  );

  const SkeletonRow = () => (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
            <CardTitle>Student Project Spots</CardTitle>
            <CardDescription>Assign students to spots for displaying their projects.</CardDescription>
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
                  <TableHead>Student</TableHead>
                  <TableHead>Room Number</TableHead>
                  <TableHead>Spot Number</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                {!isLoading && assignments && assignments.length > 0 ? (
                  assignments.map((assignment) => (
                    <AssignmentRow key={assignment.id} assignment={assignment} />
                  ))
                ) : (
                  !isLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4">No student spots assigned yet.</p>
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
        <AssignStudentSpotDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          students={students || []}
          existingAssignment={selectedAssignment}
        />
      )}
    </div>
  );
}