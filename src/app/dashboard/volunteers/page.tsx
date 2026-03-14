'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { MoreHorizontal, UserPlus, QrCode, Edit, ArrowLeft, ClipboardCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Volunteer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Timestamp } from 'firebase/firestore';
import { AssignVolunteerRoleDialog } from '@/components/dashboard/assign-volunteer-role-dialog';

type Status = 'pending' | 'approved' | 'rejected';

const statusColors: Record<Status, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

export default function VolunteersPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Status>('pending');
  const db = useFirestore();

  const [isAssignRoleDialogOpen, setIsAssignRoleDialogOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);

  const volunteersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'volunteers'), where('status', '==', activeTab));
  }, [db, activeTab]);

  const {
    data: volunteers,
    isLoading: loading,
    error,
  } = useCollection<Volunteer>(volunteersQuery);

  const updateVolunteerStatus = (id: string, status: Status) => {
    const volunteerDocRef = doc(db, 'volunteers', id);
    const dataToUpdate = { status, updatedAt: serverTimestamp() };

    updateDoc(volunteerDocRef, dataToUpdate)
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: volunteerDocRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
      });

    toast({
      title: 'Status Updated',
      description: `Volunteer has been moved to ${status}.`,
    });
  };
  
  const handleAssignRole = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setIsAssignRoleDialogOpen(true);
  };

  const VolunteerRow = ({ volunteer }: { volunteer: Volunteer }) => (
    <TableRow key={volunteer.id}>
      <TableCell className="font-medium">{volunteer.fullName}</TableCell>
      <TableCell>{volunteer.department}</TableCell>
      <TableCell>{volunteer.preferredRole}</TableCell>
      <TableCell>{volunteer.assignedRole || <span className="text-muted-foreground">N/A</span>}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`capitalize border-0 text-white ${
            statusColors[volunteer.status]
          }`}
        >
          {volunteer.status}
        </Badge>
      </TableCell>
      <TableCell>
        {(volunteer.updatedAt || volunteer.createdAt) &&
          new Date(
            ((volunteer.updatedAt || volunteer.createdAt) as Timestamp).seconds * 1000
          ).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(volunteer.email)}
            >
              Copy Email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {volunteer.status === 'pending' && (
              <>
                <DropdownMenuItem onClick={() => updateVolunteerStatus(volunteer.id, 'approved')}>
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateVolunteerStatus(volunteer.id, 'rejected')} className="text-red-600">
                  Reject
                </DropdownMenuItem>
              </>
            )}
            {volunteer.status === 'approved' && (
                <DropdownMenuItem onClick={() => updateVolunteerStatus(volunteer.id, 'rejected')} className="text-red-600">
                    Reject
                </DropdownMenuItem>
            )}
            {volunteer.status === 'rejected' && (
                <DropdownMenuItem onClick={() => updateVolunteerStatus(volunteer.id, 'pending')}>
                    Move to Pending
                </DropdownMenuItem>
            )}

            {volunteer.status === 'approved' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAssignRole(volunteer)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Assign Role
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/volunteers/${volunteer.id}/badge`}>
                    <QrCode className="mr-2 h-4 w-4" />
                    View Badge
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  const SkeletonRow = () => (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Volunteer Management</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/volunteers/attendance">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              View Attendance
            </Link>
          </Button>
          <Button asChild>
            <Link href="/register/volunteer">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Volunteer
            </Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            Approve, reject, and manage event volunteers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as Status)}
          >
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Preferred Role</TableHead>
                      <TableHead>Assigned Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                      </>
                    )}
                    {!loading && volunteers && volunteers.length > 0 ? (
                      volunteers.map((volunteer) => (
                        <VolunteerRow key={volunteer.id} volunteer={volunteer} />
                      ))
                    ) : (
                      !loading && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            No {activeTab} volunteers found.
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
          {error && (
            <p className="text-red-500 mt-4">
              Error loading volunteers: {error.message}
            </p>
          )}
        </CardContent>
      </Card>
      {isAssignRoleDialogOpen && (
          <AssignVolunteerRoleDialog
              open={isAssignRoleDialogOpen}
              onOpenChange={setIsAssignRoleDialogOpen}
              volunteer={selectedVolunteer}
          />
      )}
    </div>
  );
}