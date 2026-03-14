'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { GraduationCap, LogOut, LayoutDashboard, ArrowLeft, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const loginFormSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48" {...props}>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.804 12.191C34.522 8.362 29.582 6 24 6C12.955 6 4 14.955 4 26s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691c-2.238 4.14-3.47 8.92-3.47 14.111h.01A20.002 20.002 0 0 0 24 46c5.21 0 10.02-1.92 13.79-5.181L30.707 32.89C28.586 34.68 26.37 36 24 36c-5.202 0-9.619-3.317-11.283-7.946L6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 46c6.413 0 12.24-2.73 16.38-7.234L30.707 32.89c-2.655 1.8-5.82 2.91-9.29 2.91-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.804 12.191C34.522 8.362 29.582 6 24 6c-6.413 0-12.24 2.73-16.38 7.234L12.7 20.73c2.238-4.14 6.64-7.234 11.3-7.234z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-0.792 2.237-2.231 4.16-4.087 5.571l7.007 7.007C41.21 37.05 44 32.1 44 26c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const firebaseAuth = useFirebaseAuth();
  const { user, role, loading: authLoading, profileName } = useAuth();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setLoading(true);
    setConfigError(null);
    try {
      await signInWithEmailAndPassword(firebaseAuth, data.email, data.password);
      toast({
        title: 'Login Successful!',
        description: 'Welcome back!',
      });
      router.push('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        setConfigError('Email sign-in is currently disabled. Please enable it in the Firebase Console.');
      } else {
        toast({
          title: 'Authentication Failed',
          description: "Please check your email and password.",
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setConfigError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(firebaseAuth, provider);
      router.push('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        setConfigError('Google sign-in is not enabled in the Firebase Console.');
      } else {
        console.error('Google Sign-In failed:', error);
        toast({
          title: 'Sign In Failed',
          description: 'An error occurred during Google Sign-In.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({ title: 'Email Required', description: 'Enter your email to receive a reset link.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, resetEmail);
      toast({ title: 'Reset Link Sent', description: 'Check your inbox for password reset instructions.' });
      setIsResetDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      toast({ title: 'Request Failed', description: 'Unable to send reset email at this time.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(firebaseAuth);
    router.push('/'); 
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <GraduationCap className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (user && !user.isAnonymous && role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-primary/20">
          <CardHeader className="text-center">
            <GraduationCap className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Active Session Found</CardTitle>
            <CardDescription className="pt-2">
              You are signed in as <span className="font-bold text-foreground">{profileName || user.email}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full h-12 text-base">
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-5 w-5" />
                Go to My Dashboard
              </Link>
            </Button>
            <Button variant="outline" className="w-full h-12 text-base border-destructive/20 text-destructive hover:bg-destructive/10" onClick={handleLogout}>
              <LogOut className="mr-2 h-5 w-5" />
              Sign Out & Use Different Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-2">
            <GraduationCap className="h-12 w-12 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">C@SE JOBFAIR</h1>
            <p className="text-muted-foreground">Sign in to your account</p>
        </div>
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Access your personalized portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {configError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Provider Disabled</AlertTitle>
                <AlertDescription>{configError}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="name@case.edu.pk" type="email" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto text-xs text-primary"
                          onClick={() => setIsResetDialogOpen(true)}
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <FormControl>
                        <Input placeholder="••••••••" type="password" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
                  {loading ? 'Authenticating...' : 'Sign In'}
                </Button>
              </form>
            </Form>
            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                    </span>
                </div>
            </div>
            <Button variant="outline" className="w-full h-11 text-base border-muted-foreground/20" onClick={handleGoogleSignIn} disabled={loading}>
                <GoogleIcon className="mr-2 h-5 w-5" />
                Sign in with Google
            </Button>
            <div className="mt-8 flex flex-col items-center gap-4 text-sm text-muted-foreground">
                <div>
                  Don't have an account yet?{' '}
                  <Link href="/register" className="font-bold text-primary hover:underline">
                      Register Now
                  </Link>
                </div>
                <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  Return to Portal Selection
                </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recover Your Password</AlertDialogTitle>
            <AlertDialogDescription>
              We'll send a password recovery link to your registered email address.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              id="reset-email"
              placeholder="name@case.edu.pk"
              type="email"
              value={resetEmail}
              className="h-11"
              onChange={(e) => setResetEmail(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetEmail('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePasswordReset} disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading ? 'Sending...' : 'Send Recovery Link'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
