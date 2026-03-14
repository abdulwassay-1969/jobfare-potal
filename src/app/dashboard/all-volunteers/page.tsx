
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
import { Input } from '@/components/ui/input';
import { Download, QrCode, ArrowLeft, UserCheck, UserX, Search } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Volunteer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function AllVolunteersPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const volunteersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'volunteers'));
  }, [db]);

  const { data: volunteers, isLoading: loading, error } = useCollection<Volunteer>(volunteersQuery);

  const filteredVolunteers = useMemo(() => {
    if (!volunteers) return [];
    if (!searchQuery) return volunteers;
    const q = searchQuery.toLowerCase();
    return volunteers.filter(v => 
      v.fullName.toLowerCase().includes(q) || 
      v.email.toLowerCase().includes(q) ||
      v.department.toLowerCase().includes(q) ||
      (v.assignedRole?.toLowerCase().includes(q))
    );
  }, [volunteers, searchQuery]);

  const toggleAttendance = async (volunteerId: string, currentStatus: boolean) => {
    if (!db) return;
    const volunteerRef = doc(db, 'volunteers', volunteerId);
    const dataToUpdate = {
      isPresent: !currentStatus,
      presentAt: !currentStatus ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
    };

    updateDoc(volunteerRef, dataToUpdate)
      .then(() => {
        toast({
          title: !currentStatus ? "Marked Present" : "Marked Absent",
          description: "Volunteer attendance status updated.",
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: volunteerRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const downloadCSV = () => {
    if (!filteredVolunteers) return;

    const headers = ['Full Name', 'Email', 'Phone', 'Department', 'Assigned Role', 'Status', 'Attendance'];
    const csvRows = [
      headers.join(','),
      ...filteredVolunteers.map(v => [
        `"${v.fullName}"`,
        `"${v.email}"`,
        `"${v.phoneNumber}"`,
        `"${v.department}"`,
        `"${v.assignedRole || 'N/A'}"`,
        `"${v.status}"`,
        `"${v.isPresent ? 'Present' : 'Absent'}"`
      ].join(','))
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "all_volunteers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const VolunteerRow = ({ volunteer }: { volunteer: Volunteer }) => (
    <TableRow key={volunteer.id}>
      <TableCell className="font-medium">{volunteer.fullName}</TableCell>
      <TableCell>{volunteer.email}</TableCell>
      <TableCell>{volunteer.department}</TableCell>
      <TableCell>{volunteer.assignedRole || <span className="text-muted-foreground italic text-xs">Unassigned</span>}</TableCell>
      <TableCell><Badge variant={volunteer.status === 'approved' ? 'default' : 'secondary'} className="capitalize">{volunteer.status}</Badge></TableCell>
      <TableCell>
        {volunteer.status === 'approved' ? (
          <Button 
            variant={volunteer.isPresent ? "default" : "outline"} 
            size="sm" 
            className={volunteer.isPresent ? "bg-green-600 hover:bg-green-700 h-7 text-[10px]" : "h-7 text-[10px]"}
            onClick={() => toggleAttendance(volunteer.id, !!volunteer.isPresent)}
          >
            {volunteer.isPresent ? <UserCheck className="mr-1 h-3 w-3" /> : <UserX className="mr-1 h-3 w-3" />}
            {volunteer.isPresent ? "Present" : "Absent"}
          </Button>
        ) : (
          <span className="text-muted-foreground italic text-xs">Pending</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {volunteer.status === 'approved' && (
          <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Link href={`/dashboard/volunteers/${volunteer.id}/badge`}>
              <QrCode className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Button onClick={downloadCSV} disabled={!filteredVolunteers || filteredVolunteers.length === 0} size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Volunteer Directory</CardTitle>
          <CardDescription>
            Search and monitor all event helpers.
          </CardDescription>
          <div className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or role..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Assigned Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead className="text-right">Badge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                )) : filteredVolunteers.length > 0 ? (
                  filteredVolunteers.map((volunteer) => (
                    <VolunteerRow key={volunteer.id} volunteer={volunteer} />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No volunteers found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {error && <p className="text-red-500 mt-4 text-xs">Error: {error.message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
