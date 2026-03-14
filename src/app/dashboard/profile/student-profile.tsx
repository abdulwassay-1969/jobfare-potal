'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, onSnapshot, setDoc, serverTimestamp, writeBatch, arrayUnion, arrayRemove, addDoc, collection, updateDoc, getDoc, query as firestoreQuery, where, documentId, deleteField } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Student, Project } from '@/lib/types';
import { studentSchema, StudentSchema as StudentProfileFormValues, projectSchema, ProjectSchema } from '@/lib/schemas';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Trash2, PlusCircle, Eye, GraduationCap, Briefcase, Users, FolderKanban, Copy, LogOut, Languages, Star, UserRound } from 'lucide-react';
import Link from 'next/link';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TeamMembersList = ({ memberIds, currentUserId }: { memberIds: string[], currentUserId: string }) => {
    const db = useFirestore();
    const membersQuery = useMemoFirebase(() => {
        if (!db || !memberIds || memberIds.length === 0) return null;
        return firestoreQuery(collection(db, 'students'), where(documentId(), 'in', memberIds));
    }, [db, memberIds]);

    const { data: members, isLoading } = useCollection<Student>(membersQuery);

    if (isLoading) return <Skeleton className="h-8 w-full" />;

    return (
        <ul className="space-y-2">
            {members?.map(member => (
                <li key={member.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-background">
                    <span>{member.fullName} {member.id === currentUserId && '(You)'}</span>
                    <span className="text-muted-foreground">{member.registrationNumber}</span>
                </li>
            ))}
        </ul>
    );
}


function ManageProject() {
    const { user } = useAuth();
    const db = useFirestore();
    const { toast } = useToast();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
    const [joinProjectId, setJoinProjectId] = useState('');

    const { data: student, isLoading: studentLoading } = useDoc<Student>(
        useMemoFirebase(() => user ? doc(db, 'students', user.uid) : null, [user, db])
    );

    const { data: project, isLoading: projectLoading } = useDoc<Project>(
        useMemoFirebase(() => (db && student?.projectId) ? doc(db, 'projects', student.projectId) : null, [db, student])
    );
    
    const projectForm = useForm<ProjectSchema>({
      resolver: zodResolver(projectSchema),
      defaultValues: { name: '', description: '' },
    });

    useEffect(() => {
        if(project) {
            projectForm.reset({ name: project.name, description: project.description });
        }
    }, [project, projectForm]);

    const handleCreateProject = async (data: ProjectSchema) => {
        if (!user) return;
        const batch = writeBatch(db);
        const studentRef = doc(db, 'students', user.uid);

        const projectRef = doc(collection(db, 'projects'));
        const projectData = {
            ...data,
            id: projectRef.id,
            teamMemberIds: [user.uid],
            jobFairId: "main-job-fair-2024",
            createdAt: serverTimestamp(),
        };
        batch.set(projectRef, projectData);

        // Denormalize project info onto student doc
        batch.update(studentRef, { projectId: projectRef.id, projectName: data.name });

        batch.commit().then(() => {
            toast({ title: "Project Created!", description: `"${data.name}" has been created.` });
            setIsCreateDialogOpen(false);
        }).catch(serverError => {
             const permissionError = new FirestorePermissionError({
                path: 'batch-write (create project)', 
                operation: 'write',
                requestResourceData: { project: projectData, studentUpdate: { projectId: projectRef.id }},
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }

    const handleJoinProject = async () => {
        if (!user || !joinProjectId) return;
        
        const projectRef = doc(db, 'projects', joinProjectId);
        const studentRef = doc(db, 'students', user.uid);

        const projectSnap = await getDoc(projectRef);
        if (!projectSnap.exists()) {
            toast({ title: "Error", description: "Project ID not found.", variant: 'destructive' });
            return;
        }
        const projectData = projectSnap.data();
        const batch = writeBatch(db);
        
        // Add student to project's team list
        batch.update(projectRef, { teamMemberIds: arrayUnion(user.uid) });
        
        // Denormalize project info onto student doc
        batch.update(studentRef, { projectId: joinProjectId, projectName: projectData.name });

        batch.commit().then(() => {
            toast({ title: "Joined Project!", description: `You have been added to "${projectData.name}".` });
            setIsJoinDialogOpen(false);
        }).catch(serverError => {
             const permissionError = new FirestorePermissionError({
                path: projectRef.path, 
                operation: 'write', 
                requestResourceData: { joinProject: joinProjectId, updateUser: user.uid },
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }

    const handleLeaveProject = async () => {
      if (!user || !student?.projectId) return;

      const projectRef = doc(db, 'projects', student.projectId);
      const studentRef = doc(db, 'students', user.uid);

      const batch = writeBatch(db);

      // Remove student from project's team list
      batch.update(projectRef, { teamMemberIds: arrayRemove(user.uid) });
      
      // Remove project info from student doc
      batch.update(studentRef, { projectId: deleteField(), projectName: deleteField() });

      batch.commit().then(() => {
        toast({ title: "You have left the project." });
      }).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: projectRef.path,
            operation: 'write',
            requestResourceData: { leaveProject: student.projectId },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
    }

    const handleUpdateProject = async (data: ProjectSchema) => {
        if (!project) return;
        const projectRef = doc(db, 'projects', project.id);
        const dataToUpdate = { ...data, updatedAt: serverTimestamp() };
        
        updateDoc(projectRef, dataToUpdate)
          .then(() => toast({ title: "Project Updated!" }))
          .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: projectRef.path,
                operation: 'update',
                requestResourceData: dataToUpdate,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
    
    if (studentLoading) {
      return <Skeleton className="h-40 w-full" />
    }

    if (project) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>My Project</CardTitle>
                    <CardDescription>Manage your shared project details and team.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Form {...projectForm}>
                        <form onSubmit={projectForm.handleSubmit(handleUpdateProject)} className="space-y-4">
                             <FormField
                                name="name"
                                control={projectForm.control}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Project Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                name="description"
                                control={projectForm.control}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Project Description</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} className="min-h-[100px]" />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={projectForm.formState.isSubmitting}>Save Project Details</Button>
                        </form>
                    </Form>
                    <div className="space-y-2">
                        <Label>Project Team</Label>
                        {projectLoading ? <Skeleton className="h-20 w-full"/> : <TeamMembersList memberIds={project.teamMemberIds} currentUserId={user!.uid} />}
                    </div>
                    <Alert>
                        <AlertDescription className="flex flex-col sm:flex-row items-center justify-between gap-2">
                            <div className="flex-grow">
                                <strong className="text-foreground">Share this ID to invite members:</strong>
                                <p className="font-mono text-sm break-all">{project.id}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(project.id)}>
                                <Copy className="mr-2 h-4 w-4" /> Copy ID
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
                <CardFooter>
                    <Button variant="destructive" onClick={handleLeaveProject}><LogOut className="mr-2"/> Leave Project</Button>
                </CardFooter>
            </Card>
        );
    }

    return (
      <>
        <Card className="p-6 flex flex-col items-center justify-center text-center space-y-4">
          <FolderKanban className="h-12 w-12 text-muted-foreground" />
          <h3 className="font-semibold">You are not part of a project yet.</h3>
          <p className="text-sm text-muted-foreground">Create a new project or join an existing one with an invite ID.</p>
          <div className="flex gap-4 pt-2">
            <Button onClick={() => setIsCreateDialogOpen(true)}>Create a Project</Button>
            <Button variant="secondary" onClick={() => setIsJoinDialogOpen(true)}>Join a Project</Button>
          </div>
        </Card>
        
        {/* Create Project Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>Give your project a name and description. You can change this later.</DialogDescription>
                </DialogHeader>
                <Form {...projectForm}>
                    <form onSubmit={projectForm.handleSubmit(handleCreateProject)} className="space-y-4 pt-4">
                       <FormField name="name" control={projectForm.control} render={({ field }) => ( <FormItem><FormLabel>Project Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                       <FormField name="description" control={projectForm.control} render={({ field }) => (<FormItem><FormLabel>Project Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={projectForm.formState.isSubmitting}>Create Project</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        
        {/* Join Project Dialog */}
        <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Join Existing Project</DialogTitle>
                    <DialogDescription>Enter the Project ID you received from a team member.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="join-id">Project ID</Label>
                    <Input id="join-id" value={joinProjectId} onChange={(e) => setJoinProjectId(e.target.value)} />
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsJoinDialogOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={handleJoinProject}>Join Project</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </>
    );
}

export function StudentProfile() {
  const { user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const form = useForm<StudentProfileFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      fullName: '',
      title: '',
      email: '',
      personalEmail: '',
      phoneNumber: '',
      address: '',
      registrationNumber: '',
      department: "Computer Science",
      semester: '',
      cgpa: undefined,
      summary: '',
      skills: [],
      education: [],
      experience: [],
      languages: [],
      hobbies: '',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: '',
      gender: '',
      maritalStatus: '',
      githubUrl: '',
      linkedinUrl: '',
      projectId: '',
    },
  });

  const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({ control: form.control, name: 'skills' });
  const { fields: langFields, append: appendLang, remove: removeLang } = useFieldArray({ control: form.control, name: 'languages' });
  const { fields: expFields, append: appendExp, remove: removeExp } = useFieldArray({ control: form.control, name: 'experience' });
  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({ control: form.control, name: 'education' });
  
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'students', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Student;
        // Ensure data is compatible with form defaults
        form.reset(data);
      }
    });
    return () => unsub();
  }, [user, form, db]);

  const onSubmit = (data: StudentProfileFormValues) => {
    if (!user) return;

    const { password, ...studentData } = data;
    const dataToUpdate = {
      ...studentData,
      updatedAt: serverTimestamp(),
    };
    const docRef = doc(db, 'students', user.uid);
    
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

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Student Profile</h1>
        <Button asChild>
          <Link href="/dashboard/profile/cv">
            <Eye className="mr-2" /> View & Download CV
          </Link>
        </Button>
      </div>

      {/* Project Management Card */}
      <ManageProject />
        
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>
                  This information will be visible to companies and on your CV.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium flex items-center gap-2"><UserRound className="h-5 w-5" /> Personal Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md">
                    <FormField name="fullName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="title" control={form.control} render={({ field }) => (<FormItem><FormLabel>Professional Title</FormLabel><FormControl><Input placeholder="e.g. Software Engineer" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="email" control={form.control} render={({ field }) => (<FormItem><FormLabel>Login Email</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormDescription>Used for login. Must be a @case.edu.pk address.</FormDescription><FormMessage /></FormItem>)} />
                    <FormField name="personalEmail" control={form.control} render={({ field }) => (<FormItem><FormLabel>Personal Email (for CV)</FormLabel><FormControl><Input placeholder="your.name@example.com" {...field} /></FormControl><FormDescription>Optional. This will be shown on your CV.</FormDescription><FormMessage /></FormItem>)} />
                    <FormField name="phoneNumber" control={form.control} render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+92 300 1234567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="address" control={form.control} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="Your full address" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="dateOfBirth" control={form.control} render={({ field }) => (<FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input placeholder="e.g., 04/07/1999" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="placeOfBirth" control={form.control} render={({ field }) => (<FormItem><FormLabel>Place of Birth</FormLabel><FormControl><Input placeholder="e.g., Islamabad, Pakistan" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="nationality" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nationality</FormLabel><FormControl><Input placeholder="e.g., Pakistani" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField
                      name="gender"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="maritalStatus"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marital Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select marital status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Single">Single</SelectItem>
                              <SelectItem value="Married">Married</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField name="hobbies" control={form.control} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Hobbies</FormLabel><FormControl><Input placeholder="e.g., Swimming, Reading, Coding" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                </div>

                <FormField name="summary" control={form.control} render={({ field }) => (<FormItem><FormLabel>Professional Summary / Profile</FormLabel><FormControl><Textarea placeholder="A brief summary about your professional goals, skills, interests or a key project." className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
                
                {/* Academic Info */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="registrationNumber" render={({ field }) => (<FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input {...field} disabled/></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="semester" render={({ field }) => (<FormItem><FormLabel>Semester</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField
                      control={form.control}
                      name="cgpa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current CGPA</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="e.g., 3.5"
                              value={field.value?.toString() ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*(\.\d*)?$/.test(value)) {
                                  field.onChange(value);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>


                {/* Skills */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium flex items-center gap-2"><Star className="h-5 w-5" /> Skills</h3>
                  <div className="space-y-4">
                    {skillFields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField name={`skills.${index}.name`} control={form.control} render={({ field }) => <FormItem><FormLabel>Skill</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                          <FormField
                            name={`skills.${index}.level`}
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Proficiency</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select proficiency" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Good">Good</SelectItem>
                                    <SelectItem value="Very Good">Very Good</SelectItem>
                                    <SelectItem value="Excellent">Excellent</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeSkill(index)} className="mt-2 text-destructive hover:text-destructive"><Trash2 className="mr-2" /> Remove Skill</Button>
                      </Card>
                    ))}
                    <Button type="button" variant="outline" onClick={() => appendSkill({ name: '', level: '' })}><PlusCircle className="mr-2" /> Add Skill</Button>
                  </div>
                </div>
                
                {/* Languages */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium flex items-center gap-2"><Languages className="h-5 w-5" /> Languages</h3>
                  <div className="space-y-4">
                    {langFields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField name={`languages.${index}.language`} control={form.control} render={({ field }) => <FormItem><FormLabel>Language</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                          <FormField
                            name={`languages.${index}.proficiency`}
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Proficiency</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select proficiency" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Fluent">Fluent</SelectItem>
                                    <SelectItem value="Good">Good</SelectItem>
                                    <SelectItem value="Basic">Basic</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeLang(index)} className="mt-2 text-destructive hover:text-destructive"><Trash2 className="mr-2" /> Remove Language</Button>
                      </Card>
                    ))}
                    <Button type="button" variant="outline" onClick={() => appendLang({ language: '', proficiency: '' })}><PlusCircle className="mr-2" /> Add Language</Button>
                  </div>
                </div>

                {/* Education */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Education</h3>
                  <div className="space-y-4">
                    {eduFields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField name={`education.${index}.institution`} control={form.control} render={({ field }) => <FormItem><FormLabel>Institution</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                          <FormField name={`education.${index}.degree`} control={form.control} render={({ field }) => <FormItem><FormLabel>Degree</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                          <FormField name={`education.${index}.field`} control={form.control} render={({ field }) => <FormItem><FormLabel>Field of Study</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                          <FormField name={`education.${index}.startDate`} control={form.control} render={({ field }) => <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input placeholder="e.g., 01/09/2020" {...field} /></FormControl><FormMessage /></FormItem>} />
                          <FormField name={`education.${index}.endDate`} control={form.control} render={({ field }) => <FormItem><FormLabel>End Date</FormLabel><FormControl><Input placeholder="e.g., 29/05/2024" {...field} /></FormControl><FormMessage /></FormItem>} />
                        </div>
                        <FormField name={`education.${index}.description`} control={form.control} render={({ field }) => <FormItem className="mt-4"><FormLabel>Description / Details</FormLabel><FormControl><Textarea placeholder="e.g., courses, thesis title" {...field} /></FormControl><FormMessage /></FormItem>} />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeEdu(index)} className="mt-2 text-destructive hover:text-destructive"><Trash2 className="mr-2" /> Remove Education</Button>
                      </Card>
                    ))}
                    <Button type="button" variant="outline" onClick={() => appendEdu({ institution: '', degree: '', field: '', startDate: '', endDate: '', description: '' })}><PlusCircle className="mr-2" /> Add Education</Button>
                  </div>
                </div>

                {/* Experience */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium flex items-center gap-2"><Briefcase className="h-5 w-5" /> Work Experience</h3>
                  <div className="space-y-4">
                    {expFields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField name={`experience.${index}.title`} control={form.control} render={({ field }) => <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                          <FormField name={`experience.${index}.company`} control={form.control} render={({ field }) => <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                          <FormField name={`experience.${index}.startDate`} control={form.control} render={({ field }) => <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input placeholder="e.g., May 2023" {...field} /></FormControl><FormMessage /></FormItem>} />
                          <FormField name={`experience.${index}.endDate`} control={form.control} render={({ field }) => <FormItem><FormLabel>End Date</FormLabel><FormControl><Input placeholder="e.g., Present" {...field} /></FormControl><FormMessage /></FormItem>} />
                        </div>
                        <FormField name={`experience.${index}.description`} control={form.control} render={({ field }) => <FormItem className="mt-4"><FormLabel>Description (use bullet points)</FormLabel><FormControl><Textarea placeholder={"- Did this\n- Achieved that"} {...field} /></FormControl><FormMessage /></FormItem>} />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeExp(index)} className="mt-2 text-destructive hover:text-destructive"><Trash2 className="mr-2" /> Remove Experience</Button>
                      </Card>
                    ))}
                    <Button type="button" variant="outline" onClick={() => appendExp({ title: '', company: '', startDate: '', endDate: '', description: '' })}><PlusCircle className="mr-2" /> Add Experience</Button>
                  </div>
                </div>

                {/* Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField name="githubUrl" control={form.control} render={({ field }) => <FormItem><FormLabel>GitHub URL</FormLabel><FormControl><Input placeholder="https://github.com/yourusername" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField name="linkedinUrl" control={form.control} render={({ field }) => <FormItem><FormLabel>LinkedIn URL</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/yourusername" {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Personal Info'}
                </Button>
              </CardFooter>
            </Card>
        </form>
      </Form>
    </div>
  );
}
