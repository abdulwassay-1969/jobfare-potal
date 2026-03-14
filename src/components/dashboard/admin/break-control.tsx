
'use client';

import React, { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { EventState } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Coffee, Send, Users, Building, UserPlus } from 'lucide-react';

export function BreakControl() {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState({
    company: '',
    student: '',
    volunteer: ''
  });

  const eventStateRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, 'eventState', 'status');
  }, [db]);

  const { data: eventState } = useDoc<EventState>(eventStateRef);

  useEffect(() => {
    if (eventState) {
      setMessages({
        company: eventState.messages?.company || '',
        student: eventState.messages?.student || '',
        volunteer: eventState.messages?.volunteer || ''
      });
    }
  }, [eventState]);

  const handleToggleBreak = async (checked: boolean) => {
    if (!db) return;
    setLoading(true);

    const dataToUpdate = {
      isBreakActive: checked,
      messages: {
        company: messages.company || "The event is currently on a break. Recruitment activities will resume shortly.",
        student: messages.student || "Break time! Take a moment to relax. Recruitment resumes shortly.",
        volunteer: messages.volunteer || "Break active. Please check in with your supervisor for coordination."
      },
      updatedAt: serverTimestamp(),
    };

    setDoc(doc(db, 'eventState', 'status'), dataToUpdate, { merge: true })
      .then(() => {
        toast({
          title: checked ? "Global Break Activated" : "Break Ended",
          description: checked ? "All portals now show targeted break notices." : "Normal activity has resumed.",
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'eventState/status',
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setLoading(false));
  };

  const handleUpdateMessages = async () => {
    if (!db) return;
    setLoading(true);

    const dataToUpdate = {
      messages: messages,
      updatedAt: serverTimestamp(),
    };

    setDoc(doc(db, 'eventState', 'status'), dataToUpdate, { merge: true })
      .then(() => {
        toast({
          title: "Messages Updated",
          description: "Break notices have been updated for all roles.",
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'eventState/status',
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setLoading(false));
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coffee className="h-5 w-5 text-primary" />
          Global Event Control
        </CardTitle>
        <CardDescription>
          Activate event-wide break and send targeted instructions to Companies, Students, and Volunteers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="space-y-0.5">
            <Label className="text-base">Activate Break Status</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, everyone will see their respective break messages.
            </p>
          </div>
          <Switch
            checked={eventState?.isBreakActive || false}
            onCheckedChange={handleToggleBreak}
            disabled={loading}
          />
        </div>

        <div className="grid gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-primary font-bold">
                <Building className="h-4 w-4" /> Message for Companies
            </Label>
            <Input
              placeholder="e.g., Lunch break until 2:00 PM. Booths remain open for browsing."
              value={messages.company}
              onChange={(e) => setMessages(prev => ({ ...prev, company: e.target.value }))}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-primary font-bold">
                <Users className="h-4 w-4" /> Message for Students
            </Label>
            <Input
              placeholder="e.g., Break time! Visit the food stalls. Recruitment resumes at 2:00 PM."
              value={messages.student}
              onChange={(e) => setMessages(prev => ({ ...prev, student: e.target.value }))}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-primary font-bold">
                <UserPlus className="h-4 w-4" /> Message for Volunteers
            </Label>
            <Input
              placeholder="e.g., Shift rotation in progress. Report to Desk A for assignment."
              value={messages.volunteer}
              onChange={(e) => setMessages(prev => ({ ...prev, volunteer: e.target.value }))}
              disabled={loading}
            />
          </div>
        </div>

        <Button onClick={handleUpdateMessages} disabled={loading} className="w-full">
          <Send className="mr-2 h-4 w-4" /> Update All Messages
        </Button>
      </CardContent>
    </Card>
  );
}
