
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { departments } from "@/lib/types";
import { studentSchema, type StudentSchema as StudentFormValues } from "@/lib/schemas";
import { useFirebase } from "@/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { GraduationCap, ArrowLeft } from "lucide-react";

export default function StudentRegistrationPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { auth, firestore } = useFirebase();

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema.pick({ 
        fullName: true, 
        registrationNumber: true, 
        department: true,
        semester: true,
        email: true,
        password: true,
    })),
    defaultValues: {
      fullName: "",
      registrationNumber: "",
      semester: "",
      email: "",
      password: "",
      department: "Computer Science",
    },
  });

  async function onSubmit(data: Omit<StudentFormValues, "password"> & { password?: string }) {
    if (!data.password) {
        toast({ title: "Password is required", variant: "destructive" });
        return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // Send verification email
      await sendEmailVerification(user);

      await setDoc(doc(firestore, "userProfiles", user.uid), {
        id: user.uid,
        email: user.email,
        name: data.fullName,
        roles: ["student"],
        createdAt: serverTimestamp(),
      });

      const { password, ...studentData } = data;
      await setDoc(doc(firestore, "students", user.uid), {
        ...studentData,
        id: user.uid,
        userProfileId: user.uid,
        status: "pending",
        eligibilityApproved: false,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Registration Successful!",
        description:
          "Please check your inbox to verify your email. Your profile is pending approval.",
      });
      router.push("/login");
    } catch (error: any) {
      console.error("Error adding document: ", error);
      
      let errorMessage = "An error occurred while submitting your registration.";
      
      if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/Password registration is not enabled in the Firebase Console.';
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please log in instead.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="container mx-auto max-w-2xl py-12">
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
          <CardTitle>Student Registration</CardTitle>
          <CardDescription>
            Create your profile to connect with companies and opportunities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="registrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl>
                        <Input placeholder="2230-0128" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dep) => (
                            <SelectItem key={dep} value={dep}>
                              {dep}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="semester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semester</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 8th" {...field} />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@case.edu.pk"
                          type="email"
                          {...field}
                        />
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
              </div>
              <div className="flex justify-between items-center">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Registering..." : "Register"}
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
