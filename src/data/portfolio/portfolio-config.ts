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

export interface ProjectFigure {
  src: string;
  alt: string;
  /** Names the slide in a slideshow's counter. */
  title?: string;
  width: number;
  height: number;
}

export const portfolioConfig = {
  work: {
    heading: 'I like solving problems.',
    intro: '',
    /** Rendered only when the file exists in public/ at build time. */
    resumeHref: '/assets/Kaung_Thiha_Resume.pdf',
  },

  /** The Work branch's career timeline. */
  career: {
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
    /** The branch's name on the trunk (its anchor stays #create). */
    label: 'Stuff',
    /** The line under the heading while the branch is closed. */
    subline: 'formal projects and random things',
    heading: "Things I've worked on and learned from.",
    featuredProjectIds: ['proj_sheepherder', 'proj_outbuild_learning', 'proj_askcyborg', 'proj_ease'],
    // Archived (hidden here; their records stay in the dataset):
    // proj_ai_usage_tracker, proj_early_wage_access.
    experimentProjectIds: [
      'proj_attendance_tracker',
      'proj_instacart_reddit_pulse',
    ],
    experimentsHeading: 'Small experiments',
    /** Primary CTA label by canonical link kind. */
    ctaLabels: {
      live: 'Open the tool',
      pdf: 'Read the write-up (PDF)',
      github: 'View on GitHub',
      website: 'Visit the site',
    } satisfies Record<ProjectLink['kind'], string>,
    /** Presentation-only figures, keyed by canonical project ID: one image, or
        several shown as a slideshow (each with a short title for its counter). */
    figures: {
      proj_outbuild_learning: [
        {
          src: '/assets/projects/outbuild/problem.webp',
          title: 'Problem',
          alt: 'Problem: the old onboarding took 3–4 weeks of reading Notion, shadowing calls, and asking questions. Its gaps (no assessment, no feedback, no visibility) map to three requirements: structured quizzes, rep feedback, and leader reporting.',
          width: 2400,
          height: 1350,
        },
        {
          src: '/assets/projects/outbuild/final-system.webp',
          title: 'Final system',
          alt: 'Final system, three pipelines. Quiz generation: daily scan, Notion knowledge base, parse blocks, Claude writes questions, Forms API, answer keys. Response grading: form submit, Apps Script, webhook, key lookup, Claude grades, Notion results, rep email. Executive reporting: Monday trigger, fetch results, Claude summary, leader email.',
          width: 2400,
          height: 1350,
        },
        {
          src: '/assets/projects/outbuild/implementation.webp',
          title: 'Implementation',
          alt: 'Implementation, six parts. Notion parsing turns knowledge-base headings, lists, and tables into clean text. A question schema has Claude return JSON quiz questions with answers, explanations, and difficulty. Form creation sends the quiz as one batch request to Google Forms. Stored rubrics keep each form ID and answer key in a Notion database. Response intake runs from Google Forms through Apps Script to an n8n webhook. Weekly reports turn quiz results into a Claude-written HTML email for leaders: pass rates, scores, and knowledge gaps.',
          width: 2400,
          height: 1350,
        },
        {
          src: '/assets/projects/outbuild/v1-to-v2.webp',
          title: 'V1 → V2',
          alt: 'V1 to V2. V1 ran one trigger into six parallel, hardcoded topic branches (such as construction basics, scheduling, and positioning), each with its own Sheets sync and Notion update. V2 replaces them with three reusable flows: quiz generation (Notion scan, Claude generates, Forms API, Notion plus answer key), grading (webhook in, Claude grades, Notion results, email feedback), and reporting (Monday trigger, fetch results, Claude report, email to leadership). A table compares them: quiz source went from hardcoded to the Notion API, topics from six fixed to auto-discovered, forms from manual to API, grading from raw score to Claude, results from six branches to one pipeline, reporting from none to a weekly email, and maintenance from per topic to low.',
          width: 1931,
          height: 1086,
        },
        {
          src: '/assets/projects/outbuild/outcomes.webp',
          title: 'Outcomes',
          alt: 'Outcomes: onboarding time fell from about 4 weeks to about 1 week, with capacity designed for 20+ concurrent users. Quizzes of 10–15 questions cover six domains: construction basics, scheduling and planning, project management, construction technology, product positioning, and the AE playbook. Quiz generation and grading are automatic; reps get feedback by email and leaders get a weekly report.',
          width: 2400,
          height: 1350,
        },
      ],
    } as Record<string, ProjectFigure[] | undefined>,
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
