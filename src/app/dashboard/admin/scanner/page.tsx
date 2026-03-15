'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, UserCheck, QrCode, MapPin, LayoutGrid, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import Link from 'next/link';

type Html5QrcodeInstance = {
  isScanning: boolean;
  start: (...args: any[]) => Promise<unknown>;
  stop: () => Promise<unknown>;
};

interface ScannedVolunteerData {
  type: 'volunteer';
  volunteerId: string;
  name: string;
  role: string;
  shift: string;
  company?: string;
  room?: string;
}

interface ScannedStudentData {
  type: 'student';
  studentId: string;
  name: string;
  spotNumber: string;
  roomNumber: string;
  projectName?: string;
}

type ScannedData = ScannedVolunteerData | ScannedStudentData;

export default function AdminScannerPage() {
  const scannerRegionRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5QrcodeInstance | null>(null);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error("Failed to stop scanner", err));
      }
    };
  }, []);

  const loadQrLibrary = async () => {
    const module = await import('html5-qrcode');
    return module.Html5Qrcode;
  };

  const startScan = async () => {
    if (scannerRegionRef.current && !isScanning) {
      setScannerError(null);

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasPermission(false);
        setScannerError('This browser does not support camera scanning.');
        toast({
          title: 'Browser Not Supported',
          description: 'Your browser does not support camera access for QR scanning.',
          variant: 'destructive',
        });
        return;
      }

      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setHasPermission(false);
        setScannerError('Camera scanning requires HTTPS or localhost.');
        toast({
          title: 'Secure Context Required',
          description: 'Use HTTPS (or localhost) to access the camera.',
          variant: 'destructive',
        });
        return;
      }

      const qrCodeSuccessCallback = (decodedText: string) => {
        try {
          const data = JSON.parse(decodedText) as ScannedData;
          if (data.type === 'volunteer' || data.type === 'student') {
            setScannedData(data);
            toast({
              title: "QR Code Scanned!",
              description: `Details for ${data.name} loaded.`,
            });
            stopScan();
          } else {
            throw new Error("Invalid QR code format.");
          }
        } catch (error) {
          console.error("Error parsing QR code", error);
           toast({
            title: "Invalid QR Code",
            description: "This QR code does not contain valid data.",
            variant: "destructive",
          });
        }
      };

      const qrCodeErrorCallback = () => {};

      try {
        const Html5Qrcode = await loadQrLibrary();

        if (!html5QrCodeRef.current && scannerRegionRef.current) {
          html5QrCodeRef.current = new Html5Qrcode(scannerRegionRef.current.id);
        }

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setHasPermission(false);
          setScannerError('No camera device was found on this device.');
          toast({
            title: 'No Camera Found',
            description: 'No usable camera was detected for QR scanning.',
            variant: 'destructive'
          });
          return;
        }

        const preferredCamera = cameras.find((camera) => /back|rear|environment/i.test(camera.label)) || cameras[0];

        if (html5QrCodeRef.current) {
          await html5QrCodeRef.current.start(
            preferredCamera.id,
            { fps: 10, qrbox: { width: 250, height: 250 } },
            qrCodeSuccessCallback,
            qrCodeErrorCallback
          );
          setIsScanning(true);
          setScannedData(null);
          setHasPermission(true);
        }
      } catch (err) {
        console.error("Error starting scanner", err);
        setHasPermission(false);
        setScannerError('Could not start camera. Check camera permission and browser support, then try again.');
        toast({
          title: "Camera Error",
          description: "Could not start camera. Please check permissions and try again.",
          variant: "destructive"
        });
      }
    }
  };

  const stopScan = () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop()
        .then(() => setIsScanning(false))
        .catch(err => console.error("Failed to stop scanner", err));
    }
  };

  const handleVolunteerAttendance = async () => {
      if (!scannedData || scannedData.type !== 'volunteer' || !db) return;
      setIsCheckingIn(true);
      const shiftId = `${scannedData.volunteerId}_${scannedData.shift.replace(/\s+/g, '-')}`;
      const shiftRef = doc(db, 'jobFairs', 'main-job-fair-2024', 'volunteerShifts', shiftId);
      
      try {
          const dataToUpdate = { isAttended: true, attendedAt: serverTimestamp() };
          await updateDoc(shiftRef, dataToUpdate);
          toast({
              title: "Attendance Marked",
              description: `${scannedData.name} has been marked as attended for their shift.`,
          });
      } catch (err) {
          console.error("Failed to mark attendance", err);
          const permissionError = new FirestorePermissionError({
              path: shiftRef.path,
              operation: 'update',
              requestResourceData: { isAttended: true },
          });
          errorEmitter.emit('permission-error', permissionError);
      } finally {
          setIsCheckingIn(false);
      }
  }

  const handleStudentCheckIn = async () => {
      if (!scannedData || scannedData.type !== 'student' || !db) return;
      setIsCheckingIn(true);
      const spotRef = doc(db, 'jobFairs', 'main-job-fair-2024', 'projectSpotAssignments', scannedData.studentId);
      
      try {
          const dataToUpdate = { checkedIn: true, checkedInAt: serverTimestamp() };
          await updateDoc(spotRef, dataToUpdate);
          toast({
              title: "Student Present",
              description: `${scannedData.name} has been marked as present at their spot.`,
          });
      } catch (err) {
          console.error("Failed to mark student present", err);
          const permissionError = new FirestorePermissionError({
              path: spotRef.path,
              operation: 'update',
              requestResourceData: { checkedIn: true },
          });
          errorEmitter.emit('permission-error', permissionError);
      } finally {
          setIsCheckingIn(false);
      }
  }

  const renderScannedData = () => {
    if (!scannedData) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center text-muted-foreground">
          <QrCode className="h-16 w-16 mx-auto" />
          <p className="mt-4">Scan a QR code to see details</p>
        </div>
      );
    }

    if (scannedData.type === 'volunteer') {
      return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16"><AvatarFallback>{scannedData.name.charAt(0)}</AvatarFallback></Avatar>
                <div>
                    <h3 className="text-xl font-bold">{scannedData.name}</h3>
                    <p className="text-muted-foreground">{scannedData.volunteerId}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 text-sm">
                <div><p className="font-semibold">Assigned Role</p><Badge>{scannedData.role}</Badge></div>
                <div><p className="font-semibold">Shift Time</p><p>{scannedData.shift}</p></div>
                {scannedData.company && (<div><p className="font-semibold">Assigned Company / Room</p><p>{scannedData.company} / {scannedData.room}</p></div>)}
            </div>
            <Button className="w-full" variant="secondary" onClick={handleVolunteerAttendance} disabled={isCheckingIn}><UserCheck className="mr-2 h-4 w-4" /> Mark as Attended</Button>
        </div>
      );
    }
    
    if (scannedData.type === 'student') {
        return (
             <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16"><AvatarFallback>{scannedData.name.charAt(0)}</AvatarFallback></Avatar>
                <div>
                    <h3 className="text-xl font-bold">{scannedData.name}</h3>
                    <p className="text-muted-foreground">{scannedData.studentId}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 text-sm">
                <div><p className="font-semibold">Project Name</p><p>{scannedData.projectName || 'N/A'}</p></div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span className="font-semibold">Room:</span> {scannedData.roomNumber}</div>
                <div className="flex items-center gap-2"><LayoutGrid className="h-4 w-4" /><span className="font-semibold">Spot:</span> {scannedData.spotNumber}</div>
            </div>
            <Button className="w-full" onClick={handleStudentCheckIn} disabled={isCheckingIn}><UserCheck className="mr-2 h-4 w-4" /> Mark as Present at Spot</Button>
        </div>
        )
    }

    return null;
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Dashboard
                </Link>
            </Button>
            <h1 className="text-2xl font-bold">Admin QR Scanner</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                <CardTitle>QR Code Scanner</CardTitle>
                <CardDescription>Scan a badge to verify details and mark attendance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div id="scanner-region" ref={scannerRegionRef} className="w-full aspect-square bg-muted rounded-md overflow-hidden flex items-center justify-center">
                    {!isScanning && (
                        <div className="text-center text-muted-foreground">
                            <QrCode className="h-16 w-16 mx-auto" />
                            <p className="mt-2">Camera is ready for scanning</p>
                        </div>
                    )}
                </div>
                {hasPermission === false && (
                    <Alert variant="destructive">
                    <CameraOff className="h-4 w-4" />
                    <AlertTitle>Camera Permission Denied</AlertTitle>
                    <AlertDescription>
                        {scannerError || 'Please grant camera access in your browser settings to use the scanner.'}
                    </AlertDescription>
                    </Alert>
                )}

                {hasPermission === null && !isScanning && (
                  <Alert>
                    <Camera className="h-4 w-4" />
                    <AlertTitle>Ready to Scan</AlertTitle>
                    <AlertDescription>
                      Click Start Scan to request camera access and begin scanning badges.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-4">
                    <Button onClick={startScan} disabled={isScanning || hasPermission === false} className="w-full">
                        <Camera className="mr-2 h-4 w-4" /> Start Scan
                    </Button>
                    <Button onClick={stopScan} disabled={!isScanning} variant="outline" className="w-full">
                        <CameraOff className="mr-2 h-4 w-4" /> Stop Scan
                    </Button>
                </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>Scanned Details</CardTitle>
                <CardDescription>Information from the scanned badge will appear here.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderScannedData()}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}