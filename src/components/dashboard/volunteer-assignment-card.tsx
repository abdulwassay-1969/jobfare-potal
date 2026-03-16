'use client';

import React from 'react';
import { collection, query, where, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { RoomAssignment, Company } from '@/lib/types';
import { Building, MapPin, Users, User, CheckCircle, UserCheck, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';


export function VolunteerAssignmentCard({ volunteerId }: { volunteerId: string }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const [isMarkingLeft, setIsMarkingLeft] = React.useState(false);
  const [isUndoingCheckIn, setIsUndoingCheckIn] = React.useState(false);
  const [isUndoingLeft, setIsUndoingLeft] = React.useState(false);

  // 1. Find the room assignment for this volunteer
  const assignmentsQuery = useMemoFirebase(() => {
    if (!db || !volunteerId) return null;
    return query(
        collection(db, 'jobFairs', 'main-job-fair-2024', 'roomAssignments'),
        where('volunteerId', '==', volunteerId)
    );
  }, [db, volunteerId]);

  const assignmentsByArrayQuery = useMemoFirebase(() => {
    if (!db || !volunteerId) return null;
    return query(
      collection(db, 'jobFairs', 'main-job-fair-2024', 'roomAssignments'),
      where('volunteerIds', 'array-contains', volunteerId)
    );
  }, [db, volunteerId]);

  const { data: legacyAssignments, isLoading: legacyAssignmentLoading } = useCollection<RoomAssignment>(assignmentsQuery);
  const { data: multiAssignments, isLoading: multiAssignmentLoading } = useCollection<RoomAssignment>(assignmentsByArrayQuery);

  const assignment = React.useMemo(() => {
    const merged = [...(multiAssignments || []), ...(legacyAssignments || [])];
    const uniqueAssignments = merged.filter(
      (item, index, self) => index === self.findIndex((candidate) => candidate.id === item.id)
    );

    return uniqueAssignments[0];
  }, [legacyAssignments, multiAssignments]);

  // 2. Based on the assignment, find the company details
  const companyRef = useMemoFirebase(() => {
    if (!db || !assignment?.companyId) return null;
    return doc(db, 'companies', assignment.companyId);
  }, [db, assignment]);

  const { data: company, isLoading: companyLoading } = useDoc<Company>(companyRef);

  const isLoading = legacyAssignmentLoading || multiAssignmentLoading || (assignment && companyLoading);
  
  const handleCheckIn = async () => {
    if (!db || !assignment || isCheckingIn) return;
    setIsCheckingIn(true);
    const assignmentRef = doc(db, 'jobFairs', 'main-job-fair-2024', 'roomAssignments', assignment.id);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(assignmentRef);

        if (!snapshot.exists()) {
          return 'not-found';
        }

        const current = snapshot.data() as Partial<RoomAssignment>;

        if (current.companyLeftStatus) {
          return 'already-left';
        }

        if (current.checkInStatus) {
          return 'already-checked-in';
        }

        transaction.update(assignmentRef, {
          checkInStatus: true,
          checkInTime: serverTimestamp(),
          checkInMarkedByVolunteerId: volunteerId,
        });

        return 'updated';
      });

      if (result === 'updated') {
        toast({
          title: 'Checked In!',
          description: `${assignment.companyName} is now marked as checked in.`,
        });
      } else if (result === 'already-checked-in') {
        toast({
          title: 'Already Checked In',
          description: 'Another volunteer has already marked this company as checked in.',
        });
      } else if (result === 'already-left') {
        toast({
          title: 'Company Already Left',
          description: 'This company is already marked as left.',
        });
      } else {
        toast({
          title: 'Assignment Not Found',
          description: 'Could not find this assignment record.',
          variant: 'destructive',
        });
      }
    } catch (serverError) {
      const dataToUpdate = {
        checkInStatus: true,
        checkInTime: serverTimestamp(),
        checkInMarkedByVolunteerId: volunteerId,
      };
      const permissionError = new FirestorePermissionError({
        path: assignmentRef.path,
        operation: 'update',
        requestResourceData: dataToUpdate,
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        title: 'Check-in Failed',
        description: 'Could not update status. You may not have permission.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleMarkLeft = async () => {
    if (!db || !assignment || isMarkingLeft) return;
    setIsMarkingLeft(true);
    const assignmentRef = doc(db, 'jobFairs', 'main-job-fair-2024', 'roomAssignments', assignment.id);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(assignmentRef);

        if (!snapshot.exists()) {
          return 'not-found';
        }

        const current = snapshot.data() as Partial<RoomAssignment>;

        if (current.companyLeftStatus) {
          return 'already-left';
        }

        transaction.update(assignmentRef, {
          companyLeftStatus: true,
          companyLeftTime: serverTimestamp(),
          companyLeftMarkedByVolunteerId: volunteerId,
        });

        return 'updated';
      });

      if (result === 'updated') {
        toast({
          title: 'Marked as Left',
          description: `${assignment.companyName} has been marked as left.`,
        });
      } else if (result === 'already-left') {
        toast({
          title: 'Already Marked Left',
          description: 'Another volunteer has already marked this company as left.',
        });
      } else {
        toast({
          title: 'Assignment Not Found',
          description: 'Could not find this assignment record.',
          variant: 'destructive',
        });
      }
    } catch (serverError) {
      const dataToUpdate = {
        companyLeftStatus: true,
        companyLeftTime: serverTimestamp(),
        companyLeftMarkedByVolunteerId: volunteerId,
      };
      const permissionError = new FirestorePermissionError({
        path: assignmentRef.path,
        operation: 'update',
        requestResourceData: dataToUpdate,
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        title: 'Update Failed',
        description: 'Could not mark company as left. You may not have permission.',
        variant: 'destructive',
      });
    } finally {
      setIsMarkingLeft(false);
    }
  };

  const handleUndoCheckIn = async () => {
    if (!db || !assignment || isUndoingCheckIn) return;
    setIsUndoingCheckIn(true);
    const assignmentRef = doc(db, 'jobFairs', 'main-job-fair-2024', 'roomAssignments', assignment.id);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(assignmentRef);

        if (!snapshot.exists()) {
          return 'not-found';
        }

        const current = snapshot.data() as Partial<RoomAssignment>;

        if (!current.checkInStatus) {
          return 'already-undone';
        }

        if (current.checkInMarkedByVolunteerId && current.checkInMarkedByVolunteerId !== volunteerId) {
          return 'not-owner';
        }

        transaction.update(assignmentRef, {
          checkInStatus: false,
          checkInTime: null,
          checkInMarkedByVolunteerId: '',
        });

        return 'updated';
      });

      if (result === 'updated') {
        toast({
          title: 'Check-in Reverted',
          description: `${assignment.companyName} check-in has been undone.`,
        });
      } else if (result === 'not-owner') {
        toast({
          title: 'Action Restricted',
          description: 'Only the volunteer who marked check-in can undo it.',
          variant: 'destructive',
        });
      } else if (result === 'already-undone') {
        toast({
          title: 'Already Reverted',
          description: 'Check-in is already not marked.',
        });
      } else {
        toast({
          title: 'Assignment Not Found',
          description: 'Could not find this assignment record.',
          variant: 'destructive',
        });
      }
    } catch (serverError) {
      const permissionError = new FirestorePermissionError({
        path: assignmentRef.path,
        operation: 'update',
        requestResourceData: {
          checkInStatus: false,
          checkInTime: null,
          checkInMarkedByVolunteerId: '',
        },
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        title: 'Undo Failed',
        description: 'Could not undo check-in. You may not have permission.',
        variant: 'destructive',
      });
    } finally {
      setIsUndoingCheckIn(false);
    }
  };

  const handleUndoLeft = async () => {
    if (!db || !assignment || isUndoingLeft) return;
    setIsUndoingLeft(true);
    const assignmentRef = doc(db, 'jobFairs', 'main-job-fair-2024', 'roomAssignments', assignment.id);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(assignmentRef);

        if (!snapshot.exists()) {
          return 'not-found';
        }

        const current = snapshot.data() as Partial<RoomAssignment>;

        if (!current.companyLeftStatus) {
          return 'already-undone';
        }

        if (current.companyLeftMarkedByVolunteerId && current.companyLeftMarkedByVolunteerId !== volunteerId) {
          return 'not-owner';
        }

        transaction.update(assignmentRef, {
          companyLeftStatus: false,
          companyLeftTime: null,
          companyLeftMarkedByVolunteerId: '',
        });

        return 'updated';
      });

      if (result === 'updated') {
        toast({
          title: 'Exit Reverted',
          description: `${assignment.companyName} exit status has been undone.`,
        });
      } else if (result === 'not-owner') {
        toast({
          title: 'Action Restricted',
          description: 'Only the volunteer who marked company exit can undo it.',
          variant: 'destructive',
        });
      } else if (result === 'already-undone') {
        toast({
          title: 'Already Reverted',
          description: 'Company is already not marked as left.',
        });
      } else {
        toast({
          title: 'Assignment Not Found',
          description: 'Could not find this assignment record.',
          variant: 'destructive',
        });
      }
    } catch (serverError) {
      const permissionError = new FirestorePermissionError({
        path: assignmentRef.path,
        operation: 'update',
        requestResourceData: {
          companyLeftStatus: false,
          companyLeftTime: null,
          companyLeftMarkedByVolunteerId: '',
        },
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        title: 'Undo Failed',
        description: 'Could not undo company exit. You may not have permission.',
        variant: 'destructive',
      });
    } finally {
      setIsUndoingLeft(false);
    }
  };


  if (isLoading) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Assigned Company
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-3/4" />
                  </div>
                   <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-1/2" />
                  </div>
              </CardContent>
          </Card>
      )
  }
  
  if (!assignment) {
      return (
           <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Assigned Company
                  </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                    You are not assigned yet. Please check back soon or contact your supervisor.
                </p>
              </CardContent>
          </Card>
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary"/>
            {assignment.companyName}
        </CardTitle>
        <CardDescription>
            Here are the details for your assigned company.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
            <span className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/> Room Number</span>
            <span className="font-bold text-lg text-primary">{assignment.roomNumber}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
            <span className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground"/> Representatives</span>
            <span>{company?.representatives ?? 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
            <span className="font-semibold flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/> HR Contact</span>
            <span>{company?.hrName ?? 'N/A'}</span>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex flex-wrap items-center gap-2">
          {assignment.checkInStatus ? (
            <>
              <div className="flex items-center text-green-600 font-semibold p-2 rounded-md bg-green-500/10">
                <CheckCircle className="mr-2 h-5 w-5" />
                Company Checked In
              </div>
              <Button variant="outline" onClick={handleUndoCheckIn} disabled={isUndoingCheckIn}>
                {isUndoingCheckIn ? 'Undoing...' : 'Undo Check-in'}
              </Button>
            </>
          ) : (
            <Button onClick={handleCheckIn} disabled={isCheckingIn || assignment.companyLeftStatus}>
              <UserCheck className="mr-2 h-4 w-4" />
              {isCheckingIn ? 'Checking In...' : 'Mark Company as Checked In'}
            </Button>
          )}

          {assignment.companyLeftStatus ? (
            <>
              <div className="flex items-center font-semibold p-2 rounded-md bg-destructive/10 text-destructive">
                <LogOut className="mr-2 h-5 w-5" />
                Company Marked as Left
              </div>
              <Button variant="outline" onClick={handleUndoLeft} disabled={isUndoingLeft}>
                {isUndoingLeft ? 'Undoing...' : 'Undo Exit'}
              </Button>
            </>
          ) : (
            <Button variant="destructive" onClick={handleMarkLeft} disabled={isMarkingLeft}>
              <LogOut className="mr-2 h-4 w-4" />
              {isMarkingLeft ? 'Updating...' : 'Mark Company as Left'}
            </Button>
          )}
        </div>
        </CardFooter>
    </Card>
  );
}
