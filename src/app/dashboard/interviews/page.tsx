'use client';

import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, Timestamp, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, User, Building, Clock, MapPin, MoreVertical, ArrowLeft, CalendarIcon, Search, CheckCircle2, CalendarDays, CalendarX2 } from 'lucide-react';
import { Interview } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DatePickerCalendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';

const statusColors: Record<Interview['status'], string> = {
    Scheduled: 'border-blue-500/80 bg-blue-500/10 text-blue-700 dark:text-blue-400',
    Completed: 'border-green-500/80 bg-green-500/10 text-green-700 dark:text-green-400',
    Canceled: 'border-red-500/80 bg-red-500/10 text-red-700 dark:text-red-400',
    'No Show': 'border-gray-500/80 bg-gray-500/10 text-gray-700 dark:text-gray-400',
};

const rescheduleFormSchema = z.object({
  date: z.date({ required_error: 'A date is required.' }),
  hour: z.string({ required_error: 'Hour is required.' }),
  minute: z.string({ required_error: 'Minute is required.' }),
  ampm: z.enum(['AM', 'PM'], { required_error: 'AM/PM is required.' }),
});

type RescheduleFormValues = z.infer<typeof rescheduleFormSchema>;

type StatusFilter = 'All' | Interview['status'];
type TimeFilter = 'All Time' | 'Today' | 'Upcoming' | 'Past';


