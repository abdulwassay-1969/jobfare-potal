
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
import { doc, serverTimestamp, writeBatch, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { Student, ProjectSpotAssignment, Project } from '@/lib/types';
import { Trash2 } from 'lucide-react';

const assignmentFormSchema = z.object({
  studentId: z.string().min(1, 'Student is required.'),
  spotNumber: z.string().min(1, 'Spot number is required.'),
  roomNumber: z.string().min(1, 'Room number is required.'),
});

type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

interface AssignStudentSpotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  existingAssignment: ProjectSpotAssignment | null;
}

export function AssignStudentSpotDialog({ open, onOpenChange, students, existingAssignment }: AssignStudentSpotDialogProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // In a multi-fair app, this would be dynamic
  const jobFairId = 'main-job-fair-2024';

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      studentId: '',
      spotNumber: '',
      roomNumber: '',
    },
  });

  useEffect(() => {
    if (existingAssignment) {
      form.reset({
        studentId: existingAssignment.studentId,
        spotNumber: existingAssignment.spotNumber,
        roomNumber: existingAssignment.roomNumber,
      });
    } else {
      form.reset({
        studentId: '',
        spotNumber: '',
        roomNumber: '',
      });
    }
  }, [existingAssignment, form]);

  const handleDelete = async () => {
    if (!existingAssignment || !db) return;
    setLoading(true);
    
    const docRef = doc(db, 'jobFairs', jobFairId, 'projectSpotAssignments', existingAssignment.id);
    
    try {
        await deleteDoc(docRef);
        toast({ title: "Assignment Deleted", description: "The spot assignment has been removed." });
        onOpenChange(false);
    } catch (err) {
        console.error(err);
        toast({ title: "Error", description: "Failed to delete assignment.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  const onSubmit = async (data: AssignmentFormValues) => {
    setLoading(true);

    const selectedStudent = students.find(s => s.id === data.studentId);
    if (!selectedStudent) {
      toast({ title: 'Error', description: 'Selected student not found.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const batch = writeBatch(db);
    const spotAssignmentData = {
      spotNumber: data.spotNumber,
      roomNumber: data.roomNumber,
      jobFairId: jobFairId,
    };

    let finalToastTitle = 'Assignment Saved!';
    let finalToastDescription = '';

    // If student has a project, assign the spot to all team members.
    if (selectedStudent.projectId) {
      const projectRef = doc(db, 'projects', selectedStudent.projectId);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        const project = projectSnap.data() as Project;
        const teamMemberIds = project.teamMemberIds || [];
        
        const membersQuery = query(collection(db, 'students'), where('__name__', 'in', teamMemberIds));
        const membersSnap = await getDocs(membersQuery);
        const teamMembers = membersSnap.docs.map(d => ({id: d.id, ...d.data()} as Student));

        for (const member of teamMembers) {
          const assignmentRef = doc(db, 'jobFairs', jobFairId, 'projectSpotAssignments', member.id);
          const assignmentData = {
            ...spotAssignmentData,
            id: member.id,
            studentId: member.id,
            studentName: member.fullName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          batch.set(assignmentRef, assignmentData, { merge: true });
        }
        finalToastTitle = 'Team Assignment Saved!';
        finalToastDescription = `Project "${project.name}" has been assigned to Spot ${data.spotNumber}.`;
      }
    } else {
      // If student has no project, just assign to them.
      const assignmentRef = doc(db, 'jobFairs', jobFairId, 'projectSpotAssignments', selectedStudent.id);
      const assignmentData = {
        ...spotAssignmentData,
        id: selectedStudent.id,
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      batch.set(assignmentRef, assignmentData, { merge: true });
      finalToastDescription = `Spot ${data.spotNumber} in room ${data.roomNumber} has been assigned to ${selectedStudent.fullName}.`;
    }
      
    batch.commit().then(() => {
        toast({ title: finalToastTitle, description: finalToastDescription });
        onOpenChange(false);
    }).catch(err => {
        const permissionError = new FirestorePermissionError({
          path: `batch write (student spot assignment)`,
          operation: 'write',
          requestResourceData: spotAssignmentData,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            title: 'Assignment Failed',
            description: 'Could not save the assignment. You may not have the required permissions.',
            variant: 'destructive',
        });
    }).finally(() => {
        setLoading(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingAssignment ? 'Edit Student Spot' : 'Assign Student Spot'}</DialogTitle>
          <DialogDescription>
            Assign a spot and room for a student to showcase their project. If the student is in a team, the whole team will be assigned.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!existingAssignment}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName} ({s.registrationNumber})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="roomNumber" render={({ field }) => (<FormItem><FormLabel>Room Number</FormLabel><FormControl><Input placeholder="e.g., Room A" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="spotNumber" render={({ field }) => (<FormItem><FormLabel>Spot Number</FormLabel><FormControl><Input placeholder="e.g., Table B-05" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2">
              {existingAssignment && (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading} className="mr-auto">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Assignment
                </Button>
              )}
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">Cancel</Button>
                <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">{loading ? 'Saving...' : 'Save Assignment'}</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
