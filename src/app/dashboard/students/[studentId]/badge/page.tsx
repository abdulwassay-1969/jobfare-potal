"use client";

import React, { useRef, useEffect, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { doc } from "firebase/firestore";
import { useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, GraduationCap, ArrowLeft } from "lucide-react";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Student, ProjectSpotAssignment } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function StudentBadgePage() {
  const params = useParams();
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (params?.studentId) {
      setStudentId(params.studentId as string);
    }
  }, [params]);

  const badgeRef = useRef<HTMLDivElement>(null);
  const db = useFirestore();

  const studentRef = useMemoFirebase(() => {
    if (!db || !studentId) return null;
    return doc(db, "students", studentId);
  }, [db, studentId]);

  const { data: student, isLoading: studentLoading, error: studentError } = useDoc<Student>(studentRef);
  
  const jobFairId = 'main-job-fair-2024';
  const assignmentRef = useMemoFirebase(() => {
    if (!db || !studentId) return null;
    return doc(db, 'jobFairs', jobFairId, 'projectSpotAssignments', studentId);
  }, [db, studentId, jobFairId]);

  const { data: assignment, isLoading: assignmentLoading } = useDoc<ProjectSpotAssignment>(assignmentRef);


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
        pdf.save(`student-badge-${student?.fullName?.replace(" ", "-")}.pdf`);
      });
    }
  };

  const isLoading = !studentId || studentLoading || assignmentLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center space-y-4">
          <Skeleton className="rounded-xl" style={{ width: '325px', height: '515px' }} />
          <Skeleton className="h-10 w-full max-w-xs" />
      </div>
    );
  }

  if (studentError) {
    console.error("Firebase Error:", studentError);
    return (
        <Card className="max-w-sm mx-auto">
            <CardContent className="p-6 text-center">
                <h2 className="text-xl font-bold">Error Loading Badge</h2>
                <p className="text-muted-foreground mt-2">There was a problem fetching the student data.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button>
            </CardContent>
        </Card>
    );
  }
  
  if (!student) {
    return notFound();
  }

  if (student.status !== "approved") {
    return (
        <Card className="max-w-sm mx-auto">
            <CardContent className="p-6 text-center">
                <h2 className="text-xl font-bold">Badge Not Available</h2>
                <p className="text-muted-foreground mt-2">This student's application has not been approved yet.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button>
            </CardContent>
        </Card>
    )
  }

  const qrValue = JSON.stringify({
    type: 'student',
    studentId: student.id,
    name: student.fullName,
    spotNumber: assignment?.spotNumber || "N/A",
    roomNumber: assignment?.roomNumber || "N/A",
    projectName: student.projectName || "N/A"
  });

  const fallback = student.fullName ? student.fullName.charAt(0).toUpperCase() : "S";

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
                <AvatarImage src={`https://i.pravatar.cc/150?u=${student.id}`} alt={student.fullName} />
                <AvatarFallback className="text-4xl">{fallback}</AvatarFallback>
            </Avatar>
            <div className="text-center">
                <h1 className="text-2xl font-bold">{student.fullName}</h1>
                <p className="text-md text-gray-500">{student.registrationNumber}</p>
            </div>
             <div className="text-center !mt-4 border-t border-gray-200 pt-2 w-full">
                <p className="text-xs text-gray-500">Project</p>
                <p className="font-semibold text-lg">{student.projectName || "N/A"}</p>
            </div>
            {assignment && (
                <div className="flex items-center justify-around w-full !mt-2">
                    <div className="text-center">
                        <p className="text-xs text-gray-500">Room</p>
                        <p className="font-bold text-xl">{assignment.roomNumber}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500">Spot</p>
                        <p className="font-bold text-xl">{assignment.spotNumber}</p>
                    </div>
                </div>
            )}
        </div>
        <div className="bg-gray-100 p-3 flex flex-col items-center space-y-2 mt-auto">
            <div className="p-1 bg-white rounded-md">
                <QRCode value={qrValue} size={80} bgColor="#FFFFFF" fgColor="#000000" />
            </div>
             <p className="text-xs text-gray-500">
                Student Participant - {new Date().getFullYear()}
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