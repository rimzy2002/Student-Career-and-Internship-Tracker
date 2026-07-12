export type ApplicationStatus = 'Applied' | 'Interview' | 'Offer' | 'Rejected';

export interface Skill {
  id: string;
  name: string;
}

export interface ApplicationHistory {
  id: string;
  status: ApplicationStatus;
  timestamp: string; // ISO string
  notes?: string;
}

export interface Application {
  id: string;
  companyName: string;
  roleTitle: string;
  dateApplied: string; // ISO string
  status: ApplicationStatus;
  skills: Skill[];
  notes?: string;
  history?: ApplicationHistory[];
}

export interface ApplicationAnalytics {
  status_name: string;
  count: number;
}

export interface SkillAnalytics {
  skill_name: string;
  count: number;
}
