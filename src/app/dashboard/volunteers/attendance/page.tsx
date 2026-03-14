
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { collectionGroup, query, doc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { VolunteerShift, Volunteer, ProjectSpotAssignment } from '@/lib/types';
import { ArrowLeft, CheckCircle2, Clock, User, ClipboardCheck, LayoutGrid, MapPin, RefreshCcw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function VolunteerAttendancePage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const shiftsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collectionGroup(db, 'volunteerShifts'));
  }, [db]);

  const studentsAttendanceQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collectionGroup(db, 'projectSpotAssignments'));
  }, [db]);

  const { data: shifts, isLoading: loadingShifts, error: shiftsError } = useCollection<VolunteerShift>(shiftsQuery);
  const { data: studentSpots, isLoading: loadingStudents, error: studentsError } = useCollection<ProjectSpotAssignment>(studentsAttendanceQuery);

  const volunteersQuery = useMemoFirebase(() => {
      if (!db) return null;
      return collection(db, 'volunteers');
  }, [db]);
  const { data: volunteers } = useCollection<Volunteer>(volunteersQuery);

  const volunteerMap = useMemo(() => {
      const map = new Map<string, string>();
      volunteers?.forEach(v => map.set(v.id, v.fullName));
      return map;
  }, [volunteers]);

  const filteredShifts = useMemo(() => {
    if (!shifts) return [];
    if (!searchQuery) return shifts;
    const q = searchQuery.toLowerCase();
    return shifts.filter(s => 
        (volunteerMap.get(s.volunteerId)?.toLowerCase() || '').includes(q) ||
        s.shiftName.toLowerCase().includes(q)
    );
  }, [shifts, searchQuery, volunteerMap]);

  const filteredStudentSpots = useMemo(() => {
    if (!studentSpots) return [];
    if (!searchQuery) return studentSpots;
    const q = searchQuery.toLowerCase();
    return studentSpots.filter(s => 
        s.studentName.toLowerCase().includes(q) ||
        s.roomNumber.toLowerCase().includes(q) ||
        s.spotNumber.toLowerCase().includes(q)
    );
  }, [studentSpots, searchQuery]);

  const toggleVolunteerAttendance = async (shift: VolunteerShift) => {
    if (!db) return;
    const shiftRef = doc(db, 'jobFairs', shift.jobFairId, 'volunteerShifts', shift.id);
    const newStatus = !shift.isAttended;
    const dataToUpdate = {
        isAttended: newStatus,
        attendedAt: newStatus ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
    };

    try {
        await updateDoc(shiftRef, dataToUpdate);
        toast({
            title: newStatus ? "Attendance Marked" : "Attendance Removed",
            description: `Status updated for ${volunteerMap.get(shift.volunteerId) || 'Volunteer'}.`
        });
    } catch (err) {
        const permissionError = new FirestorePermissionError({
            path: shiftRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  const toggleStudentAttendance = async (spot: ProjectSpotAssignment) => {
    if (!db) return;
    const spotRef = doc(db, 'jobFairs', spot.jobFairId, 'projectSpotAssignments', spot.studentId);
    const newStatus = !spot.checkedIn;
    const dataToUpdate = {
        checkedIn: newStatus,
        checkedInAt: newStatus ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
    };

    try {
        await updateDoc(spotRef, dataToUpdate);
        toast({
            title: newStatus ? "Student Marked Present" : "Attendance Removed",
            description: `Status updated for ${spot.studentName}.`
        });
    } catch (err) {
        const permissionError = new FirestorePermissionError({
            path: spotRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
            </Link>
            </Button>
            <h1 className="text-2xl font-bold">Attendance Tracker</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
            placeholder="Search participants or locations..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {(shiftsError || studentsError) && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm font-medium">
              Error loading attendance data. Ensure you have proper permissions.
          </div>
      )}

      <Tabs defaultValue="volunteers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="volunteers" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Volunteers
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <User className="h-4 w-4" /> Students
          </TabsTrigger>
        </TabsList>

        <TabsContent value="volunteers">
          <Card>
            <CardHeader>
              <CardTitle>Volunteer Attendance</CardTitle>
              <CardDescription>Monitor assigned shifts and mark presence.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Volunteer</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingShifts ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                      ))
                    ) : filteredShifts.length > 0 ? (
                      filteredShifts.map((shift) => (
                        <TableRow key={shift.id}>
                            <TableCell className="font-medium">
                                {volunteerMap.get(shift.volunteerId) || <span className="text-muted-foreground italic">Unknown Volunteer</span>}
                            </TableCell>
                            <TableCell>{shift.shiftName}</TableCell>
                            <TableCell>
                                {shift.isAttended ? (
                                <div className="flex items-center gap-2 text-green-600 font-bold">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Attended
                                </div>
                                ) : (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    Pending
                                </div>
                                )}
                            </TableCell>
                            <TableCell>
                                {shift.attendedAt ? new Date(shift.attendedAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant={shift.isAttended ? "outline" : "default"} size="sm" onClick={() => toggleVolunteerAttendance(shift)}>
                                {shift.isAttended ? "Mark Absent" : "Mark Present"}
                                </Button>
                            </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No participants found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Student Presence</CardTitle>
              <CardDescription>Track which students are at their assigned spots.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingStudents ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                      ))
                    ) : filteredStudentSpots.length > 0 ? (
                      filteredStudentSpots.map((spot) => (
                        <TableRow key={spot.id}>
                            <TableCell className="font-medium">{spot.studentName}</TableCell>
                            <TableCell>
                                <div className="flex flex-col text-xs">
                                    <span className="font-bold text-foreground flex items-center gap-1"><MapPin className="h-3 w-3 text-primary"/> {spot.roomNumber}</span>
                                    <span className="text-muted-foreground">Spot: {spot.spotNumber}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                {spot.checkedIn ? (
                                <div className="flex items-center gap-2 text-green-600 font-bold">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Present
                                </div>
                                ) : (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    Awaiting
                                </div>
                                )}
                            </TableCell>
                            <TableCell>
                                {spot.checkedInAt ? new Date(spot.checkedInAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant={spot.checkedIn ? "outline" : "default"} size="sm" onClick={() => toggleStudentAttendance(spot)}>
                                {spot.checkedIn ? "Mark Absent" : "Mark Present"}
                                </Button>
                            </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No participants found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
