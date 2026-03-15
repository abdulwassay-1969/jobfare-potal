
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Student, Project, Interview } from '@/lib/types';
import { Building, Users, Handshake, CalendarPlus, Star, StarOff, FolderKanban, FileText, Calendar, Clock, MapPin, BellDot } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RoomInfoCard } from '@/components/dashboard/room-info-card';
import { Button } from '@/components/ui/button';
import { ScheduleInterviewDialog } from '@/components/dashboard/schedule-interview-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { BreakBanner } from '@/components/dashboard/break-banner';
import { format, formatDistanceToNowStrict } from 'date-fns';

export default function CompanyDashboardPage() {
  const { user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // --- Data Fetching ---
  const studentsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'students'), where('status', '==', 'approved'));
  }, [db]);

  const projectsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'projects'));
  }, [db]);

  const shortlistQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'companies', user.uid, 'shortlistedStudents');
  }, [db, user]);

  const interviewsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'interviews'), where('companyId', '==', user.uid));
  }, [db, user]);

  const { data: students, isLoading: loadingStudents } = useCollection<Student>(studentsQuery);
  const { data: projects, isLoading: loadingProjects } = useCollection<Project>(projectsQuery);
  const { data: shortlist, isLoading: loadingShortlist } = useCollection<{ studentId: string }>(shortlistQuery);
  const { data: interviews, isLoading: loadingInterviews } = useCollection<Interview>(interviewsQuery);
  const shortlistedIds = useMemo(() => new Set(shortlist?.map(s => s.id) || []), [shortlist]);
  const isLoading = loadingStudents || loadingProjects || loadingShortlist;

  const upcomingInterviews = useMemo(() => {
    const now = new Date();
    return (interviews || [])
      .filter((interview) => {
        const start = interview.startTime?.toDate?.();
        return start ? start >= now : false;
      })
      .sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime())
      .slice(0, 5);
  }, [interviews]);

  const nextInterview = upcomingInterviews[0] || null;

  // --- Data Processing ---
  const { projectsWithMembers, individualStudents } = useMemo(() => {
    if (!students || !projects) return { projectsWithMembers: [], individualStudents: [] };

    const studentMap = new Map(students.map(s => [s.id, s]));
    const studentsInProjects = new Set<string>();

    const groupedProjects = projects.map(project => {
      const members = (project.teamMemberIds || [])
        .map(id => studentMap.get(id))
        .filter((s): s is Student => !!s);
      
      members.forEach(member => studentsInProjects.add(member.id));
      
      return { ...project, members };
    }).filter(p => p.members.length > 0);

    const individualStudents = students.filter(s => !studentsInProjects.has(s.id));

    return { projectsWithMembers: groupedProjects, individualStudents };
  }, [students, projects]);

  // --- Actions ---
  const handleShortlist = async (student: Student, isCurrentlyShortlisted: boolean) => {
    if (!user || !db) return;
    const shortlistRef = doc(db, 'companies', user.uid, 'shortlistedStudents', student.id);
    
    if (isCurrentlyShortlisted) {
      deleteDoc(shortlistRef).catch((serverError) => {
        const permissionError = new FirestorePermissionError({ path: shortlistRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
      });
    } else {
      const data = {
        studentId: student.id,
        studentName: student.fullName,
        studentDept: student.department,
        studentSkills: student.skills?.map(s => s.name) || [],
        addedAt: serverTimestamp(),
      }
      setDoc(shortlistRef, data).catch((serverError) => {
        const permissionError = new FirestorePermissionError({ path: shortlistRef.path, operation: 'create', requestResourceData: data });
        errorEmitter.emit('permission-error', permissionError);
      });
    }
    toast({ title: isCurrentlyShortlisted ? 'Removed from shortlist.' : 'Added to shortlist!' });
  };

  // --- Reusable Components ---
  const StudentRow = ({ student }: { student: Student }) => {
    const isShortlisted = shortlistedIds.has(student.id);

    return (
      <TableRow key={student.id}>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9"><AvatarFallback>{student.fullName.charAt(0)}</AvatarFallback></Avatar>
            <div>
              <p className="font-semibold">{student.fullName}</p>
              <p className="text-xs text-muted-foreground">{student.registrationNumber}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>{student.department}</TableCell>
        <TableCell>{student.cgpa ?? 'N/A'}</TableCell>
        <TableCell className="max-w-xs">
          <div className="flex flex-wrap gap-1">
            {student.skills?.slice(0, 5).map((skill, index) => <Badge key={index} variant="secondary">{skill.name}</Badge>) ?? <span className="text-xs text-muted-foreground">No skills</span>}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/students/${student.id}/cv`} target="_blank">
                    <FileText className="mr-2 h-4 w-4" /> View CV
                </Link>
            </Button>
            <Button variant={isShortlisted ? "default" : "secondary"} size="sm" onClick={() => handleShortlist(student, isShortlisted)} disabled={loadingShortlist}>
              {isShortlisted ? <StarOff className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />}
              {isShortlisted ? "Remove" : "Shortlist"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedStudent(student)}>
              <CalendarPlus className="mr-2 h-4 w-4" /> Schedule
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const ProjectGroup = ({ project }: { project: { members: Student[] } & Project }) => (
    <AccordionItem value={project.id}>
      <AccordionTrigger className="hover:bg-muted/50 px-4">
        <div className="flex items-center gap-4">
          <FolderKanban className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold text-left">{project.name}</p>
            <p className="text-sm text-muted-foreground text-left">{project.members.length} member{project.members.length > 1 ? 's' : ''}</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="bg-muted/30">
        <div className="p-1">
            <Table>
                <TableBody>
                    {project.members.map(student => <StudentRow key={student.id} student={student} />)}
                </TableBody>
            </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );

  // --- Skeletons ---
  const SkeletonProjectGroup = () => (
    <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-6" />
            <div className="space-y-1"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-20" /></div>
        </div>
        <Skeleton className="h-4 w-4" />
    </div>
  );
  
  const SkeletonRow = () => (
    <TableRow>
      <TableCell><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></div></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
      <TableCell><div className="flex justify-end gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" /></div></TableCell>
    </TableRow>
  );

  // --- Render ---
  return (
    <div className="space-y-6">
      <BreakBanner />

      <div className="flex items-center gap-4">
        <Building className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Company Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {user && <RoomInfoCard companyId={user.uid} />}
           <Card><CardHeader><CardTitle className="flex items-center gap-2"><Handshake className="h-5 w-5" />Welcome</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Discover top student talent. Use this dashboard to browse projects and individuals, then shortlist and schedule interviews.</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BellDot className="h-5 w-5" /> Interview Alerts</CardTitle>
          <CardDescription>Upcoming interview notifications with time and student details.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInterviews ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : upcomingInterviews.length > 0 ? (
            <div className="space-y-3">
              {nextInterview && (
                <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Next: {nextInterview.studentName}</p>
                    <Badge variant="secondary">
                      in {formatDistanceToNowStrict(nextInterview.startTime.toDate())}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(nextInterview.startTime.toDate(), 'EEE, MMM d • p')} • {nextInterview.location}
                  </p>
                </div>
              )}
              {upcomingInterviews.map((interview) => {
                const start = interview.startTime.toDate();
                return (
                  <div key={interview.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-md border p-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium">{interview.studentName}</p>
                        <p className="text-xs text-muted-foreground">with {interview.interviewerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{format(start, 'p')}</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />{format(start, 'MMM d')}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{interview.location}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No upcoming interviews yet.</div>
          )}
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/interviews">View all interviews</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved Students & Projects</CardTitle>
          <CardDescription>Browse student projects or individual candidates.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-2"><Skeleton className="h-6 w-32" /></h3>
                <div className="border rounded-md"><SkeletonProjectGroup /><SkeletonProjectGroup /></div>
             </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-2">Projects</h3>
                {projectsWithMembers.length > 0 ? (
                  <Accordion type="multiple" className="w-full border rounded-md">
                    {projectsWithMembers.map(project => <ProjectGroup key={project.id} project={project} />)}
                  </Accordion>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm border rounded-md"><Users className="mx-auto h-8 w-8 mb-2" /><p>No student projects found.</p></div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Individual Students</h3>
                {individualStudents.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Department</TableHead><TableHead>CGPA</TableHead><TableHead>Top Skills</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                      <TableBody>{individualStudents.map(student => <StudentRow key={student.id} student={student} />)}</TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm border rounded-md"><Users className="mx-auto h-8 w-8 mb-2" /><p>No individual students found.</p></div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {selectedStudent && (
        <ScheduleInterviewDialog student={selectedStudent} open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)} />
      )}
    </div>
  );
}
