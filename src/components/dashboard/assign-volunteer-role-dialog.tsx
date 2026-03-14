'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { Volunteer, volunteerRoles } from '@/lib/types';
import { volunteerAssignmentSchema, VolunteerAssignmentFormValues } from '@/lib/schemas';

interface AssignVolunteerRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteer: Volunteer | null;
}

export function AssignVolunteerRoleDialog({ open, onOpenChange, volunteer }: AssignVolunteerRoleDialogProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<VolunteerAssignmentFormValues>({
    resolver: zodResolver(volunteerAssignmentSchema),
    defaultValues: {
      assignedRole: undefined,
      assignedShift: '',
    },
  });

  useEffect(() => {
    if (volunteer) {
      form.reset({
        assignedRole: volunteer.assignedRole as any, // Cast because enum might not match string
        assignedShift: volunteer.assignedShift || '',
      });
    }
  }, [volunteer, form]);

  const onSubmit = (data: VolunteerAssignmentFormValues) => {
    if (!volunteer || !db) return;
    setLoading(true);

    const batch = writeBatch(db);
    const volunteerRef = doc(db, 'volunteers', volunteer.id);

    const volunteerUpdateData = {
      assignedRole: data.assignedRole,
      assignedShift: data.assignedShift,
      updatedAt: serverTimestamp(),
    };
    batch.update(volunteerRef, volunteerUpdateData);

    // If a shift is assigned, create/update the shift document
    // This is crucial for the scanner to find the document to mark attendance.
    if (data.assignedShift && data.assignedShift.trim() !== '') {
        const shiftId = `${volunteer.id}_${data.assignedShift.replace(/\s+/g, '-')}`;
        const shiftRef = doc(db, 'jobFairs', volunteer.jobFairId || 'main-job-fair-2024', 'volunteerShifts', shiftId);
        
        const shiftData = {
            id: shiftId,
            volunteerId: volunteer.id,
            jobFairId: volunteer.jobFairId || 'main-job-fair-2024',
            shiftName: data.assignedShift,
            startTime: null, // These can be added if needed
            endTime: null,
            location: 'N/A',
            isAttended: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        batch.set(shiftRef, shiftData, { merge: true });
    }
    
    batch.commit()
      .then(() => {
        toast({
          title: 'Assignment Saved!',
          description: `${volunteer.fullName} has been assigned as ${data.assignedRole}.`,
        });
        onOpenChange(false);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: `batch write for volunteer ${volunteer.id}`,
          operation: 'write',
          requestResourceData: { volunteerUpdateData },
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            title: 'Assignment Failed',
            description: 'Could not save the assignment. You may not have the required permissions.',
            variant: 'destructive',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (!volunteer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Role to {volunteer.fullName}</DialogTitle>
          <DialogDescription>
            Assign a specific role and shift time to this volunteer. This will be reflected on their dashboard and badge.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="assignedRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {volunteerRoles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="assignedShift" render={({ field }) => (<FormItem><FormLabel>Shift Time (e.g., 9am-1pm)</FormLabel><FormControl><Input placeholder="e.g., 9am - 1pm" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Assignment'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
