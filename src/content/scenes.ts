export interface Link {
  label: string;
  href: string;
}

type Month = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12';
export type YearMonth = `${number}-${Month}`;

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
  start: YearMonth;
  end: YearMonth | 'present';
  summary: string;
  highlights: string[];
}

export interface ProjectScene extends SceneBase {
  kind: 'project';
  title: string;
  year: number;
  summary: string;
  links: Link[];
}

export interface ContactScene extends SceneBase {
  kind: 'contact';
  email: string;
  links: Link[];
}

export type Scene = IntroScene | RoleScene | ProjectScene | ContactScene;

export const scenes: readonly Scene[] = [
  {
    kind: 'intro',
    id: 'intro',
    name: 'Calen Gruber',
    tagline: 'Placeholder tagline about building software.',
  },
  {
    kind: 'role',
    id: 'company-b',
    title: 'Senior Engineer',
    org: 'Company B',
    start: '2024-03',
    end: 'present',
    summary: 'Placeholder summary of the work at Company B.',
    highlights: ['Placeholder highlight one.', 'Placeholder highlight two.'],
  },
  {
    kind: 'role',
    id: 'company-a',
    title: 'Software Engineer',
    org: 'Company A',
    start: '2021-06',
    end: '2024-02',
    summary: 'Placeholder summary of the work at Company A.',
    highlights: ['Placeholder highlight one.', 'Placeholder highlight two.'],
  },
  {
    kind: 'project',
    id: 'project-x',
    title: 'Project X',
    year: 2025,
    summary: 'Placeholder summary of Project X.',
    links: [{ label: 'Source', href: '#' }],
  },
  {
    kind: 'project',
    id: 'project-y',
    title: 'Project Y',
    year: 2023,
    summary: 'Placeholder summary of Project Y.',
    links: [
      { label: 'Live site', href: '#' },
      { label: 'Source', href: '#' },
    ],
  },
  {
    kind: 'contact',
    id: 'contact',
    email: 'hello@example.com',
    links: [
      { label: 'GitHub', href: 'https://github.com/Grubs13' },
      { label: 'LinkedIn', href: '#' },
    ],
  },
];
