'use client';

import React from 'react';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { RoomAssignment } from '@/lib/types';
import { MapPin, User } from 'lucide-react';

export function RoomInfoCard({ companyId }: { companyId: string }) {
  const db = useFirestore();
  
  // In a multi-fair setup, this would be dynamic.
  const jobFairId = 'main-job-fair-2024';

  const assignmentRef = useMemoFirebase(() => {
    if (!db || !companyId) return null;
    // The document ID for a company's room assignment is the company's UID.
    return doc(db, 'jobFairs', jobFairId, 'roomAssignments', companyId);
  }, [db, companyId]);

  const { data: assignment, isLoading } = useDoc<RoomAssignment>(assignmentRef);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Room & Volunteer Info
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-semibold">Your Room</p>
          {isLoading ? (
            <Skeleton className="h-6 w-16 mt-1" />
          ) : assignment ? (
            <p className="text-2xl font-bold text-primary">{assignment.roomNumber}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Not assigned yet.</p>
          )}
        </div>
        <div>
          <p className="font-semibold">Assigned Volunteer</p>
          {isLoading ? (
             <Skeleton className="h-6 w-24 mt-1" />
          ) : assignment?.volunteerName ? (
             <p className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              {assignment.volunteerName}
            </p>
          ) : (
             <p className="text-sm text-muted-foreground">Not assigned yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
