
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { companyHiringFor } from '@/lib/types';
import { companySchema, type CompanySchema as CompanyFormValues } from '@/lib/schemas';
import { useFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification } from 'firebase/auth';
import { collection, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { getEmailVerificationActionSettings } from '@/lib/auth-email';

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

export default function CompanyRegistrationPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { auth, firestore } = useFirebase();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: '',
      industry: '',
      hrName: '',
      email: '',
      password: '',
      phoneNumber: '',
      website: '',
      representatives: 1,
      hiringFor: 'Both',
      needsInterviewRoom: false,
      equipmentRequirements: '',
    },
  });

  async function onSubmit(data: CompanyFormValues) {
    if (!data.password) {
        toast({ title: "Password is required", variant: "destructive" });
        return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      await sendEmailVerification(user, getEmailVerificationActionSettings());

      await setDoc(doc(firestore, 'userProfiles', user.uid), {
        id: user.uid,
        email: user.email,
        name: data.hrName,
        roles: ['company'],
        createdAt: serverTimestamp(),
      });

      const { password, ...companyData } = data;
      await setDoc(doc(firestore, 'companies', user.uid), {
        ...companyData,
        id: user.uid,
        userProfileId: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Registration Submitted!',
        description: 'Please check your inbox to verify your email. Your profile is pending approval.',
      });
      router.push('/login');
    } catch (error: any) {
      console.error('Registration error: ', error);
      
      let errorMessage = 'An error occurred while submitting your registration.';
      
      if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/Password registration is not enabled in the Firebase Console.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please log in or use a different address.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }

  const handleGoogleSignUp = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userProfileRef = doc(firestore, 'userProfiles', user.uid);
      const userProfileSnap = await getDoc(userProfileRef);
      if (userProfileSnap.exists()) {
        toast({
          title: 'Account Already Exists',
          description: 'An account with this email already exists. Please log in.',
          variant: 'destructive',
        });
        router.push('/login');
        return;
      }

      await setDoc(userProfileRef, {
        id: user.uid,
        email: user.email,
        name: user.displayName,
        roles: ['company'],
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(firestore, 'companies', user.uid), {
        id: user.uid,
        userProfileId: user.uid,
        hrName: user.displayName || 'N/A',
        email: user.email,
        companyName: 'N/A (Please update)',
        industry: 'N/A (Please update)',
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Registration Submitted!',
        description: 'Please complete your company profile.',
      });
      router.push('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        toast({
          title: 'Provider Disabled',
          description: 'Google sign-in is not enabled in the Firebase Console.',
          variant: 'destructive',
        });
      } else if (error.code === 'auth/unauthorized-domain') {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        toast({
          title: 'Google Sign-In Blocked',
          description: `Add ${currentHost} in Firebase Console → Authentication → Settings → Authorized domains.`,
          variant: 'destructive',
        });
      } else {
        console.error('Google Sign-Up failed:', error);
        toast({
          title: 'Sign Up Failed',
          description: error.message || 'Could not sign up with Google. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };


  return (
    <div className="container mx-auto max-w-3xl py-12">
        <div className="flex flex-col items-center mb-8">
            <Link href="/" className="flex items-center gap-2 mb-4 text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Portal Selection
            </Link>
            <div className="flex justify-center items-center gap-2">
                <GraduationCap className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">C@SE JOBFAIR</span>
            </div>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Company Registration</CardTitle>
                <CardDescription>
                    Register your company to participate in the C@SE Job Fair.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                          Sign up with Google
                          </span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleGoogleSignUp} type="button">
                        <GoogleIcon className="mr-2 h-5 w-5" />
                        Sign up with Google
                    </Button>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                          Or with an email
                          </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Innovatech" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Software Development" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="hrName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>HR Contact Name</FormLabel>
                            <FormControl>
                            <Input placeholder="John Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                            <Input placeholder="03001234567" type="text" inputMode="tel" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Official Email</FormLabel>
                            <FormControl>
                            <Input placeholder="hr@innovatech.com" type="email" {...field} />
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
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                            <Input placeholder="******" type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                        <FormItem className="md:col-span-2">
                            <FormLabel>Company Website</FormLabel>
                            <FormControl>
                            <Input placeholder="https://innovatech.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <FormField
                            control={form.control}
                            name="representatives"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Number of Representatives</FormLabel>
                                <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  value={field.value ?? ''} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    field.onChange(val === '' ? undefined : Number(val));
                                  }}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="hiringFor"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hiring For</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select what you are hiring for" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {companyHiringFor.map(role => (
                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                     </div>
                    <FormField
                        control={form.control}
                        name="equipmentRequirements"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Special Equipment Requirements</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="e.g., extra power outlets, a larger table, etc."
                                {...field}
                                />
                            </FormControl>
                             <FormDescription>
                                Let us know if you have any special requirements for your booth.
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="needsInterviewRoom"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                    Need an Interview Room?
                                    </FormLabel>
                                    <FormDescription>
                                    Check this if you'll need a dedicated room for conducting interviews.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-between items-center">
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? "Submitting..." : "Submit Registration"}
                        </Button>
                        <Button variant="link" asChild>
                            <Link href="/login">Already have an account?</Link>
                        </Button>
                    </div>
                </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
