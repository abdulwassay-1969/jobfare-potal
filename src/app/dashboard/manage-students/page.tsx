'use client';

import React, { useState, useMemo } from 'react';
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { MoreHorizontal, ArrowLeft, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Student } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

type Status = 'pending' | 'approved' | 'rejected';

const statusColors: Record<Status, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

export default function ManageStudentsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Status>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const db = useFirestore();

  const studentsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'students'), where('status', '==', activeTab));
  }, [db, activeTab]);

  const {
    data: students,
    isLoading: loading,
    error,
  } = useCollection<Student>(studentsQuery);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => 
        s.fullName.toLowerCase().includes(q) || 
        s.registrationNumber.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const updateStudentStatus = (id: string, status: Status) => {
    if (!db) return;
    const studentDocRef = doc(db, 'students', id);
    const dataToUpdate = { status, updatedAt: serverTimestamp() };

    updateDoc(studentDocRef, dataToUpdate)
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: studentDocRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
      });

    toast({
      title: 'Status Updated',
      description: `Student has been moved to ${status}.`,
    });
  };

  const StudentRow = ({ student }: { student: Student }) => (
    <TableRow key={student.id}>
      <TableCell className="font-medium">{student.fullName}</TableCell>
      <TableCell>{student.registrationNumber}</TableCell>
      <TableCell>{student.department}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`capitalize border-0 text-white ${
            statusColors[student.status]
          }`}
        >
          {student.status}
        </Badge>
      </TableCell>
      <TableCell>
        {(student.updatedAt || student.createdAt) &&
          new Date(
            ((student.updatedAt || student.createdAt) as Timestamp).seconds * 1000
          ).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(student.email)}
            >
              Copy Email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {student.status === 'pending' && (
              <>
                <DropdownMenuItem onClick={() => updateStudentStatus(student.id, 'approved')}>
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStudentStatus(student.id, 'rejected')} className="text-red-600">
                  Reject
                </DropdownMenuItem>
              </>
            )}
            {student.status === 'approved' && (
              <DropdownMenuItem onClick={() => updateStudentStatus(student.id, 'rejected')} className="text-red-600">
                Reject
              </DropdownMenuItem>
            )}
            {student.status === 'rejected' && (
              <DropdownMenuItem onClick={() => updateStudentStatus(student.id, 'pending')}>
                Move to Pending
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
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
        <CardHeader>
          <CardTitle>Review Student Applications</CardTitle>
          <CardDescription>
            Approve or reject students based on their profile data.
          </CardDescription>
          <div className="pt-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as Status)}
          >
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Reg. Number</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    )) : filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <StudentRow key={student.id} student={student} />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No {activeTab} students found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
          {error && (
            <p className="text-red-500 mt-4">
              Error loading students: {error.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}