export interface Link {
  label: string;
  href: string;
}

interface SceneBase {
  id: string;
}

export interface IntroScene extends SceneBase {
  kind: 'intro';
  name: string;
  tagline: string;
}

export interface RoleScene extends SceneBase {
  kind: 'role';
  title: string;
  org: string;
  highlights: string[];
}

export interface ProjectScene extends SceneBase {
  kind: 'project';
  title: string;
  org: string;
  highlights: string[];
  links: Link[];
}

export interface InterestScene extends SceneBase {
  kind: 'interest';
  title: string;
  summary: string;
  topics: string[];
}

export interface ContactScene extends SceneBase {
  kind: 'contact';
  email: string;
  links: Link[];
}

export type Scene = IntroScene | RoleScene | ProjectScene | InterestScene | ContactScene;

const CARSELAND = 'Nutrien, Carseland Nitrogen Operations';

export const scenes: readonly Scene[] = [
  {
    kind: 'intro',
    id: 'intro',
    name: 'Calen Gruber',
    tagline: 'Mechanical engineer working in reliability and operations at a nitrogen fertilizer plant.',
  },
  {
    kind: 'role',
    id: 'reliability-engineer',
    title: 'Reliability Engineer',
    org: CARSELAND,
    highlights: [
      'Drive site reliability programs, including bad actor tracking, root cause analysis of equipment failures, and flange management, to reduce repeat failures and unplanned downtime.',
      'Lead equipment end-of-life reviews and risk-based assessments that guide maintenance strategy and long-term capital planning.',
      'Evaluate equipment and control system performance to make data-driven recommendations, and mentor engineers and students in reliability practices.',
    ],
  },
  {
    kind: 'project',
    id: 'reformer-reharp',
    title: 'Reformer Reharp, 2026 Turnaround',
    org: CARSELAND,
    highlights: [
      'Led engineering for a major reformer rebuild, one of the most critical projects of a large plant turnaround, delivered safely and to a high quality standard.',
      'Managed contractors through planning and execution, and solved technical problems in the field.',
      'Made risk-based decisions on found work to balance safety, reliability and schedule.',
    ],
    links: [],
  },
  {
    kind: 'role',
    id: 'ammonia-operations-engineer',
    title: 'Ammonia Operations Engineer',
    org: CARSELAND,
    highlights: [
      'Provided day-to-day process engineering support to optimize ammonia plant safety, reliability and production, including alarm rationalization that raised production limits and reduced nuisance alarms.',
      'Led incident investigations and cause mapping for process safety and reliability events, including a hazardous release investigation that resulted in a control logic change to prevent recurrence.',
      'Supported plant startups, performance monitoring and improvement projects through Management of Change, including serving as the operations lead for commissioning after a major turnaround and correcting plant efficiency calculations.',
    ],
  },
  {
    kind: 'interest',
    id: 'technical-interests',
    title: 'Technical Interests',
    summary: 'Bringing data and new technology to plant engineering, to make the work faster, safer and more reliable.',
    topics: ['Data analysis and engineering workflows enhanced by AI.', 'Adopting emerging technologies in industrial operations.'],
  },
  {
    kind: 'contact',
    id: 'contact',
    email: 'hello@example.com',
    links: [{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/calen-gruber-p-eng-74a054103' }],
  },
];
