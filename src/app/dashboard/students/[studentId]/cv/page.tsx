
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Student } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CVView } from '@/components/dashboard/cv-view';

export default function PublicStudentCVPage() {
  const cvRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const studentId = params.studentId as string;
  const db = useFirestore();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId || !db) return;
    const docRef = doc(db, 'students', studentId);
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setStudent({ id: doc.id, ...doc.data() } as Student);
      }
      setLoading(false);
    }, (error) => {
        console.error("Error fetching student document:", error);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [studentId, db]);

  const downloadCV = () => {
    if (cvRef.current) {
      html2canvas(cvRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        let width = pdfWidth;
        let height = width / ratio;
        if (height > pdfHeight) {
            height = pdfHeight;
            width = height * ratio;
        }
        const xOffset = (pdfWidth - width) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, 0, width, height);
        pdf.save(`CV-${student?.fullName?.replace(' ', '-')}.pdf`);
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 bg-muted min-h-screen">
        <Skeleton className="h-10 w-40 mb-4" />
        <Skeleton className="h-[1123px] w-full" />
      </div>
    );
  }

  if (!student) {
    return notFound();
  }

  return (
    <div className="bg-muted min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end gap-4 mb-4">
            <Button onClick={downloadCV}>
                <Download className="mr-2 h-4 w-4" />
                Download as PDF
            </Button>
        </div>
        <div ref={cvRef}>
            <CVView student={student} />
        </div>
      </div>
    </div>
  );
}
