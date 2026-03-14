
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, query, doc, updateDoc, serverTimestamp, collectionGroup } from 'firebase/firestore';
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
import { Download, QrCode, ArrowLeft, UserCheck, UserX, MapPin, Search } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Student, ProjectSpotAssignment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function AllStudentsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const studentsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'students'));
  }, [db]);

  const spotsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collectionGroup(db, 'projectSpotAssignments'));
  }, [db]);

  const { data: students, isLoading: loading, error } = useCollection<Student>(studentsQuery);
  const { data: spots } = useCollection<ProjectSpotAssignment>(spotsQuery);

  const spotMap = useMemo(() => {
    const map = new Map<string, ProjectSpotAssignment>();
    spots?.forEach(s => map.set(s.studentId, s));
    return map;
  }, [spots]);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => 
      s.fullName.toLowerCase().includes(q) || 
      s.registrationNumber.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const toggleAttendance = async (studentId: string, currentStatus: boolean) => {
    if (!db) return;
    const studentRef = doc(db, 'students', studentId);
    const dataToUpdate = {
      isPresent: !currentStatus,
      presentAt: !currentStatus ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
    };

    updateDoc(studentRef, dataToUpdate)
      .then(() => {
        toast({
          title: !currentStatus ? "Student Marked Present" : "Student Marked Absent",
          description: "Attendance status has been updated.",
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: studentRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const downloadCSV = () => {
    if (!filteredStudents) return;

    const headers = ['Full Name', 'Email', 'Registration Number', 'Department', 'Spot', 'Status', 'Attendance'];
    const csvRows = [
      headers.join(','),
      ...filteredStudents.map(s => {
        const spot = spotMap.get(s.id);
        const spotInfo = spot ? `${spot.roomNumber} - ${spot.spotNumber}` : 'N/A';
        return [
          `"${s.fullName}"`,
          `"${s.email}"`,
          `"${s.registrationNumber}"`,
          `"${s.department}"`,
          `"${spotInfo}"`,
          `"${s.status}"`,
          `"${s.isPresent ? 'Present' : 'Absent'}"`
        ].join(',');
      })
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "all_students.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const StudentRow = ({ student }: { student: Student }) => {
    const spot = spotMap.get(student.id);
    
    return (
      <TableRow key={student.id}>
        <TableCell className="font-medium">{student.fullName}</TableCell>
        <TableCell>{student.registrationNumber}</TableCell>
        <TableCell>{student.department}</TableCell>
        <TableCell>
          {spot ? (
            <div className="flex flex-col text-xs">
              <span className="font-bold flex items-center gap-1"><MapPin className="h-3 w-3" /> {spot.roomNumber}</span>
              <span className="text-muted-foreground">Spot: {spot.spotNumber}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs italic">Unassigned</span>
          )}
        </TableCell>
        <TableCell><Badge variant={student.status === 'approved' ? 'default' : student.status === 'pending' ? 'secondary' : 'destructive'} className="capitalize text-[10px]">{student.status}</Badge></TableCell>
        <TableCell>
          {student.status === 'approved' ? (
            <Button 
              variant={student.isPresent ? "default" : "outline"} 
              size="sm" 
              className={student.isPresent ? "bg-green-600 hover:bg-green-700 h-7 text-[10px]" : "h-7 text-[10px]"}
              onClick={() => toggleAttendance(student.id, !!student.isPresent)}
            >
              {student.isPresent ? <UserCheck className="mr-1 h-3 w-3" /> : <UserX className="mr-1 h-3 w-3" />}
              {student.isPresent ? "Present" : "Absent"}
            </Button>
          ) : (
            <span className="text-muted-foreground italic text-xs">Pending</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Link href={`/dashboard/students/${student.id}/badge`}>
                <QrCode className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Button onClick={downloadCSV} disabled={!filteredStudents || filteredStudents.length === 0} size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Directory</CardTitle>
          <CardDescription>
            Search and manage all registered students.
          </CardDescription>
          <div className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, reg. number, or department..."
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
                  <TableHead>Name</TableHead>
                  <TableHead>Reg. No</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Spot</TableHead>
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
                )) : filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <StudentRow key={student.id} student={student} />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No students found matching your search.
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
