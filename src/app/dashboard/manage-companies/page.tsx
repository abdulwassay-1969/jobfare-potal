'use client';

import React, { useState } from 'react';
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
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
import { MoreHorizontal, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Company } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

type Status = 'pending' | 'approved' | 'rejected';

const statusColors: Record<Status, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

export default function ManageCompaniesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Status>('pending');
  const db = useFirestore();

  const companiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'companies'), where('status', '==', activeTab));
  }, [db, activeTab]);

  const {
    data: companies,
    isLoading: loading,
    error,
  } = useCollection<Company>(companiesQuery);

  const updateCompanyStatus = (id: string, status: Status) => {
    if (!db) return;
    const companyDocRef = doc(db, 'companies', id);
    const dataToUpdate = { status, updatedAt: serverTimestamp() };

    updateDoc(companyDocRef, dataToUpdate)
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: companyDocRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
      });

    toast({
      title: 'Status Updated',
      description: `Company has been moved to ${status}.`,
    });
  };

  const deleteCompanyPermanently = async (company: Company) => {
    if (!db) return;

    const confirmed = window.confirm(
      `Remove ${company.companyName} from the portal? They can log in later and return to pending approval.`
    );
    if (!confirmed) return;

    const batch = writeBatch(db);
    const companyRef = doc(db, 'companies', company.id);
    const profileRef = doc(db, 'userProfiles', company.id);
    const archivedRef = doc(db, 'archivedUsers', company.id);
    const roomAssignmentRef = doc(db, 'jobFairs', 'main-job-fair-2024', 'roomAssignments', company.id);

    batch.set(archivedRef, {
      uid: company.id,
      role: 'company',
      archivedAt: serverTimestamp(),
      userProfileData: {
        id: company.id,
        email: company.email,
        name: company.companyName,
        roles: ['company'],
      },
      roleProfileData: {
        ...company,
        status: 'pending',
      },
    });

    batch.delete(companyRef);
    batch.delete(profileRef);
    batch.delete(roomAssignmentRef);

    try {
      await batch.commit();
      toast({
        title: 'Company Removed',
        description: `${company.companyName} has been archived and removed from active access.`,
      });
    } catch (serverError) {
      const permissionError = new FirestorePermissionError({
        path: companyRef.path,
        operation: 'delete',
        requestResourceData: { companyId: company.id },
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        title: 'Delete Failed',
        description: 'Could not permanently delete this company.',
        variant: 'destructive',
      });
    }
  };

  const CompanyRow = ({ company }: { company: Company }) => (
    <TableRow key={company.id}>
      <TableCell className="font-medium">{company.companyName}</TableCell>
      <TableCell>{company.hrName}</TableCell>
      <TableCell>{company.email}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`capitalize border-0 text-white ${
            statusColors[company.status]
          }`}
        >
          {company.status}
        </Badge>
      </TableCell>
      <TableCell>
        {(company.updatedAt || company.createdAt) &&
          new Date(
            ((company.updatedAt || company.createdAt) as Timestamp).seconds * 1000
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
              onClick={() => navigator.clipboard.writeText(company.email)}
            >
              Copy Email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {company.status === 'pending' && (
                <>
                    <DropdownMenuItem onClick={() => updateCompanyStatus(company.id, 'approved')}>
                    Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateCompanyStatus(company.id, 'rejected')} className="text-red-600">
                    Reject
                    </DropdownMenuItem>
                </>
            )}
            {company.status === 'approved' && (
                <DropdownMenuItem onClick={() => updateCompanyStatus(company.id, 'rejected')} className="text-red-600">
                    Reject
                </DropdownMenuItem>
            )}
            {company.status === 'rejected' && (
                <DropdownMenuItem onClick={() => updateCompanyStatus(company.id, 'pending')}>
                    Move to Pending
                </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => void deleteCompanyPermanently(company)}>
              Remove Access
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  const SkeletonRow = () => (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-40" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-20 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8" />
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Company Management</CardTitle>
          <CardDescription>
            Approve, reject, and manage participating companies.
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
                      <TableHead>Company Name</TableHead>
                      <TableHead>HR Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
                    {!loading && companies && companies.length > 0 ? (
                      companies.map((company) => (
                        <CompanyRow key={company.id} company={company} />
                      ))
                    ) : (
                      !loading && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No {activeTab} companies found.
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
              Error loading companies: {error.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}