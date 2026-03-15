'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Shield, ArrowLeft, LayoutDashboard, LogOut, AlertCircle, Loader2, LockKeyhole, UserCog } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const loginFormSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function AdminLoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const firebaseAuth = useFirebaseAuth();
  const { user, role, loading: authLoading } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setLoading(true);
    setConfigError(null);

    // Strict Hardcoded Credentials Check for UI redirection
    const isCorrectUsername = data.username === 'admin';
    const isCorrectPassword = data.password === 'Case@1969';
    const emailToUse = 'admin@example.com';

    if (!isCorrectUsername || !isCorrectPassword) {
      toast({
        title: 'Access Denied',
        description: 'Invalid administrator credentials.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      // 1. Attempt sign in with the internal master email
      await signInWithEmailAndPassword(firebaseAuth, emailToUse, data.password);
      toast({
        title: 'Login Successful',
        description: 'Welcome to the Control Center.',
      });
      router.push('/dashboard');
    } catch (error: any) {
      // Handle specific configuration errors
      if (error.code === 'auth/operation-not-allowed') {
        setConfigError('Authentication providers are not enabled in the Firebase Console.');
        setLoading(false);
        return;
      }

      // 2. Handle cases where the account might not exist (first login)
      // Note: auth/invalid-credential is the generic error for user-not-found/wrong-password in v11+
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          // Attempt to create the account if sign-in failed due to non-existence
          await createUserWithEmailAndPassword(firebaseAuth, emailToUse, data.password);
          toast({
            title: 'Master Account Initialized',
            description: 'The administrator account has been set up and logged in.',
          });
          router.push('/dashboard');
        } catch (createError: any) {
          // If creation fails with 'email-already-in-use', it means the sign-in failed 
          // because the password entered didn't match the existing master account.
          if (createError.code === 'auth/email-already-in-use') {
             toast({
                title: 'Authentication Error',
                description: 'Incorrect password for the master administrator account.',
                variant: 'destructive',
              });
          } else {
            console.error('Admin Initialization Error:', createError.code);
            toast({
                title: 'Setup Failed',
                description: 'Could not initialize master account. Please check your credentials.',
                variant: 'destructive',
            });
          }
        }
      } else {
        console.error('Admin Login Error:', error.code);
        toast({
          title: 'Authentication Error',
          description: 'A network or system error occurred. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(firebaseAuth);
      toast({
        title: 'Signed Out',
        description: 'Admin session ended successfully.',
      });
      router.replace('/admin/login');
      router.refresh();
    } catch {
      toast({
        title: 'Sign Out Failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  if (user && !user.isAnonymous && role === 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-primary/20">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Administrator Session Active</CardTitle>
            <CardDescription className="pt-2">
              You are currently signed in as <span className="font-bold text-foreground">Administrator</span>.
            </CardDescription>
            <div className="pt-2">
              <Badge variant="outline" className="text-green-700 border-green-700/20 bg-green-700/5">Secure Session</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full h-12 text-base">
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-5 w-5" />
                Go to Admin Dashboard
              </Link>
            </Button>
            <Button variant="outline" className="w-full h-12 text-base border-destructive/20 text-destructive hover:bg-destructive/10" onClick={handleLogout}>
              <LogOut className="mr-2 h-5 w-5" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 mb-4">
            <Shield className="h-12 w-12 text-primary" />
            <span className="text-2xl font-bold">Administrator Access</span>
            <p className="text-sm text-muted-foreground text-center">Restricted area for authorized event management only.</p>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Admin Login</CardTitle>
              <Badge variant="outline">Protected</Badge>
            </div>
            <CardDescription>
              Enter secure credentials to access the management portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <LockKeyhole className="h-4 w-4" />
              <AlertTitle>Security Notice</AlertTitle>
              <AlertDescription>
                This portal controls approvals, assignments, attendance, and event operations.
              </AlertDescription>
            </Alert>

            {configError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Configuration Required</AlertTitle>
                <AlertDescription>{configError}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="admin" type="text" {...field} />
                      </FormControl>
                      <FormDescription>Use the administrator username provided by system owner.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" type="password" {...field} />
                      </FormControl>
                      <FormDescription>Credentials are case-sensitive.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={loading} className="w-full h-11">
                  <UserCog className="mr-2 h-4 w-4" />
                  {loading ? 'Verifying...' : 'Sign In as Administrator'}
                </Button>
              </form>
            </Form>
             <p className="mt-8 text-center text-sm">
                <Link href="/" className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Portal Selection
                </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