export default function InterviewsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [isEditTimeDialogOpen, setIsEditTimeDialogOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('All Time');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeInterviewIds, setActiveInterviewIds] = useState<Record<string, boolean>>({});

  const rescheduleForm = useForm<RescheduleFormValues>({
    resolver: zodResolver(rescheduleFormSchema),
    defaultValues: {
      date: new Date(),
      hour: '09',
      minute: '00',
      ampm: 'AM',
    },
  });

  const interviewsQuery = useMemoFirebase(() => {
    if (!db || !user || !role) return null;
    
    const interviewsRef = collection(db, 'interviews');

    if (role === 'student') {
      return query(interviewsRef, where('studentId', '==', user.uid));
    }
    if (role === 'company') {
      return query(interviewsRef, where('companyId', '==', user.uid));
    }
     if (role === 'admin') {
      return interviewsRef;
    }
    return null;
  }, [db, user, role]);

  const { data: interviews, isLoading: interviewsLoading, error } = useCollection<Interview>(interviewsQuery);

  const isLoading = authLoading || interviewsLoading;

  const getInterviewDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
      return (value as any).toDate();
    }
    if (value instanceof Date) return value;
    return null;
  };

  const handleStatusUpdate = async (interviewId: string, status: Interview['status']) => {
    if (!db) return;
    const interviewRef = doc(db, 'interviews', interviewId);
    const dataToUpdate = { status };
    try {
      await updateDoc(interviewRef, dataToUpdate);
      toast({
        title: 'Interview Status Updated',
        description: `The interview is now marked as ${status}.`,
      });
      if (status === 'Completed') {
        setActiveInterviewIds((previous) => {
          const next = { ...previous };
          delete next[interviewId];
          return next;
        });
      }
    } catch (serverError: any) {
        const permissionError = new FirestorePermissionError({
          path: interviewRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          title: 'Update Failed',
          description: 'You do not have permission to update this interview.',
          variant: 'destructive'
        })
    }
  };

  const handleStartInterview = (interview: Interview) => {
    setActiveInterviewIds((previous) => ({
      ...previous,
      [interview.id]: true,
    }));

    toast({
      title: 'Interview started',
      description: `Started with ${interview.studentName}. Use Mark Complete when done.`,
    });
  };

  const sortedInterviews = useMemo(() => {
    if (!interviews) return [];
    return [...interviews].sort((a, b) => {
      const aDate = getInterviewDate(a.startTime)?.getTime() ?? 0;
      const bDate = getInterviewDate(b.startTime)?.getTime() ?? 0;
      return bDate - aDate;
    });
  }, [interviews]);

  const filteredInterviews = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return sortedInterviews.filter((interview) => {
      if (statusFilter !== 'All' && interview.status !== statusFilter) return false;

      const startDate = getInterviewDate(interview.startTime);
      if (timeFilter !== 'All Time' && startDate) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        if (timeFilter === 'Today' && !(startDate >= todayStart && startDate < tomorrowStart)) {
          return false;
        }

        if (timeFilter === 'Upcoming' && startDate < tomorrowStart) {
          return false;
        }

        if (timeFilter === 'Past' && startDate >= todayStart) {
          return false;
        }
      } else if (timeFilter !== 'All Time' && !startDate) {
        return false;
      }

      if (!normalizedSearch) return true;

      const searchable = [
        interview.studentName,
        interview.companyName,
        interview.interviewerName,
        interview.location,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [sortedInterviews, searchTerm, statusFilter, timeFilter]);

  const stats = useMemo(() => {
    const total = sortedInterviews.length;
    const scheduled = sortedInterviews.filter((item) => item.status === 'Scheduled').length;
    const completed = sortedInterviews.filter((item) => item.status === 'Completed').length;
    const noShow = sortedInterviews.filter((item) => item.status === 'No Show').length;

    return { total, scheduled, completed, noShow };
  }, [sortedInterviews]);

  const handleRecallStudent = async (interview: Interview) => {
    if (!db) return;

    const interviewRef = doc(db, 'interviews', interview.id);
    const interviewDate = getInterviewDate(interview.startTime);
    const interviewTimeText = interviewDate
      ? `${interviewDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${interviewDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
      : 'the scheduled time';

    try {
      await updateDoc(interviewRef, { status: 'Scheduled' });

      try {
        await addDoc(collection(db, 'userProfiles', interview.studentId, 'notifications'), {
          recipientUserProfileId: interview.studentId,
          title: 'Interview Recall',
          message: `${interview.companyName} recalled your interview for ${interviewTimeText}.`,
          type: 'interview_recall',
          targetUrl: '/dashboard/interviews',
          isRead: false,
          sentAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } catch (notificationError) {
        console.warn('Recall notification could not be created:', notificationError);
      }

      toast({
        title: 'Recall sent',
        description: `${interview.studentName} has been recalled for this interview.`,
      });
    } catch (serverError: any) {
      const permissionError = new FirestorePermissionError({
        path: interviewRef.path,
        operation: 'update',
        requestResourceData: { status: 'Scheduled' },
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        title: 'Recall failed',
        description: 'Could not recall this interview due to permissions.',
        variant: 'destructive',
      });
    }
  };

  const openEditTimeDialog = (interview: Interview) => {
    const startDate = getInterviewDate(interview.startTime) ?? new Date();
    let hour = startDate.getHours();
    const minute = startDate.getMinutes();
    const ampm: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';

    if (hour === 0) {
      hour = 12;
    } else if (hour > 12) {
      hour -= 12;
    }

    setSelectedInterview(interview);
    rescheduleForm.reset({
      date: startDate,
      hour: String(hour).padStart(2, '0'),
      minute: String(minute).padStart(2, '0'),
      ampm,
    });
    setIsEditTimeDialogOpen(true);
  };

  const handleEditTimeSubmit = async (data: RescheduleFormValues) => {
    if (!db || !selectedInterview) return;

    const interviewRef = doc(db, 'interviews', selectedInterview.id);
    const newDateTime = new Date(data.date);
    let hour = parseInt(data.hour, 10);
    const minute = parseInt(data.minute, 10);

    if (data.ampm === 'PM' && hour < 12) hour += 12;
    if (data.ampm === 'AM' && hour === 12) hour = 0;

    newDateTime.setHours(hour, minute, 0, 0);
    const newEndTime = new Date(newDateTime.getTime() + 30 * 60000);

    const dataToUpdate = {
      startTime: Timestamp.fromDate(newDateTime),
      endTime: Timestamp.fromDate(newEndTime),
      status: 'Scheduled' as const,
    };

    try {
      await updateDoc(interviewRef, dataToUpdate);

      try {
        await addDoc(collection(db, 'userProfiles', selectedInterview.studentId, 'notifications'), {
          recipientUserProfileId: selectedInterview.studentId,
          title: 'Interview Time Updated',
          message: `${selectedInterview.companyName} updated your interview to ${format(newDateTime, 'PPP p')}.`,
          type: 'interview_rescheduled',
          targetUrl: '/dashboard/interviews',
          isRead: false,
          sentAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } catch (notificationError) {
        console.warn('Reschedule notification could not be created:', notificationError);
      }

      toast({
        title: 'Interview updated',
        description: `New time set for ${selectedInterview.studentName}.`,
      });
      setIsEditTimeDialogOpen(false);
      setSelectedInterview(null);
    } catch (serverError: any) {
      const permissionError = new FirestorePermissionError({
        path: interviewRef.path,
        operation: 'update',
        requestResourceData: dataToUpdate,
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        title: 'Update failed',
        description: 'Could not update interview time due to permissions.',
        variant: 'destructive',
      });
    }
  };

  const InterviewCard = ({ interview }: { interview: Interview }) => (
     (() => {
      const startDate = getInterviewDate(interview.startTime);
      const timeLabel = startDate
        ? startDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Invalid time';
      const dateLabel = startDate
        ? startDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
          })
        : 'Invalid date';
      const createdDate = getInterviewDate(interview.createdAt);
      const createdLabel = createdDate ? format(createdDate, 'PPP p') : 'Unknown';
      const statusTimelineText =
        interview.status === 'Scheduled'
          ? `Scheduled for ${dateLabel} at ${timeLabel}`
          : interview.status === 'Completed'
            ? 'Marked as completed'
            : interview.status === 'No Show'
              ? 'Marked as no show'
              : 'Marked as canceled';
      const isScheduled = interview.status === 'Scheduled';
      const isActive = Boolean(activeInterviewIds[interview.id]);
      const isInPastOrNow = startDate ? startDate.getTime() <= Date.now() : false;

      return (
     <Card key={interview.id} className="overflow-hidden">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="md:col-span-2 space-y-1">
                <p className="flex items-center gap-2 font-semibold">
                {role === 'student' ? <Building className="h-4 w-4 text-muted-foreground" /> : <User className="h-4 w-4 text-muted-foreground" />}
                {role === 'student' ? interview.companyName : interview.studentName}
                </p>
                <p className="text-sm text-muted-foreground">
                with {interview.interviewerName}
                </p>
                <div className="mt-2 border-l border-border pl-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Created: {createdLabel}</p>
                  <p className="text-xs text-muted-foreground">Activity: {statusTimelineText}</p>
                </div>
            </div>
            
            <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {timeLabel}
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {dateLabel}
                </p>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-2">
                <div className="flex flex-col items-start md:items-end gap-2">
                    <p className="flex items-center gap-2 font-medium text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {interview.location}
                    </p>
                    <Badge variant="outline" className={statusColors[interview.status]}>
                        {interview.status}
                    </Badge>
                </div>
                {role === 'company' && (
                    <div className="flex items-center gap-2">
                      {isScheduled && (
                        <Button
                          size="sm"
                          onClick={() =>
                            isInPastOrNow || isActive
                              ? handleStatusUpdate(interview.id, 'Completed')
                              : handleStartInterview(interview)
                          }
                        >
                          {isInPastOrNow || isActive ? 'Mark Complete' : 'Start Interview'}
                        </Button>
                      )}
                      {(interview.status === 'Scheduled' || interview.status === 'No Show') && (
                        <Button variant="outline" size="sm" onClick={() => openEditTimeDialog(interview)}>
                          Edit Time
                        </Button>
                      )}
                      {interview.status === 'No Show' && (
                        <Button variant="secondary" size="sm" onClick={() => handleRecallStudent(interview)}>
                          Recall
                        </Button>
                      )}
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0">
                              <MoreVertical className="h-4 w-4" />
                          </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusUpdate(interview.id, 'Completed')}>
                              Mark Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusUpdate(interview.id, 'No Show')}>
                              Mark No Show
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusUpdate(interview.id, 'Canceled')} className="text-destructive">
                              Cancel Interview
                          </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                )}
            </div>
        </CardContent>
    </Card>
      );
    })()
  );


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={role === 'company' ? "/dashboard/companies" : "/dashboard"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>My Scheduled Interviews</CardTitle>
          <CardDescription>Here are your upcoming and past interviews for the job fair.</CardDescription>
        </CardHeader>
        <CardContent>
          {!isLoading && (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-border/70">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-xl font-semibold">{stats.total}</p>
                    </div>
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
                <Card className="border-border/70">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Scheduled</p>
                      <p className="text-xl font-semibold">{stats.scheduled}</p>
                    </div>
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
                <Card className="border-border/70">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-xl font-semibold">{stats.completed}</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
                <Card className="border-border/70">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">No Show</p>
                      <p className="text-xl font-semibold">{stats.noShow}</p>
                    </div>
                    <CalendarX2 className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="relative w-full md:max-w-sm">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search student, interviewer, or location"
                    className="pl-9"
                  />
                </div>

                <Tabs value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
                  <TabsList>
                    <TabsTrigger value="All Time">All Time</TabsTrigger>
                    <TabsTrigger value="Today">Today</TabsTrigger>
                    <TabsTrigger value="Upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="Past">Past</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <TabsList>
                    <TabsTrigger value="All">All</TabsTrigger>
                    <TabsTrigger value="Scheduled">Scheduled</TabsTrigger>
                    <TabsTrigger value="Completed">Completed</TabsTrigger>
                    <TabsTrigger value="No Show">No Show</TabsTrigger>
                    <TabsTrigger value="Canceled">Canceled</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          )}
          {!isLoading && filteredInterviews.length > 0 ? (
            <div className="space-y-4">
              {filteredInterviews.map((interview) => (
                <InterviewCard key={interview.id} interview={interview} />
              ))}
            </div>
          ) : (
            !isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Calendar className="h-16 w-16 mx-auto" />
                <h3 className="mt-4 text-lg font-semibold">No interviews found</h3>
                <p className="mt-2 text-sm max-w-xs mx-auto">
                  {searchTerm || statusFilter !== 'All' || timeFilter !== 'All Time'
                    ? 'Try changing the search or status filter.'
                    : role === 'company'
                      ? 'You can schedule interviews with students from the main dashboard.'
                      : 'When a company schedules an interview with you, it will appear here.'}
                </p>
              </div>
            )
          )}
          {error && <p className="text-red-500 mt-4">Error loading interviews: {error.message}</p>}
        </CardContent>
      </Card>

      <Dialog open={isEditTimeDialogOpen} onOpenChange={setIsEditTimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Interview Time</DialogTitle>
            <DialogDescription>
              Update interview time and send updated schedule to the student.
            </DialogDescription>
          </DialogHeader>

          <Form {...rescheduleForm}>
            <form onSubmit={rescheduleForm.handleSubmit(handleEditTimeSubmit)} className="space-y-4">
              <FormField
                control={rescheduleForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DatePickerCalendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={rescheduleForm.control}
                  name="hour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hour</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="HH" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={rescheduleForm.control}
                  name="minute"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minute</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {['00', '15', '30', '45'].map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={rescheduleForm.control}
                  name="ampm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AM/PM</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="AM/PM" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditTimeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save New Time</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}