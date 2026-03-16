'use client';

import React from 'react';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Volunteer } from '@/lib/types';
import { ClipboardCheck, Clock } from 'lucide-react';

export function VolunteerRoleCard({ volunteerId }: { volunteerId: string }) {
  const db = useFirestore();

  const volunteerRef = useMemoFirebase(() => {
    if (!db || !volunteerId) return null;
    return doc(db, 'volunteers', volunteerId);
  }, [db, volunteerId]);

  const { data: volunteer, isLoading } = useDoc<Volunteer>(volunteerRef);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Your Role
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border bg-muted/30 p-4 space-y-1">
          <p className="text-sm font-semibold">Assigned Role</p>
          {isLoading ? (
            <Skeleton className="h-6 w-32 mt-1" />
          ) : volunteer?.assignedRole ? (
            <p className="text-lg font-bold text-primary">{volunteer.assignedRole}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Not assigned yet.</p>
          )}
        </div>
        <div className="rounded-md border bg-muted/30 p-4 space-y-1">
          <p className="text-sm font-semibold">Shift Time</p>
          {isLoading ? (
            <Skeleton className="h-6 w-24 mt-1" />
          ) : volunteer?.assignedShift ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {volunteer.assignedShift}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">To be announced.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
