
'use client';

import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Company, companyHiringFor } from '@/lib/types';
import { companySchema, CompanySchema as CompanyProfileFormValues } from '@/lib/schemas';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Camera, Building } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';


export function CompanyProfile() {
  const { user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: '',
      industry: '',
      hrName: '',
      email: '',
      phoneNumber: '',
      website: '',
      description: '',
      logoUrl: '',
      representatives: 1,
      hiringFor: 'Both',
      needsInterviewRoom: false,
      equipmentRequirements: '',
    },
  });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'companies', user.uid), (doc) => {
      if (doc.exists()) {
        form.reset(doc.data() as Company);
      } else {
         form.reset({
            ...form.getValues(),
            email: user.email || "",
        })
      }
    });
    return () => unsub();
  }, [user, form, db]);

  const onSubmit = (data: CompanyProfileFormValues) => {
    if (!user) return;
    
    const { password, ...companyData } = data;
    const dataToUpdate = { ...companyData, updatedAt: serverTimestamp() };
    const docRef = doc(db, 'companies', user.uid);

    setDoc(docRef, dataToUpdate, { merge: true })
      .then(() => {
        toast({
          title: 'Profile Updated',
          description: 'Your company profile has been saved successfully.',
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

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('logoUrl', reader.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const fallback = form.watch('companyName') ? form.watch('companyName').charAt(0).toUpperCase() : <Building />;
  const logoUrl = form.watch('logoUrl');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Company Profile</h1>
       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Manage your public profile and event participation details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
               <div className="flex items-center gap-6">
                 <div className="relative">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={logoUrl} alt={form.getValues("companyName")} />
                        <AvatarFallback className="text-3xl">{fallback}</AvatarFallback>
                    </Avatar>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="absolute bottom-0 right-0 rounded-full"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Camera className="h-4 w-4" />
                        <span className="sr-only">Upload logo</span>
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg, image/gif"
                        onChange={handleLogoUpload}
                    />
                </div>
                <div className="grid gap-1.5">
                  <h2 className="text-3xl font-bold">{form.watch('companyName') || 'Your Company'}</h2>
                  <p className="text-md text-muted-foreground">{form.watch('industry')}</p>
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="industry" render={({ field }) => (<FormItem><FormLabel>Industry</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="hrName" render={({ field }) => (<FormItem><FormLabel>HR Contact Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="phoneNumber" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="text" inputMode="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Official Email</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Company Website</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
               </div>

                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Company Description</FormLabel><FormControl><Textarea placeholder="Tell students about your company" className="min-h-[120px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
                
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
                  <FormField control={form.control} name="hiringFor" render={({ field }) => (
                      <FormItem>
                      <FormLabel>Hiring For</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                          {companyHiringFor.map(role => ( <SelectItem key={role} value={role}>{role}</SelectItem>))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="equipmentRequirements" render={({ field }) => (<FormItem><FormLabel>Special Equipment Requirements</FormLabel><FormControl><Textarea placeholder="e.g., extra power outlets, a larger table, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="needsInterviewRoom" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base">Need an Interview Room?</FormLabel>
                            <FormDescription>Check this if you'll need a dedicated room for conducting interviews.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )} />

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
