'use client';

import React, { useState } from 'react';
import { collection, query, where, documentId } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Student, Project } from '@/lib/types';
import { FolderKanban, Users, CalendarPlus, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScheduleInterviewDialog } from '@/components/dashboard/schedule-interview-dialog';
import Link from 'next/link';

const ProjectTeamMembers = ({ teamMemberIds }: { teamMemberIds: string[] }) => {
    const db = useFirestore();

    const membersQuery = useMemoFirebase(() => {
        if (!db || teamMemberIds.length === 0) return null;
        return query(collection(db, 'students'), where(documentId(), 'in', teamMemberIds));
    }, [db, teamMemberIds]);

    const { data: members, isLoading } = useCollection<Student>(membersQuery);

    if (isLoading) {
        return (
            <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-20" />
            </div>
        );
    }
    
    if (!members || members.length === 0) {
        return <p className="text-xs text-muted-foreground">No members found.</p>;
    }

    const firstMember = members[0];
    const otherMembersCount = members.length - 1;

    return (
        <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
                <AvatarFallback>{firstMember.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{firstMember.fullName}</span>
            {otherMembersCount > 0 && (
                <span className="text-sm text-muted-foreground">
                    + {otherMembersCount} other{otherMembersCount > 1 ? 's' : ''}
                </span>
            )}
        </div>
    );
};


export default function ProjectsPage() {
  const db = useFirestore();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // In a real app, you might filter by jobFairId
  const projectsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'projects'));
  }, [db]);

  const { data: projects, isLoading: loading, error } = useCollection<Project>(projectsQuery);

  const ProjectCard = ({ project }: { project: Project }) => {
    // This is a simplification. In a real app, you'd want a better way
    // to pick which student to schedule with from a project.
    // Here we just make the first member schedulable.
    const { data: studentToSchedule, isLoading: studentLoading } = useCollection<Student>(
        useMemoFirebase(() => {
            if (!db || !project.teamMemberIds?.[0]) return null;
            return query(collection(db, 'students'), where(documentId(), '==', project.teamMemberIds[0]));
        }, [db, project.teamMemberIds])
    );
    
    return (
        <Card className="flex flex-col">
        <CardHeader>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <CardTitle>{project.name || 'Untitled Project'}</CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-2">
                       <ProjectTeamMembers teamMemberIds={project.teamMemberIds} />
                    </CardDescription>
                </div>
                <FolderKanban className="h-8 w-8 text-muted-foreground shrink-0" />
            </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
            <p className="text-sm text-muted-foreground line-clamp-4">
            {project.description || 'No project description provided.'}
            </p>
        </CardContent>
        <CardFooter>
            <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => studentToSchedule?.[0] && setSelectedStudent(studentToSchedule[0])}
                disabled={studentLoading || !studentToSchedule?.[0]}
            >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Schedule Interview
            </Button>
        </CardFooter>
        </Card>
    );
  }

  const SkeletonCard = () => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-8" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/companies">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Dashboard
                </Link>
            </Button>
            <h1 className="text-3xl font-bold">Student Projects</h1>
        </div>
        <p className="text-muted-foreground">
            Browse through the list of student projects. Schedule an interview to learn more.
        </p>

        {loading && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
        )}
        {!loading && projects && projects.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                ))}
            </div>
        ) : (
            !loading && (
                <Card className="h-96">
                    <CardContent className="flex flex-col items-center justify-center h-full text-center">
                         <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Projects Found</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Students have not created any projects yet. Please check back later.
                        </p>
                    </CardContent>
                </Card>
            )
        )}
         {error && (
            <p className="text-red-500 mt-4">
              Error loading projects: {error.message}
            </p>
          )}

        {selectedStudent && (
            <ScheduleInterviewDialog
            student={selectedStudent}
            open={!!selectedStudent}
            onOpenChange={(open) => {
                if (!open) {
                setSelectedStudent(null);
                }
            }}
            />
        )}
    </div>
  );
}