export type TierId = string;

export type Relevance = 'ישירה מאוד' | 'ישירה' | 'ייחודית' | 'עקיפה' | 'כללית';

export type Status =
  | 'open'
  | 'seasonal'
  | 'after-bachelor'
  | 'info-only'
  | 'needs-check';

export interface Program {
  rank: number;
  title: string;
  brand?: string;
  url: string;
  time: string;
  cost: string;
  relevance: Relevance;
  status: Status;
  statusLabel: string;
  description: string;
  prerequisites?: string;
  highlight?: boolean;
  deadline?: string;
}

export interface Tier {
  id: TierId;
  title: string;
  tagline: string;
  description: string;
  sectionStart?: string;
  dateAdded?: string;
  accent: {
    gradient: string;
    badge: string;
    text: string;
    border: string;
    ring: string;
  };
  programs: Program[];
}
