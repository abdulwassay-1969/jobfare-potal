'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { Clock, XCircle, Mail, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getEmailVerificationActionSettings } from '@/lib/auth-email';

export function PendingApprovalMessage() {
    const { profileName } = useAuth();
    const name = profileName || 'User';

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Welcome, {name}!</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Registration Pending Approval</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center">
                    <Clock className="h-16 w-16 mx-auto text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Your account is under review.</h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                        Thank you for registering. Your profile is being reviewed by an administrator and you will be notified upon approval. You may log out and check back later.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export function RejectedMessage() {
    const { profileName } = useAuth();
    const name = profileName || 'User';

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Welcome, {name}!</h1>
            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Registration Rejected</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center">
                    <XCircle className="h-16 w-16 mx-auto text-destructive" />
                    <h3 className="mt-4 text-lg font-semibold">Your application has been rejected.</h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                        Unfortunately, your registration could not be approved at this time. If you believe this is an error, please contact the event administration.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export function EmailVerificationMessage() {
    const { user } = useAuth();
    const firebaseAuth = useFirebaseAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Automatic polling to detect when the user clicks the link in their email
    useEffect(() => {
        if (!user || user.emailVerified) return;

        const interval = setInterval(async () => {
            try {
                await user.reload();
                if (user.emailVerified) {
                    clearInterval(interval);
                    window.location.reload();
                }
            } catch (error) {
                // Silently ignore errors during polling (e.g. network blips)
            }
        }, 3000); // Check every 3 seconds

        return () => clearInterval(interval);
    }, [user]);

    const handleResend = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await sendEmailVerification(user, getEmailVerificationActionSettings());
            toast({
                title: "Verification Email Sent",
                description: "Please check your inbox (and spam folder) for the verification link.",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to resend verification email.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await signOut(firebaseAuth);
        router.push('/');
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] p-4">
            <Card className="w-full max-w-md shadow-lg border-primary/20">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
                    <div className="text-muted-foreground mt-2 text-sm">
                        We've sent a verification link to:
                        <p className="font-bold text-foreground block mt-1">{user?.email}</p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                    <p className="text-sm leading-relaxed">
                        Please check your inbox and click the verification link to activate your account.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-primary font-medium text-sm animate-pulse">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Waiting for verification...
                    </div>
                    <div className="flex flex-col gap-3">
                        <Button variant="outline" onClick={handleResend} disabled={loading} className="w-full h-11">
                            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                            Resend Verification Email
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center border-t pt-4">
                    <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors">
                        Sign Out & Try Again
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
