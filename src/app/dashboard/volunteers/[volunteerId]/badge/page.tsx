"use client";

import React, { useRef, useEffect, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { doc, collection, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, GraduationCap, ArrowLeft } from "lucide-react";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Volunteer, RoomAssignment } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function VolunteerBadgePage() {
  const params = useParams();
  const router = useRouter();
  const [volunteerId, setVolunteerId] = useState<string | null>(null);

  useEffect(() => {
    if (params?.volunteerId) {
      setVolunteerId(params.volunteerId as string);
    }
  }, [params]);

  const badgeRef = useRef<HTMLDivElement>(null);
  const db = useFirestore();

  const volunteerRef = useMemoFirebase(() => {
    if (!db || !volunteerId) return null;
    return doc(db, "volunteers", volunteerId);
  }, [db, volunteerId]);

  const { data: volunteer, isLoading: volunteerLoading, error: volunteerError } = useDoc<Volunteer>(volunteerRef);

  const assignmentQuery = useMemoFirebase(() => {
    if (!db || !volunteer || volunteer.assignedRole !== 'Company Assistance') {
      return null;
    }
    const jobFairId = volunteer.jobFairId || 'main-job-fair-2024';
    return query(
      collection(db, 'jobFairs', jobFairId, 'roomAssignments'),
      where('volunteerId', '==', volunteer.id)
    );
  }, [db, volunteer]);

  const assignmentByArrayQuery = useMemoFirebase(() => {
    if (!db || !volunteer || volunteer.assignedRole !== 'Company Assistance') {
      return null;
    }
    const jobFairId = volunteer.jobFairId || 'main-job-fair-2024';
    return query(
      collection(db, 'jobFairs', jobFairId, 'roomAssignments'),
      where('volunteerIds', 'array-contains', volunteer.id)
    );
  }, [db, volunteer]);

  const { data: legacyAssignments, isLoading: legacyAssignmentLoading } = useCollection<RoomAssignment>(assignmentQuery);
  const { data: multiAssignments, isLoading: multiAssignmentLoading } = useCollection<RoomAssignment>(assignmentByArrayQuery);
  const assignment = React.useMemo(() => {
    const merged = [...(multiAssignments || []), ...(legacyAssignments || [])];
    const uniqueAssignments = merged.filter(
      (item, index, self) => index === self.findIndex((candidate) => candidate.id === item.id)
    );

    return uniqueAssignments[0];
  }, [legacyAssignments, multiAssignments]);

  const downloadBadge = () => {
    if (badgeRef.current) {
      html2canvas(badgeRef.current, { scale: 4, useCORS: true, backgroundColor: null }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [54, 85.6],
        });
        pdf.addImage(imgData, "PNG", 0, 0, 54, 85.6);
        pdf.save(`volunteer-badge-${volunteer?.fullName?.replace(" ", "-")}.pdf`);
      });
    }
  };

  const isLoading = !volunteerId || volunteerLoading || (volunteer?.assignedRole === 'Company Assistance' && (legacyAssignmentLoading || multiAssignmentLoading));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center space-y-4">
          <Skeleton className="rounded-xl" style={{ width: '325px', height: '515px' }} />
          <Skeleton className="h-10 w-full max-w-xs" />
      </div>
    );
  }

  if (volunteerError) {
    console.error("Firebase Error:", volunteerError);
    return (
        <Card className="max-w-sm mx-auto">
            <CardContent className="p-6 text-center">
                <h2 className="text-xl font-bold">Error Loading Badge</h2>
                <p className="text-muted-foreground mt-2">
                    There was a problem fetching the volunteer data. This could be a permission issue.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button>
            </CardContent>
        </Card>
    );
  }
  
  if (!volunteer) {
    return (
        <Card className="max-w-sm mx-auto">
            <CardContent className="p-6 text-center">
                <h2 className="text-xl font-bold">Volunteer Not Found</h2>
                <p className="text-muted-foreground mt-2">
                    The requested volunteer could not be found.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button>
            </CardContent>
        </Card>
    )
  }

  if (volunteer.status !== "approved") {
    return (
        <Card className="max-w-sm mx-auto">
            <CardContent className="p-6 text-center">
                <h2 className="text-xl font-bold">Badge Not Available</h2>
                <p className="text-muted-foreground mt-2">
                    This volunteer's application has not been approved yet.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button>
            </CardContent>
        </Card>
    )
  }

  const qrValue = JSON.stringify({
    type: 'volunteer',
    volunteerId: volunteer.id,
    name: volunteer.fullName,
    role: volunteer.assignedRole || volunteer.preferredRole,
    shift: volunteer.assignedShift || "N/A",
    company: assignment?.companyName || null,
    room: assignment?.roomNumber || null,
  });

  const fallback = volunteer.fullName ? volunteer.fullName.charAt(0).toUpperCase() : "V";

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full max-w-xs flex justify-start mb-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>
      </div>
      <div 
        ref={badgeRef}
        className="bg-white text-black rounded-2xl flex flex-col shadow-lg overflow-hidden"
        style={{
            width: "325px",
            height: "515px",
        }}
      >
        <div className="bg-primary text-primary-foreground text-center py-3">
             <div className="flex items-center justify-center gap-2 font-semibold text-lg">
                <GraduationCap className="w-7 h-7" />
                <span>C@SE JOBFAIR</span>
            </div>
        </div>
        <div className="flex-grow flex flex-col items-center justify-center p-4 space-y-3">
            <Avatar className="h-32 w-32 border-4 border-primary/30">
                <AvatarImage src={volunteer.photoUrl} alt={volunteer.fullName} />
                <AvatarFallback className="text-4xl">{fallback}</AvatarFallback>
            </Avatar>
            <div className="text-center">
                <h1 className="text-2xl font-bold">{volunteer.fullName}</h1>
                <p className="text-md text-gray-500">{volunteer.registrationNumber}</p>
            </div>
            <Badge variant="secondary" className="text-base py-1 px-4 !mt-4 bg-gray-200 text-gray-800">
                {volunteer.assignedRole || volunteer.preferredRole}
            </Badge>
            {volunteer.assignedRole === 'Company Assistance' && (
                <div className="text-center !mt-2 border-t border-gray-200 pt-2 w-full">
                    <p className="text-xs text-gray-500">Assigned To</p>
                    {assignment ? (
                        <p className="font-semibold text-lg">{assignment.companyName} - {assignment.roomNumber}</p>
                    ) : (
                        <p className="text-sm text-gray-500">Assignment Pending</p>
                    )}
                </div>
            )}
        </div>
        <div className="bg-gray-100 p-3 flex flex-col items-center space-y-2 mt-auto">
            <div className="p-1 bg-white rounded-md">
                <QRCode value={qrValue} size={80} bgColor="#FFFFFF" fgColor="#000000" />
            </div>
             <p className="text-xs text-gray-500">
                Event Volunteer - {new Date().getFullYear()}
             </p>
        </div>
      </div>
      <Button onClick={downloadBadge} className="w-full max-w-xs">
        <Download className="mr-2 h-4 w-4" />
        Download ID Card
      </Button>
    </div>
  );
}