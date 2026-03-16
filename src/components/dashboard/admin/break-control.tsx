
'use client';

import React, { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { EventState } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
  const [targetRoles, setTargetRoles] = useState({
    company: true,
    student: true,
    volunteer: true,
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
      setTargetRoles({
        company: eventState.targetRoles?.company ?? true,
        student: eventState.targetRoles?.student ?? true,
        volunteer: eventState.targetRoles?.volunteer ?? true,
      });
    }
  }, [eventState]);

  const persist = async (patch: object) => {
    if (!db) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'eventState', 'status'), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
    } catch {
      const permissionError = new FirestorePermissionError({
        path: 'eventState/status',
        operation: 'update',
        requestResourceData: patch,
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBreak = async (checked: boolean) => {
    const noGroupSelected = !targetRoles.company && !targetRoles.student && !targetRoles.volunteer;
    if (checked && noGroupSelected) {
      toast({
        title: 'Select at least one group',
        description: 'Choose Companies, Students, or Volunteers before activating the break.',
        variant: 'destructive',
      });
      return;
    }
    await persist({
      isBreakActive: checked,
      targetRoles,
      messages: {
        company: messages.company || 'The event is currently on a break. Recruitment activities will resume shortly.',
        student: messages.student || 'Break time! Take a moment to relax. Recruitment resumes shortly.',
        volunteer: messages.volunteer || 'Break active. Please check in with your supervisor for coordination.',
      },
    });
    toast({
      title: checked ? 'Break Activated' : 'Break Ended',
      description: checked
        ? `Visible to: ${[targetRoles.company && 'Companies', targetRoles.student && 'Students', targetRoles.volunteer && 'Volunteers'].filter(Boolean).join(', ')}.`
        : 'Normal activity has resumed for all groups.',
    });
  };

  const handleUpdateMessages = async () => {
    await persist({ messages, targetRoles });
    toast({
      title: 'Settings Saved',
      description: 'Messages and target groups have been updated.',
    });
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

        {/* ── Target Groups ── */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Send to</Label>
          <p className="text-sm text-muted-foreground -mt-2">Choose which groups will see the break notice.</p>
          <div className="grid grid-cols-3 gap-3">
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                targetRoles.company ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
              }`}
            >
              <Checkbox
                checked={targetRoles.company}
                onCheckedChange={(v) => setTargetRoles(prev => ({ ...prev, company: !!v }))}
                disabled={loading}
              />
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Building className="h-4 w-4" /> Companies
              </span>
            </label>
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                targetRoles.student ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
              }`}
            >
              <Checkbox
                checked={targetRoles.student}
                onCheckedChange={(v) => setTargetRoles(prev => ({ ...prev, student: !!v }))}
                disabled={loading}
              />
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Users className="h-4 w-4" /> Students
              </span>
            </label>
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                targetRoles.volunteer ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
              }`}
            >
              <Checkbox
                checked={targetRoles.volunteer}
                onCheckedChange={(v) => setTargetRoles(prev => ({ ...prev, volunteer: !!v }))}
                disabled={loading}
              />
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <UserPlus className="h-4 w-4" /> Volunteers
              </span>
            </label>
          </div>
        </div>

        <Separator />

        {/* ── Break toggle ── */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="space-y-0.5">
            <Label className="text-base">Activate Break Status</Label>
            <p className="text-sm text-muted-foreground">
              Only the selected groups above will see the break notice.
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
