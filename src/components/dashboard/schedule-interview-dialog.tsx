'use client';
import { useState, useEffect, useMemo } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertCircle, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp, query, where } from 'firebase/firestore';
import { Student, Interview, Project } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const interviewFormSchema = z.object({
  date: z.date({ required_error: 'A date is required.' }),
  hour: z.string({ required_error: "Hour is required." }),
  minute: z.string({ required_error: "Minute is required." }),
  ampm: z.enum(['AM', 'PM'], { required_error: "AM/PM is required." }),
  location: z.string().min(1, 'Location/Room is required.'),
  interviewerName: z.string().min(2, 'Interviewer name is required.'),
});

type InterviewFormValues = z.infer<typeof interviewFormSchema>;

interface ScheduleInterviewDialogProps {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleInterviewDialog({ student, open, onOpenChange }: ScheduleInterviewDialogProps) {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [isCompanyDataLoading, setIsCompanyDataLoading] = useState(true);
    const [teamMemberIds, setTeamMemberIds] = useState<string[]>(student.id ? [student.id] : []);

  const jobFairId = "main-job-fair-2024"; 

  const form = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: {
      date: new Date(),
    },
  });

  const selectedDate = form.watch('date');
  const selectedHour = form.watch('hour');
  const selectedMinute = form.watch('minute');
  const selectedAmPm = form.watch('ampm');

    const safeTeamMemberIds = useMemo(() => {
        const sourceIds = Array.isArray(teamMemberIds) ? teamMemberIds : [];
        const normalized = sourceIds.filter((id): id is string => typeof id === 'string' && Boolean(id));
        return Array.from(new Set(normalized)).slice(0, 10);
    }, [teamMemberIds]);

    const getInterviewDate = (value: unknown): Date | null => {
        if (!value) return null;
        if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
            return (value as any).toDate();
        }
        if (value instanceof Date) return value;
        return null;
    };

  // --- Availability Data Fetching ---
  
  // 1. Get all interviews for this student (or their team)
  const studentInterviewsQuery = useMemoFirebase(() => {
        if (!firestore || !open || safeTeamMemberIds.length === 0) return null;
        try {
            return query(collection(firestore, 'interviews'), where('studentId', 'in', safeTeamMemberIds));
        } catch {
            return null;
        }
    }, [firestore, open, safeTeamMemberIds]);

  // 2. Get all interviews for this company
  const companyInterviewsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !open) return null;
    return query(collection(firestore, 'interviews'), where('companyId', '==', user.uid));
  }, [firestore, user, open]);

  const { data: studentInterviews } = useCollection<Interview>(studentInterviewsQuery);
  const { data: companyInterviews } = useCollection<Interview>(companyInterviewsQuery);

  useEffect(() => {
    if (!user || !firestore || !open) return;
    
    setIsCompanyDataLoading(true);
    const companyDocRef = doc(firestore, 'companies', user.uid);
    const roomAssignmentDocRef = doc(firestore, 'jobFairs', jobFairId, 'roomAssignments', user.uid);

    const fetchData = async () => {
        try {
            const [companySnap, roomSnap] = await Promise.all([
                getDoc(companyDocRef),
                getDoc(roomAssignmentDocRef)
            ]);

            let companyData: any = {};
            if (companySnap.exists()) {
                companyData = companySnap.data();
                setCompanyName(companyData.companyName);
            }

            let roomData: any = {};
            if (roomSnap.exists()) {
                roomData = roomSnap.data();
            }

            // If student has a project, find team members
            if (student.projectId) {
                const projectSnap = await getDoc(doc(firestore, 'projects', student.projectId));
                if (projectSnap.exists()) {
                    const fetchedTeamIds = (projectSnap.data() as Project).teamMemberIds;
                    if (Array.isArray(fetchedTeamIds) && fetchedTeamIds.length > 0) {
                        setTeamMemberIds(
                          fetchedTeamIds.filter((id): id is string => typeof id === 'string' && Boolean(id))
                        );
                    } else if (student.id) {
                        setTeamMemberIds([student.id]);
                    } else {
                        setTeamMemberIds([]);
                    }
                }
            }

            form.reset({
                date: new Date(),
                interviewerName: companyData.hrName || user.displayName || '',
                location: roomData.roomNumber || '',
                hour: undefined,
                minute: undefined,
                ampm: undefined
            });
        } catch (error) {
            console.error("Error fetching dialog data:", error);
        } finally {
            setIsCompanyDataLoading(false);
        }
    };

    fetchData();
  }, [user, firestore, open, student.projectId, jobFairId]);

  // --- Conflict Detection ---
  const conflicts = useMemo(() => {
    if (!selectedDate || !selectedHour || !selectedMinute || !selectedAmPm) return null;

    const proposedStart = new Date(selectedDate);
    let hours = parseInt(selectedHour, 10);
    const minutes = parseInt(selectedMinute, 10);
    if (selectedAmPm === 'PM' && hours < 12) hours += 12;
    if (selectedAmPm === 'AM' && hours === 12) hours = 0;
    proposedStart.setHours(hours, minutes, 0, 0);
    const proposedEnd = new Date(proposedStart.getTime() + 30 * 60000);

    const checkOverlap = (existing: Interview) => {
        const start = getInterviewDate(existing.startTime);
        const end = getInterviewDate(existing.endTime);
        if (!start || !end) return false;
        return (proposedStart < end && proposedEnd > start) && existing.status !== 'Canceled';
    };

    const studentConflict = studentInterviews?.find(checkOverlap);
    const companyConflict = companyInterviews?.find(checkOverlap);

    return {
        student: studentConflict,
        company: companyConflict
    };
  }, [selectedDate, selectedHour, selectedMinute, selectedAmPm, studentInterviews, companyInterviews]);

  const onSubmit = async (data: InterviewFormValues) => {
    if (!user || !firestore || !companyName) return;
    if (conflicts?.student || conflicts?.company) {
        toast({ title: "Conflict Detected", description: "This slot is no longer available.", variant: "destructive" });
        return;
    }

    setLoading(true);

    try {
        const interviewDateTime = new Date(data.date);
        let hours = parseInt(data.hour, 10);
        const minutes = parseInt(data.minute, 10);
        if (data.ampm === 'PM' && hours < 12) hours += 12;
        if (data.ampm === 'AM' && hours === 12) hours = 0;
        interviewDateTime.setHours(hours, minutes, 0, 0);

        const interviewData = {
          studentId: student.id,
          studentName: student.fullName,
          companyId: user.uid,
          companyName: companyName,
          jobFairId: jobFairId,
          interviewerName: data.interviewerName,
          startTime: Timestamp.fromDate(interviewDateTime),
          endTime: Timestamp.fromDate(new Date(interviewDateTime.getTime() + 30 * 60000)),
          location: data.location,
          status: 'Scheduled' as const,
          createdAt: serverTimestamp(),
        };

        await addDoc(collection(firestore, 'interviews'), interviewData);

        // Notify parties
        await addDoc(collection(firestore, 'userProfiles', student.id, 'notifications'), {
            recipientUserProfileId: student.id,
            title: `New Interview Invitation`,
            message: `${companyName} has invited you to an interview on ${format(interviewDateTime, 'PPP')} at ${format(interviewDateTime, 'p')}.`,
            type: 'interview_invitation',
            targetUrl: '/dashboard/interviews',
            isRead: false,
            sentAt: serverTimestamp(),
            createdAt: serverTimestamp()
        });

        toast({ title: 'Interview Scheduled!', description: `Interview set with ${student.fullName}.` });
        onOpenChange(false);
        form.reset();
    } catch (serverError: any) {
        const permissionError = new FirestorePermissionError({
          path: 'interviews',
          operation: 'create',
          requestResourceData: { studentId: student.id, companyId: user.uid },
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setLoading(false);
    }
  };

  const studentDayInterviews = useMemo(() => {
            return studentInterviews?.filter(i => {
                const start = getInterviewDate(i.startTime);
                return start ? isSameDay(start, selectedDate) : false;
            })
                .sort((a, b) => {
                    const aTime = getInterviewDate(a.startTime)?.getTime() ?? 0;
                    const bTime = getInterviewDate(b.startTime)?.getTime() ?? 0;
                    return aTime - bTime;
                }) || [];
  }, [studentInterviews, selectedDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Interview with {student.fullName}</DialogTitle>
          <DialogDescription>
            Select a time. We'll check for conflicts with the student's existing schedule.
          </DialogDescription>
        </DialogHeader>
        
        {isCompanyDataLoading ? (
            <div className="space-y-4 py-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                                    {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div className="grid grid-cols-3 gap-2">
                            <FormField
                                control={form.control}
                                name="hour"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hour</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="HH" /></SelectTrigger></FormControl>
                                            <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(h => (<SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}</SelectItem>))}</SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="minute"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Min</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="MM" /></SelectTrigger></FormControl>
                                            <SelectContent>{['00', '15', '30', '45'].map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ampm"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>AM/PM</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="-" /></SelectTrigger></FormControl>
                                            <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Location / Room</FormLabel><FormControl><Input placeholder="e.g., Room 101" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="interviewerName" render={({ field }) => (<FormItem><FormLabel>Interviewer Name</FormLabel><FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />

                        {conflicts?.student && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Student Busy</AlertTitle>
                                <AlertDescription>The student/group is already booked at this time.</AlertDescription>
                            </Alert>
                        )}
                        {conflicts?.company && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Company Busy</AlertTitle>
                                <AlertDescription>You already have another interview scheduled at this time.</AlertDescription>
                            </Alert>
                        )}

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading || !!conflicts?.student || !!conflicts?.company}>
                                {loading ? "Scheduling..." : "Confirm Schedule"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>

                <div className="border-l pl-6 space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Student Schedule ({selectedDate ? format(selectedDate, 'MMM d') : 'N/A'})</h4>
                    <div className="space-y-2">
                        {studentDayInterviews.length > 0 ? (
                            studentDayInterviews.map((interview) => (
                                <div key={interview.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50 border">
                                    <span className="font-medium">{(() => {
                                      const start = getInterviewDate(interview.startTime);
                                      return start ? format(start, 'p') : 'Invalid time';
                                    })()}</span>
                                    <Badge variant="secondary" className="text-[10px]">Booked</Badge>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground py-4 text-center">No interviews scheduled for this student today.</p>
                        )}
                    </div>
                    <div className="pt-4 border-t">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Availability Hint</p>
                        <p className="text-xs text-muted-foreground mt-1">Interviews are typically 30 minutes long. Ensure slots do not overlap.</p>
                    </div>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
