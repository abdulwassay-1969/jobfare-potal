'use client';

import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Volunteer, departments } from '@/lib/types';
import { volunteerSchema, VolunteerSchema as VolunteerProfileFormValues } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Camera } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function VolunteerProfile() {
  const { user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<VolunteerProfileFormValues>({
    resolver: zodResolver(volunteerSchema.omit({ password: true })),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      registrationNumber: "",
      department: "Computer Science",
      semester: "",
      photoUrl: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'volunteers', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Volunteer;
        form.reset(data);
      } else {
        form.reset({
            ...form.getValues(),
            email: user.email || "",
            photoUrl: "",
        })
      }
    });
    return () => unsub();
  }, [user, form, db]);

  const onSubmit = (data: VolunteerProfileFormValues) => {
    if (!user) return;
    const dataToUpdate = { ...data, updatedAt: serverTimestamp() };
    const docRef = doc(db, 'volunteers', user.uid);
    
    setDoc(docRef, dataToUpdate, { merge: true })
      .then(() => {
        toast({
          title: 'Profile Updated',
          description: 'Your changes have been saved successfully.',
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('photoUrl', reader.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const fallback = user?.email ? user.email.charAt(0).toUpperCase() : "V";
  const photoUrl = form.watch('photoUrl');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Volunteer Profile</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <CardDescription>
                Keep your contact information up-to-date for event coordination.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex items-center gap-6">
                 <div className="relative">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={photoUrl} alt={form.getValues("fullName")} />
                        <AvatarFallback>{fallback}</AvatarFallback>
                    </Avatar>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="absolute bottom-0 right-0 rounded-full"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Camera className="h-4 w-4" />
                        <span className="sr-only">Upload photo</span>
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg, image/gif"
                        onChange={handlePhotoUpload}
                    />
                </div>
                <div className="grid gap-1.5">
                  <h2 className="text-3xl font-bold">{form.watch('fullName') || 'Volunteer'}</h2>
                  <p className="text-md text-muted-foreground">{form.watch('email')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  name="fullName"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="phoneNumber"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input type="text" inputMode="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="registrationNumber"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        value={field.value}
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
                  name="semester"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semester</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
