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
  summary: string;
  highlights: string[];
}

export interface ProjectScene extends SceneBase {
  kind: 'project';
  title: string;
  org: string;
  summary: string;
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
    summary: "Managed the site's reliability programs.",
    highlights: [
      "Developed and ran the site's flange management program during turnarounds.",
      'Led inspections and repair plans for all maintenance refractory scope on the reformer during the turnaround.',
    ],
  },
  {
    kind: 'project',
    id: 'reformer-reharp',
    title: 'Kellogg Reformer Re-harp and Convection Coil Replacement',
    org: CARSELAND,
    summary:
      'Lead mechanical engineer on one of the largest projects of the turnaround, executed on the critical path.',
    links: [],
  },
  {
    kind: 'role',
    id: 'ammonia-operations-engineer',
    title: 'Ammonia Operations Engineer',
    org: CARSELAND,
    summary: 'Supported operations of the ammonia plant.',
    highlights: ['Provided technical support to reach target debottleneck rates after the expansion project.'],
  },
  {
    kind: 'interest',
    id: 'technical-interests',
    title: 'Technical Interests',
    summary: 'Placeholder: using AI and new technology to make plant engineering work faster, safer and more reliable.',
    topics: ['Placeholder topic one.', 'Placeholder topic two.'],
  },
  {
    kind: 'contact',
    id: 'contact',
    email: 'hello@example.com',
    links: [{ label: 'LinkedIn', href: '#' }],
  },
];
