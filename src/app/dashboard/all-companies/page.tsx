'use client';

import React from 'react';
import { collection, query } from 'firebase/firestore';
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
import { Download, ArrowLeft } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Company } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function AllCompaniesPage() {
  const db = useFirestore();

  const companiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'companies'));
  }, [db]);

  const { data: companies, isLoading: loading, error } = useCollection<Company>(companiesQuery);

  const downloadCSV = () => {
    if (!companies) return;

    const headers = ['Company Name', 'HR Contact', 'Email', 'Phone Number', 'Industry', 'Status'];
    const csvRows = [
      headers.join(','),
      ...companies.map(c => [
        `"${c.companyName}"`,
        `"${c.hrName}"`,
        `"${c.email}"`,
        `"${c.phoneNumber || 'N/A'}"`,
        `"${c.industry}"`,
        `"${c.status}"`
      ].join(','))
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "all_companies.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CompanyRow = ({ company }: { company: Company }) => (
    <TableRow key={company.id}>
      <TableCell className="font-medium">{company.companyName}</TableCell>
      <TableCell>{company.hrName}</TableCell>
      <TableCell>{company.email}</TableCell>
      <TableCell>{company.industry}</TableCell>
      <TableCell><Badge variant={company.status === 'approved' ? 'default' : company.status === 'pending' ? 'secondary' : 'destructive'} className="capitalize">{company.status}</Badge></TableCell>
    </TableRow>
  );

  const SkeletonRow = () => (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Registered Companies</CardTitle>
            <CardDescription>
              A complete list of all companies who have registered for the event.
            </CardDescription>
          </div>
          <Button onClick={downloadCSV} disabled={!companies || companies.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Download as CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>HR Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
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
                      <TableCell colSpan={5} className="h-24 text-center">
                        No companies found.
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
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