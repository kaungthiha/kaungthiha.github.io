/* ──────────────────────────────────────────────────────────────────────
   Work — a short editorial chronology.

   Only the chapters that matter most, one line each; the résumé PDF holds
   the detail. Everything here is public: no phone number, no confidential
   employer detail, no invented metric.
   ────────────────────────────────────────────────────────────────────── */

export interface WorkRole {
  company: string;
  role: string;
  /** Quiet date anchor, e.g. "2025 — now". */
  dates: string;
  /** One concise line about the work. */
  summary: string;
  /** Optional single standout result. */
  result?: string;
}

export const workHeading = 'I like solving problems.';

export const workIntro =
  'Product through data and AI. Mostly data and product, some building.';

export const roles: WorkRole[] = [
  {
    company: 'Capital One',
    role: 'Associate Data Product Analyst',
    dates: '2025 — now',
    summary:
      'Building the mechanisms that drive data product adoption across Card, ' +
      'while drinking a lot of sugary Starbies.',
  },
  {
    company: 'Outbuild',
    role: 'Revenue Operations Analyst',
    dates: '2025',
    summary:
      'Rev ops and sales enablement at a Series A construction-tech startup, ' +
      'and learning a lot about scrappy GTM motions.',
    result: 'Built an AI-assisted learning workflow that cut sales onboarding from ~4 weeks to ~1.',
  },
  {
    company: 'Amazon Web Services',
    role: 'Research Associate 3, LLM Operations',
    dates: '2025',
    summary:
      'LLM and agentic-model evaluation, with a lot of time around human-in-the-loop ' +
      'learning systems. Signed an NDA, so that is about all I can say.',
  },
  {
    company: 'Wefunder',
    role: 'Closing & Compliance Product Operations',
    dates: '2024',
    summary: 'Product operations and compliance at an equity crowdfunding platform.',
    result: 'Grew a VIP product from 0 → 547 users and $161,365 in new revenue.',
  },
  {
    company: 'AskCyborg',
    role: 'Co-Founder, Product',
    dates: '2023',
    summary: 'Co-founded an AI research assistant for SEC filings. Shipped the MVP and owned the roadmap.',
  },
];

/** Earlier chapters, tucked behind a native <details> (works without JS). */
export const earlierRoles: WorkRole[] = [
  {
    company: 'University of San Francisco, ITS',
    role: 'Salesforce Product Administrator',
    dates: '2022 — 2023',
    summary: 'Ran Salesforce for 10,000+ users and played Scrum master for a small dev team.',
  },
  {
    company: 'Alpha Phi Omega',
    role: 'Finance Chair & Pledge Trainer',
    dates: '2021 — 2024',
    summary: 'Fundraising and recruitment for a campus service fraternity.',
  },
  {
    company: 'USF Fiscal Affairs Council',
    role: 'Chair of Annual Budget',
    dates: '2021 — 2022',
    summary: 'Oversaw a $1.6M student-organization budget through COVID-19.',
  },
];

/** Compact skills line — plain text, not cards. */
export const skills: Array<{ group: string; items: string[] }> = [
  { group: 'Product', items: ['PRDs', 'product analytics', 'A/B testing', 'stakeholder management'] },
  { group: 'Data', items: ['SQL', 'Python', 'Snowflake', 'Databricks', 'QuickSuite', 'Tableau', 'R'] },
  { group: 'Building', items: ['Astro', 'TypeScript', 'AI coding agents', 'n8n'] },
];

/**
 * Résumé PDF. The Work section only renders the link when this file exists
 * in public/ at build time, so it can never point at a 404.
 */
export const resumeHref = '/assets/Kaung_Thiha_Resume.pdf';
