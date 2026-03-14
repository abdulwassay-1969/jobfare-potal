
'use client';

import React from 'react';
import { collection, query, where } from 'firebase/firestore';
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
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Company } from '@/lib/types';
import { Building, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

export default function ParticipatingCompaniesPage() {
  const db = useFirestore();

  const companiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'companies'), where('status', '==', 'approved'));
  }, [db]);

  const { data: companies, isLoading: loading, error } = useCollection<Company>(companiesQuery);

  const CompanyRow = ({ company }: { company: Company }) => (
    <TableRow key={company.id}>
      <TableCell>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={company.logoUrl} alt={company.companyName} />
            <AvatarFallback>{company.companyName.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{company.companyName}</span>
        </div>
      </TableCell>
      <TableCell>{company.industry}</TableCell>
      <TableCell>
        {company.website ? (
          <Button variant="ghost" size="sm" asChild>
            <a href={company.website} target="_blank" rel="noopener noreferrer">
              <LinkIcon className="mr-2 h-4 w-4" />
              Visit Website
            </a>
          </Button>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </TableCell>
    </TableRow>
  );

  const SkeletonRow = () => (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-8 w-28" /></TableCell>
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
        <h1 className="text-2xl font-bold">Participating Companies</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Approved Companies</CardTitle>
          <CardDescription>
            Here is a list of all companies approved for the career fair.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Website</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                {!loading && companies && companies.length > 0 ? (
                  companies.map((company) => (
                    <CompanyRow key={company.id} company={company} />
                  ))
                ) : (
                  !loading && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                         <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                          <p className="mt-4 text-sm">No companies have been announced yet.</p>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
          {error && (
            <p className="text-red-500 mt-4 text-sm">
              Error loading companies: {error.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
