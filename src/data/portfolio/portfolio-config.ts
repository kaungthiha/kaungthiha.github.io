/* ──────────────────────────────────────────────────────────────────────
   Portfolio presentation config — what the site SHOWS, not what is TRUE.

   Facts (titles, dates, employers, metrics, degrees, project details) live
   only in src/data/career/career-history.json and are read through
   src/lib/career.ts. This file holds canonical IDs, ordering, visibility,
   and presentation-only copy (headings, the intro, CTA labels, image paths,
   and the conversational notes shown under some projects).

   To update the career: edit career-history.json, then change this file
   only if visibility or order should change.
   ────────────────────────────────────────────────────────────────────── */

import type { ProjectLink } from '../../lib/career';

export const portfolioConfig = {
  work: {
    heading: 'I like solving problems.',
    intro: 'Product through data and AI. Mostly data and product, some building.',
    /** Employers shown as homepage milestones (every canonical role renders). */
    summaryExperienceIds: [
      'exp_capital_one',
      'exp_outbuild',
      'exp_aws_keywords',
      'exp_wefunder',
      'exp_askcyborg',
    ],
    careerPageHref: '/career/',
    careerCtaLabel: 'View full career timeline',
    /** Rendered only when the file exists in public/ at build time. */
    resumeHref: '/assets/Kaung_Thiha_Resume.pdf',
  },

  career: {
    heading: 'Career',
    intro:
      'The longer version: where I have worked, what I did there, and how it connects. ' +
      'Mostly product, data, and AI, with some fintech and a startup along the way.',
    experienceIds: [
      'exp_capital_one',
      'exp_outbuild',
      'exp_aws_keywords',
      'exp_wefunder',
      'exp_askcyborg',
    ],
    earlierExperienceIds: ['exp_usf_its'],
    /** Opted in explicitly; the dataset marks leadership as not website-default. */
    leadershipIds: ['lead_apo', 'lead_fiscal_affairs'],
    achievementsPerRole: 2,
    showEducation: true,
    showSkills: true,
  },

  /** Canonical skill groups to show, with display labels. */
  skillGroups: [
    { key: 'product_and_business', label: 'Product' },
    { key: 'tools_and_data', label: 'Data' },
    { key: 'ai_ml', label: 'AI' },
  ],

  create: {
    heading: "Things I've built, tested, and learned from.",
    featuredProjectIds: ['proj_sheepherder', 'proj_outbuild_learning', 'proj_askcyborg', 'proj_ease'],
    experimentProjectIds: [
      'proj_attendance_tracker',
      'proj_instacart_reddit_pulse',
      'proj_ai_usage_tracker',
      'proj_early_wage_access',
    ],
    experimentsHeading: 'Small experiments',
    /** Primary CTA label by canonical link kind. */
    ctaLabels: {
      live: 'Open the tool',
      pdf: 'Read the write-up (PDF)',
      github: 'View on GitHub',
      website: 'Visit the site',
    } satisfies Record<ProjectLink['kind'], string>,
    /** Presentation-only images, keyed by canonical project ID. */
    images: {
      proj_outbuild_learning: {
        src: '/assets/projects/outbuild_diagram.png',
        alt: 'Diagram of the Outbuild learning system: V1 used hardcoded per-topic n8n branches; V2 uses unified pipelines for quiz generation, grading, and reporting with Claude.',
        width: 650,
        height: 669,
      },
    } as Record<string, { src: string; alt: string; width: number; height: number } | undefined>,
    /** Conversational notes under a story (the facts behind them — no longer
        maintained, no public demo — are recorded in the dataset). */
    notes: {
      proj_askcyborg: 'Heads up: I no longer maintain this one, so it may be a little rough around the edges.',
      proj_ease:
        "Sorry, I can't actually show the demo on this one — it's internal Capital One work, " +
        'so it stays a corporate secret. You get the gist above.',
    } as Record<string, string | undefined>,
  },
};
