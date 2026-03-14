import { z } from "zod";
import { departments, volunteerRoles, companyHiringFor } from "./types";

export const volunteerAssignmentSchema = z.object({
  assignedRole: z.enum(volunteerRoles),
  assignedShift: z.string().optional(),
});

// Canonical Volunteer Schema
export const volunteerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Invalid email address.").endsWith("@case.edu.pk", "Only emails from case.edu.pk are allowed."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional(),
  phoneNumber: z.string().regex(/^\+?[0-9\s-()]{10,20}$/, "Invalid phone number."),
  registrationNumber: z.string().regex(/^\d{4}-\d{4}$/, "Registration number must be in XXXX-XXXX format."),
  department: z.enum(departments, { required_error: "Department is required." }),
  semester: z.string().min(1, "Semester is required."),
  preferredRole: z.enum(volunteerRoles),
  jobFairId: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
});

// Canonical Company Schema
export const companySchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters."),
  industry: z.string().min(2, "Industry is required."),
  hrName: z.string().min(2, "HR contact name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional(),
  phoneNumber: z.string().regex(/^\+?[0-9\s-()]{10,20}$/, "Invalid phone number."),
  website: z.string().url("Please enter a valid website URL.").optional().or(z.literal('')),
  description: z.string().max(500, "Description must be 500 characters or less.").optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  representatives: z.coerce.number().min(1, "At least one representative is required."),
  hiringFor: z.enum(companyHiringFor),
  needsInterviewRoom: z.boolean().default(false),
  equipmentRequirements: z.string().optional(),
});

export const EducationSchema = z.object({
    institution: z.string().min(1, "Institution is required"),
    degree: z.string().min(1, "Degree is required"),
    field: z.string().min(1, "Field of study is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    cgpa: z.preprocess(
      (val) => (val === "" || val === null ? undefined : val),
      z.coerce.number().min(0).max(4.0, "CGPA must be between 0 and 4.0").optional()
    ),
    description: z.string().optional(),
});

export const ExperienceSchema = z.object({
    title: z.string().min(1, "Job title is required"),
    company: z.string().min(1, "Company name is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    description: z.string().optional(),
});

// Schema for the new Project entity
export const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters."),
  description: z.string().max(1000, "Description must be 1000 characters or less.").optional(),
});

// Canonical Student Schema
export const studentSchema = z.object({
    fullName: z.string().min(2, "Full name is required."),
    title: z.string().optional(),
    email: z.string().email("Invalid email address.").endsWith("@case.edu.pk", "Only emails from case.edu.pk are allowed."),
    personalEmail: z.string().email("Invalid personal email address.").optional().or(z.literal('')),
    password: z.string().min(6, "Password must be at least 6 characters.").optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    registrationNumber: z.string().regex(/^\d{4}-\d{4}$/, "Registration number must be in XXXX-XXXX format."),
    department: z.enum(departments, { required_error: "Department is required." }),
    semester: z.string().min(1, "Semester is required."),
    cgpa: z.preprocess(
      (val) => (val === "" || val === null ? undefined : val),
      z.coerce.number().min(0).max(4.0, "CGPA must be between 0 and 4.0").optional()
    ),
    summary: z.string().max(1000, "Summary must be 1000 characters or less.").optional(),
    skills: z.array(z.object({ name: z.string(), level: z.string() })).optional(),
    education: z.array(EducationSchema).optional(),
    experience: z.array(ExperienceSchema).optional(),
    languages: z.array(z.object({ language: z.string(), proficiency: z.string() })).optional(),
    hobbies: z.string().optional(),
    dateOfBirth: z.string().optional(),
    placeOfBirth: z.string().optional(),
    nationality: z.string().optional(),
    gender: z.string().optional(),
    maritalStatus: z.string().optional(),
    githubUrl: z.string().url().or(z.literal('')).optional(),
    linkedinUrl: z.string().url().or(z.literal('')).optional(),
    projectId: z.string().optional(),
});


// Export inferred types
export type VolunteerSchema = z.infer<typeof volunteerSchema>;
export type CompanySchema = z.infer<typeof companySchema>;
export type StudentSchema = z.infer<typeof studentSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type ProjectSchema = z.infer<typeof projectSchema>;
export type VolunteerAssignmentFormValues = z.infer<typeof volunteerAssignmentSchema>;
