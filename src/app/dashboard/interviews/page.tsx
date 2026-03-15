'use client';

import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, Timestamp, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, User, Building, Clock, MapPin, MoreVertical, ArrowLeft } from 'lucide-react';
import { Interview } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const statusColors: Record<Interview['status'], string> = {
    Scheduled: 'border-blue-500/80 bg-blue-500/10 text-blue-700 dark:text-blue-400',
    Completed: 'border-green-500/80 bg-green-500/10 text-green-700 dark:text-green-400',
    Canceled: 'border-red-500/80 bg-red-500/10 text-red-700 dark:text-red-400',
    'No Show': 'border-gray-500/80 bg-gray-500/10 text-gray-700 dark:text-gray-400',
};


export default function InterviewsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

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
                            Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusUpdate(interview.id, 'No Show')}>
                            No Show
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusUpdate(interview.id, 'Canceled')} className="text-destructive">
                            Cancel
                        </DropdownMenuItem>
                        {interview.status === 'No Show' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleRecallStudent(interview)}>
                              Recall Student
                            </DropdownMenuItem>
                          </>
                        )}
                        </DropdownMenuContent>
                    </DropdownMenu>
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
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          )}
          {!isLoading && interviews && interviews.length > 0 ? (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <InterviewCard key={interview.id} interview={interview} />
              ))}
            </div>
          ) : (
            !isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Calendar className="h-16 w-16 mx-auto" />
                <h3 className="mt-4 text-lg font-semibold">No interviews scheduled</h3>
                <p className="mt-2 text-sm max-w-xs mx-auto">
                  {role === 'company' ? 'You can schedule interviews with students from the main dashboard.' : 'When a company schedules an interview with you, it will appear here.'}
                </p>
              </div>
            )
          )}
          {error && <p className="text-red-500 mt-4">Error loading interviews: {error.message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}