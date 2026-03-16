
import { type Timestamp } from "firebase/firestore";
import type { 
    VolunteerSchema,
    CompanySchema,
    StudentSchema,
    Education,
    Experience
} from "./schemas";

export const departments = [
  "Computer Science",
  "Software Engineering",
  "Cyber Security",
  "Artificial Intelligence",
  "BBA",
] as const;

export const volunteerRoles = [
  "Registration Desk",
  "Company Assistance",
  "Student Guidance",
  "Technical Support",
  "Media Team",
  "Crowd Management",
] as const;

export type Volunteer = VolunteerSchema & {
    id: string;
    userProfileId: string;
    photoUrl?: string;
    status: "pending" | "approved" | "rejected";
    isPresent?: boolean;
    presentAt?: Timestamp;
    assignedRole?: (typeof volunteerRoles)[number];
    assignedShift?: string;
    jobFairId: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
};

export const companyHiringFor = ["Internship", "Job", "Both"] as const;

export type Company = CompanySchema & {
    id: string;
    userProfileId: string;
    status: "pending" | "approved" | "rejected";
    createdAt: Timestamp;
    updatedAt?: Timestamp;
};

export type Student = Omit<StudentSchema, 'skills'> & {
  id: string;
  userProfileId: string;
  projectId?: string;
  projectName?: string;
  summary?: string;
  skills?: { name: string; level: string; }[];
  status: "pending" | "approved" | "rejected";
  isPresent?: boolean;
  presentAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type Project = {
    id: string;
    name: string;
    description: string;
    teamMemberIds: string[];
    jobFairId: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export type EventState = {
    isBreakActive: boolean;
    targetRoles: {
        company: boolean;
        student: boolean;
        volunteer: boolean;
    };
    messages: {
        company: string;
        student: string;
        volunteer: string;
    };
    updatedAt: Timestamp;
}

export type PortalReview = {
    id: string;
    companyId: string;
    companyName: string;
    rating: number; // 1-5
    feedback: string;
    suggestions?: string;
    createdAt: Timestamp;
};

export type Placement = {
  id: string;
  studentId: string;
  companyId: string;
  jobPostingId?: string;
  jobTitle: string;
  offerLetterId: string;
  status: "Offered" | "Accepted" | "Declined" | "Confirmed";
  placementDate: Timestamp;
  jobFairId?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type OfferLetter = {
  id: string;
  companyId: string;
  studentId: string;
  jobTitle: string;
  salaryDetails: string;
  offerLetterUrl: string;
  issuedDate: Timestamp;
  expiryDate?: Timestamp;
  status: "Pending" | "Accepted" | "Expired" | "Withdrawn";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type Interview = {
  id: string;
  studentId: string;
  studentName: string;
  companyId: string;
  companyName: string;
  jobFairId: string;
  interviewerName: string;
  startTime: Timestamp;
  endTime: Timestamp;
  location: string;
  status: 'Scheduled' | 'Completed' | 'Canceled' | 'No Show';
  createdAt: Timestamp;
}

export type ShortlistedStudent = {
    id: string; // doc id, which is the student id
    studentId: string;
    studentName: string;
    studentDept: string;
    studentSkills: string[];
    addedAt: Timestamp;
}

export type UserRole = "student" | "company" | "volunteer" | "admin";

export interface UserProfile {
    uid: string;
    email: string | null;
    role: UserRole | null;
}

export type RoomAssignment = {
    id: string;
    companyId: string;
    companyName: string;
    volunteerId?: string;
    volunteerName?: string;
    jobFairId: string;
    roomNumber: string;
    checkInStatus: boolean;
    checkInTime?: Timestamp;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export type ProjectSpotAssignment = {
    id: string;
    studentId: string;
    studentName: string;
    jobFairId: string;
    spotNumber: string;
    roomNumber: string;
    checkedIn?: boolean;
    checkedInAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export type VolunteerShift = {
    id: string;
    volunteerId: string;
    jobFairId: string;
    shiftName: string;
    startTime: Timestamp | null;
    endTime: Timestamp | null;
    location: string;
    isAttended: boolean;
    attendedAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export type Notification = {
    id: string;
    recipientUserProfileId: string;
    title: string;
    message: string;
    type: string;
    targetUrl: string;
    isRead: boolean;
    sentAt: Timestamp;
    createdAt: Timestamp;
}
