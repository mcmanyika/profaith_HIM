export type ProjectStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'DECLINED' | 'IN_PROGRESS' | 'COMPLETED' | 'active' | 'pending' | 'inactive';

export interface Project {
    id: string;
    title: string;
    description: string;
    submittedBy: {
        id: string;
        name: string;
    };
    status: ProjectStatus;
    createdAt: Date;
    updatedAt: Date;
    targetDate?: Date;
    category: string;
    budget?: {
        amount: number;
        currency: string;
    };
    fundsRaised?: number;
    donorCount?: number;
    businessCase?: string;
    expectedOutcomes?: string[];
}

export interface Ministry {
    id: string;
    name: string;
    description: string;
    leaderId: string;
    memberCount: number;
    createdAt: Date;
}

export interface SmallGroup {
    id: string;
    name: string;
    leaderId: string;
    meetingDay: string;
    meetingTime: string;
    location: string;
    memberCount: number;
    createdAt: Date;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    authorId: string;
    targetAudience: 'all' | 'ministry' | 'group';
    targetId?: string;
    createdAt: Date;
    expiresAt?: Date;
}

export interface MemberProfile {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    gender?: string;
    dateOfBirth?: Date;
    country?: string;
    occupation?: string;
    memberStatus: 'active' | 'inactive' | 'visitor';
    membershipDate?: Date;
    baptismDate?: Date;
    ministryInvolvement?: string[];
    createdAt: Date;
    updatedAt: Date;
}

