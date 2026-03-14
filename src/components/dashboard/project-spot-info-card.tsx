
'use client';

import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { ProjectSpotAssignment } from '@/lib/types';
import { LayoutGrid, MapPin, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ProjectSpotInfoCard({ studentId }: { studentId: string }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isMarking, setIsMarking] = useState(false);
  
  // In a multi-fair setup, this would be dynamic
  const jobFairId = 'main-job-fair-2024';

  const assignmentRef = useMemoFirebase(() => {
    if (!db || !studentId) return null;
    return doc(db, 'jobFairs', jobFairId, 'projectSpotAssignments', studentId);
  }, [db, studentId, jobFairId]);

  const { data: assignment, isLoading } = useDoc<ProjectSpotAssignment>(assignmentRef);

  const handleMarkPresent = async () => {
    if (!db || !assignment) return;
    setIsMarking(true);

    const docRef = doc(db, 'jobFairs', jobFairId, 'projectSpotAssignments', studentId);
    const dataToUpdate = {
      checkedIn: true,
      checkedInAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
        await updateDoc(docRef, dataToUpdate);
        toast({
          title: "Presence Confirmed!",
          description: "You have been marked as present at your spot.",
        });
    } catch (serverError: any) {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            title: "Check-in Failed",
            description: "An error occurred while confirming your presence.",
            variant: "destructive"
        });
    } finally {
        setIsMarking(false);
    }
  };

  return (
    <Card className="border-primary/20 overflow-hidden h-full flex flex-col shadow-sm">
      <CardHeader className="bg-primary/5 pb-4">
        <CardTitle className="flex items-center gap-2 text-primary font-bold">
          <LayoutGrid className="h-5 w-5" />
          Location & Attendance
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 flex-grow">
        {!isLoading && !assignment ? (
            <Alert variant="default" className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">No Spot Assigned</AlertTitle>
                <AlertDescription className="text-yellow-700 text-sm">
                    You haven't been assigned to a project spot yet. Check back soon!
                </AlertDescription>
            </Alert>
        ) : (
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Room
                    </p>
                    {isLoading ? (
                        <Skeleton className="h-10 w-24 mt-1" />
                    ) : (
                        <p className="text-4xl font-black text-foreground">{assignment?.roomNumber || 'TBD'}</p>
                    )}
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1">
                        <LayoutGrid className="h-3 w-3" /> Spot
                    </p>
                    {isLoading ? (
                        <Skeleton className="h-10 w-24 mt-1" />
                    ) : (
                        <p className="text-4xl font-black text-foreground">{assignment?.spotNumber || 'TBD'}</p>
                    )}
                </div>
            </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/30 border-t py-4 mt-auto">
        {isLoading ? (
          <Skeleton className="h-11 w-full" />
        ) : !assignment ? (
            <p className="text-sm text-muted-foreground text-center w-full italic">Assignment Pending</p>
        ) : assignment.checkedIn ? (
          <div className="flex items-center justify-center gap-2 text-green-700 font-bold w-full bg-green-50 py-3 rounded-md border border-green-200">
            <CheckCircle2 className="h-5 w-5" />
            Confirmed at Spot
          </div>
        ) : (
          <Button onClick={handleMarkPresent} disabled={isMarking} className="w-full h-11 text-base font-bold shadow-md hover:shadow-lg transition-all" size="lg">
            <UserCheck className="mr-2 h-5 w-5" />
            I am at my Spot
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
