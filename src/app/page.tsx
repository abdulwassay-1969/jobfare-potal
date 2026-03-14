'use client';

import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  GraduationCap,
  Building,
  UserPlus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const registrationOptions = [
  {
    role: 'Student',
    description:
      'Join the fair to find jobs, internships, and connect with companies.',
    icon: <GraduationCap className="h-8 w-8 text-primary" />,
    href: '/register/student',
    buttonText: 'Register as Student',
  },
  {
    role: 'Company',
    description: 'Recruit top talent from Sir Syed CASE Institute of Technology.',
    icon: <Building className="h-8 w-8 text-primary" />,
    href: '/register/company',
    buttonText: 'Register as Company',
  },
  {
    role: 'Volunteer',
    description:
      'Help us make the event a success and gain valuable experience.',
    icon: <UserPlus className="h-8 w-8 text-primary" />,
    href: '/register/volunteer',
    buttonText: 'Register as Volunteer',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-2 mb-8">
        <GraduationCap className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold">Welcome to C@SE JOBFAIR</h1>
      </div>
      <p className="text-muted-foreground mb-8 max-w-lg text-center">
        Create an account or login to get started. Connect with top employers and find your next opportunity.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {registrationOptions.map((option) => (
          <Card key={option.role} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                {option.icon}
                <CardTitle>{option.role}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <CardDescription>{option.description}</CardDescription>
              <Button asChild className="mt-6 w-full">
                <Link href={option.href}>
                  {option.buttonText}{' '}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 flex flex-col items-center gap-4">
        <p className="text-center text-sm text-muted-foreground">
          Already have an account for any role?{' '}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Login here
          </Link>
        </p>
        
        <div className="pt-12 mt-12 border-t w-full max-w-xs text-center">
            <Link 
                href="/admin/login" 
                className="text-muted-foreground/40 hover:text-primary transition-colors text-xs flex items-center justify-center gap-1"
            >
                <ShieldCheck className="h-3 w-3" />
                Administrator Portal
            </Link>
        </div>
      </div>
    </div>
  );
}
