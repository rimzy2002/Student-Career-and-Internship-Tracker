import { Application } from './types';

export const mockApplications: Application[] = [
  {
    id: '1',
    companyName: 'TechCorp',
    roleTitle: 'Frontend Engineer',
    dateApplied: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    status: 'Applied',
    skills: [{ id: 's1', name: 'React' }, { id: 's2', name: 'TypeScript' }],
    notes: 'They use a similar tech stack to my previous project. Need to brush up on React performance optimization before the interview.',
    history: [
      {
        id: 'h1',
        status: 'Applied',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Submitted via company portal.'
      }
    ]
  },
  {
    id: '2',
    companyName: 'Innovate AI',
    roleTitle: 'Fullstack Developer',
    dateApplied: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Interview',
    skills: [{ id: 's3', name: 'Node.js' }, { id: 's1', name: 'React' }],
    history: [
      {
        id: 'h2',
        status: 'Applied',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'h3',
        status: 'Interview',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Scheduled for next Tuesday at 2 PM. Technical round.'
      }
    ]
  },
  {
    id: '3',
    companyName: 'Global Systems',
    roleTitle: 'Software Engineering Intern',
    dateApplied: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Offer',
    skills: [{ id: 's4', name: 'Python' }, { id: 's5', name: 'SQL' }]
  },
  {
    id: '4',
    companyName: 'NextGen Solutions',
    roleTitle: 'UI/UX Intern',
    dateApplied: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Rejected',
    skills: [{ id: 's6', name: 'Figma' }]
  },
  {
    id: '5',
    companyName: 'StartupX',
    roleTitle: 'Frontend Intern',
    dateApplied: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Applied',
    skills: [{ id: 's1', name: 'React' }, { id: 's7', name: 'Tailwind' }]
  }
];

export const mockApplicationAnalytics = [
  { status_name: 'Applied', count: 145 },
  { status_name: 'Interview', count: 42 },
  { status_name: 'Offer', count: 12 },
  { status_name: 'Rejected', count: 89 },
];

export const mockSkillAnalytics = [
  { skill_name: 'System Design', count: 34 },
  { skill_name: 'Data Structures', count: 28 },
  { skill_name: 'AWS', count: 24 },
  { skill_name: 'Docker', count: 19 },
  { skill_name: 'TypeScript', count: 15 },
  { skill_name: 'React', count: 12 },
  { skill_name: 'GraphQL', count: 9 },
  { skill_name: 'Kubernetes', count: 7 },
  { skill_name: 'CI/CD', count: 5 },
  { skill_name: 'Next.js', count: 4 },
];
