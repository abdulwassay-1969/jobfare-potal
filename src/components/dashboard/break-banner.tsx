
'use client';

import React from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { EventState } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Coffee } from 'lucide-react';

export function BreakBanner() {
  const db = useFirestore();
  const { role } = useAuth();
  
  const eventStateRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, 'eventState', 'status');
  }, [db]);

  const { data: eventState, isLoading } = useDoc<EventState>(eventStateRef);

  if (isLoading || !eventState?.isBreakActive || !role) {
    return null;
  }

  // Check if this role is targeted
  const targeted = eventState.targetRoles
    ? (role === 'student' && eventState.targetRoles.student) ||
      (role === 'company' && eventState.targetRoles.company) ||
      (role === 'volunteer' && eventState.targetRoles.volunteer)
    : true; // fallback: show to everyone if targetRoles not set (old data)

  if (!targeted) {
    return null;
  }

  // Determine which message to show based on the user's role
  let roleMessage = "The event is currently on a break. Recruitment activities will resume shortly.";
  
  if (eventState.messages) {
      if (role === 'student') roleMessage = eventState.messages.student;
      else if (role === 'company') roleMessage = eventState.messages.company;
      else if (role === 'volunteer') roleMessage = eventState.messages.volunteer;
  }

  return (
    <Alert
      variant="destructive"
      className="mb-6 bg-destructive/10 shadow-md animate-in fade-in slide-in-from-top-4 duration-500"
    >
      <Coffee className="h-5 w-5" />
      <AlertTitle className="font-bold">Event on Break</AlertTitle>
      <AlertDescription className="text-foreground/80 font-medium">
        {roleMessage}
      </AlertDescription>
    </Alert>
  );
}
