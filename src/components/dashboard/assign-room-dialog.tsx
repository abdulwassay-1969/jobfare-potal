'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Company, Volunteer, RoomAssignment } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

const assignmentFormSchema = z.object({
  companyId: z.string().min(1, 'Company is required.'),
  volunteerId: z.string().optional(),
  roomNumber: z.string().min(1, 'Room number is required.'),
});

type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

interface AssignRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  volunteers: Volunteer[];
  existingAssignment: RoomAssignment | null;
}

export function AssignRoomDialog({ open, onOpenChange, companies, volunteers, existingAssignment }: AssignRoomDialogProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // In a multi-fair app, this would be dynamic
  const jobFairId = 'main-job-fair-2024';

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      companyId: '',
      volunteerId: '',
      roomNumber: '',
    },
  });

  useEffect(() => {
    if (existingAssignment) {
      form.reset({
        companyId: existingAssignment.companyId,
        volunteerId: existingAssignment.volunteerId || '',
        roomNumber: existingAssignment.roomNumber,
      });
    } else {
      form.reset({
        companyId: '',
        volunteerId: '',
        roomNumber: '',
      });
    }
  }, [existingAssignment, form]);

  const onSubmit = (data: AssignmentFormValues) => {
    setLoading(true);

    const selectedCompany = companies.find(c => c.id === data.companyId);
    if (!selectedCompany) {
      toast({ title: 'Error', description: 'Selected company not found.', variant: 'destructive' });
      setLoading(false);
      return;
    }
    const selectedVolunteer = volunteers.find(v => v.id === data.volunteerId);

    const assignmentId = existingAssignment ? existingAssignment.id : selectedCompany.id;
    const docRef = doc(db, 'jobFairs', jobFairId, 'roomAssignments', assignmentId);
    
    let assignmentData: Partial<RoomAssignment> & { createdAt?: any, updatedAt?: any } = {
      companyId: selectedCompany.id,
      companyName: selectedCompany.companyName,
      volunteerId: selectedVolunteer?.id || '',
      volunteerName: selectedVolunteer?.fullName || '',
      roomNumber: data.roomNumber,
      jobFairId: jobFairId,
      checkInStatus: existingAssignment?.checkInStatus || false,
    };

    if (existingAssignment) {
      assignmentData.updatedAt = serverTimestamp();
    } else {
      assignmentData.createdAt = serverTimestamp();
    }
    
    setDoc(docRef, assignmentData, { merge: true })
      .then(() => {
        toast({
          title: 'Assignment Saved!',
          description: `Room ${data.roomNumber} has been assigned to ${selectedCompany.companyName}.`,
        });
        onOpenChange(false);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: existingAssignment ? 'update' : 'create',
          requestResourceData: assignmentData,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingAssignment ? 'Edit Assignment' : 'Create New Assignment'}</DialogTitle>
          <DialogDescription>
            Assign a room and a volunteer to a company for the job fair.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!existingAssignment}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="volunteerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Volunteer (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a volunteer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {volunteers.map(v => <SelectItem key={v.id} value={v.id}>{v.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="roomNumber" render={({ field }) => (<FormItem><FormLabel>Room Number</FormLabel><FormControl><Input placeholder="e.g., A-101" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
