
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
    company: false,
    student: false,
    volunteer: false,
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
      // Intentionally NOT restoring targetRoles — always start with nothing selected
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

  const groups = [
    {
      key: 'company' as const,
      label: 'Companies',
      icon: <Building className="h-4 w-4" />,
      placeholder: 'e.g., Lunch break until 2:00 PM. Booths remain open for browsing.',
    },
    {
      key: 'student' as const,
      label: 'Students',
      icon: <Users className="h-4 w-4" />,
      placeholder: 'e.g., Break time! Visit the food stalls. Recruitment resumes at 2:00 PM.',
    },
    {
      key: 'volunteer' as const,
      label: 'Volunteers',
      icon: <UserPlus className="h-4 w-4" />,
      placeholder: 'e.g., Shift rotation in progress. Report to Desk A for assignment.',
    },
  ] as const;

  const selectedCount = [targetRoles.company, targetRoles.student, targetRoles.volunteer].filter(Boolean).length;
  const isActive = eventState?.isBreakActive || false;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coffee className="h-5 w-5 text-primary" />
          Global Event Control
        </CardTitle>
        <CardDescription>
          Select groups, write a message for each, then activate the notice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* ── Per-group cards ── */}
        <div className="space-y-3">
          {groups.map(({ key, label, icon, placeholder }) => {
            const selected = targetRoles[key];
            return (
              <div
                key={key}
                className={`rounded-lg border transition-all duration-200 ${
                  selected ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 opacity-60'
                }`}
              >
                {/* Row: checkbox + group name */}
                <label className="flex items-center gap-3 p-3 cursor-pointer select-none">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(v) => setTargetRoles(prev => ({ ...prev, [key]: !!v }))}
                    disabled={loading}
                  />
                  <span className={`flex items-center gap-2 text-sm font-semibold ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {icon} {label}
                  </span>
                  {selected && (
                    <span className="ml-auto text-xs text-primary font-medium">Will receive notice</span>
                  )}
                </label>

                {/* Message input — only when selected */}
                {selected && (
                  <div className="px-3 pb-3">
                    <Input
                      placeholder={placeholder}
                      value={messages[key]}
                      onChange={(e) => setMessages(prev => ({ ...prev, [key]: e.target.value }))}
                      disabled={loading}
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5 ml-1">
                      This message will appear as a banner on the {label.toLowerCase()} dashboard.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedCount === 0 && (
          <p className="text-sm text-destructive text-center py-1">
            Select at least one group to send a notice.
          </p>
        )}

        <Separator />

        {/* ── Break toggle ── */}
        <div className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
          isActive ? 'border-primary bg-primary/10' : 'bg-muted/30'
        }`}>
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">
              {isActive ? '🔴 Break is Active' : '⚪ Break is Inactive'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isActive
                ? `Showing notice to: ${[targetRoles.company && 'Companies', targetRoles.student && 'Students', targetRoles.volunteer && 'Volunteers'].filter(Boolean).join(', ') || '—'}`
                : `Will notify ${selectedCount} group${selectedCount !== 1 ? 's' : ''} when activated.`}
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={handleToggleBreak}
            disabled={loading || selectedCount === 0}
          />
        </div>

        <Button onClick={handleUpdateMessages} disabled={loading || selectedCount === 0} className="w-full">
          <Send className="mr-2 h-4 w-4" /> Save Messages &amp; Settings
        </Button>
      </CardContent>
    </Card>
  );
}
