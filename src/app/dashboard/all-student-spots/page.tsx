'use client';

import React from 'react';
import { collectionGroup, query } from 'firebase/firestore';
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
import { Download, LayoutGrid, ArrowLeft } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { ProjectSpotAssignment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function AllStudentSpotsPage() {
  const db = useFirestore();

  const assignmentsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collectionGroup(db, 'projectSpotAssignments'));
  }, [db]);

  const { data: assignments, isLoading: loading, error } = useCollection<ProjectSpotAssignment>(assignmentsQuery);

  const downloadCSV = () => {
    if (!assignments) return;

    const headers = ['Student Name', 'Room Number', 'Spot Number'];
    const csvRows = [
      headers.join(','),
      ...assignments.map(a => [
        `"${a.studentName}"`,
        `"${a.roomNumber}"`,
        `"${a.spotNumber}"`,
      ].join(','))
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "all_student_spots.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const AssignmentRow = ({ assignment }: { assignment: ProjectSpotAssignment }) => (
    <TableRow key={assignment.id}>
      <TableCell className="font-medium">{assignment.studentName}</TableCell>
      <TableCell>{assignment.roomNumber}</TableCell>
      <TableCell>{assignment.spotNumber}</TableCell>
    </TableRow>
  );

  const SkeletonRow = () => (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
            <CardTitle>All Student Spot Assignments</CardTitle>
            <CardDescription>
              A complete list of all students assigned to a project spot.
            </CardDescription>
          </div>
          <Button onClick={downloadCSV} disabled={!assignments || assignments.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Download as CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Room Number</TableHead>
                  <TableHead>Spot Number</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                {!loading && assignments && assignments.length > 0 ? (
                  assignments.map((assignment) => (
                    <AssignmentRow key={assignment.id} assignment={assignment} />
                  ))
                ) : (
                  !loading && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4">No spots have been assigned yet.</p>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
          {error && (
            <p className="text-red-500 mt-4">
              Error loading assignments: {error.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}