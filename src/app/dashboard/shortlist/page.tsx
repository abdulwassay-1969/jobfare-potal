
'use client';
import React from 'react';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { ShortlistedStudent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ListChecks, UserX, Trash2, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ShortlistPage() {
    const { user } = useAuth();
    const db = useFirestore();
    const { toast } = useToast();

    const shortlistQuery = useMemoFirebase(() => {
        if (!db || !user) return null;
        return query(
            collection(db, 'companies', user.uid, 'shortlistedStudents'),
            orderBy('addedAt', 'desc')
        );
    }, [db, user]);

    const { data: shortlistedStudents, isLoading: loading, error } = useCollection<ShortlistedStudent>(shortlistQuery);
    
    const removeFromShortlist = async (studentId: string, studentName: string) => {
        if (!user || !db) return;
        const shortlistRef = doc(db, 'companies', user.uid, 'shortlistedStudents', studentId);
        
        deleteDoc(shortlistRef).then(() => {
            toast({
                title: "Removed from Shortlist",
                description: `${studentName} has been removed.`,
            });
        }).catch((serverError) => {
             const permissionError = new FirestorePermissionError({ path: shortlistRef.path, operation: 'delete' });
             errorEmitter.emit('permission-error', permissionError);
        });
    };

    const ShortlistRow = ({ student }: { student: ShortlistedStudent }) => (
        <TableRow key={student.id}>
            <TableCell className="font-medium">{student.studentName}</TableCell>
            <TableCell>{student.studentDept}</TableCell>
            <TableCell className="max-w-md">
                <div className="flex flex-wrap gap-1">
                    {student.studentSkills?.slice(0, 7).map((skill, i) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                    ))}
                </div>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => removeFromShortlist(student.id, student.studentName)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Remove
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );

    const SkeletonRow = () => (
      <TableRow>
        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-8 w-24" /></TableCell>
      </TableRow>
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/companies">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Dashboard
                </Link>
            </Button>
            <h1 className="text-2xl font-bold">Your Shortlist</h1>
        </div>
        <Card>
            <CardHeader>
            <CardTitle>Shortlisted Students</CardTitle>
            <CardDescription>
                A list of students you have shortlisted. You can schedule interviews or remove them from this list.
            </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Skills</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                        {!loading && shortlistedStudents && shortlistedStudents.length > 0 ? (
                            shortlistedStudents.map((student) => (
                                <ShortlistRow key={student.id} student={student} />
                            ))
                        ) : (
                            !loading && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-64 text-center">
                                    <UserX className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-4 text-lg font-semibold">No students shortlisted</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        You can shortlist students from the main dashboard.
                                    </p>
                                </TableCell>
                            </TableRow>
                            )
                        )}
                        </TableBody>
                    </Table>
                </div>
                {error && (
                    <p className="text-red-500 mt-4">
                        Error loading shortlist: {error.message}
                    </p>
                )}
            </CardContent>
        </Card>
      </div>
    );
}
