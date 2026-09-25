/* ──────────────────────────────────────────────────────────────────────
   Career helpers — the only module that reads the canonical dataset.

   career-history.json is the source of truth for employers, titles, dates,
   achievements, metrics, education, skills, and projects. Components never
   traverse the raw JSON; they call these helpers, which apply the public
   filters (website_default / public_safe) in one place and never expose
   maintenance metadata (source_ids, confidence, conflicts, aliases, …).

   Everything here runs at build time; nothing is fetched in the browser.
   ────────────────────────────────────────────────────────────────────── */

import raw from '../data/career/career-history.json';

// ── Types: only the fields the site consumes ────────────────────────────
export interface Achievement {
  id?: string;
  text: string;
  website_default?: boolean;
  public_safe?: boolean;
}

export interface CareerRole {
  id?: string;
  canonical_title: string;
  team_or_scope?: string | null;
  start_date: string | null;
  end_date?: string | null;
  current: boolean;
  summary?: string | null;
  achievements?: Achievement[];
}

export interface ExperienceRecord {
  id: string;
  organization: string;
  engagement_employer?: string;
  affiliation?: string;
  location?: string;
  engagement_type?: string;
  website_default?: boolean;
  roles: CareerRole[];
}

export interface LeadershipRecord {
  id: string;
  organization: string;
  canonical_title: string;
  start_date: string | null;
  end_date: string | null;
  summary?: string;
}

export interface EducationRecord {
  id: string;
  institution: string;
  credential: string;
  field?: string;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  expected_completion?: string;
  website_default?: boolean;
}

export interface ProjectLink {
  kind: 'live' | 'pdf' | 'github' | 'website';
  url: string;
}

export interface CareerProject {
  id: string;
  title: string;
  category?: string;
  date?: string | null;
  summary: string;
  website_summary?: string;
  technologies?: string[];
  links?: ProjectLink[];
  related_experience_id?: string;
  result_achievement_id?: string;
  website_default?: boolean;
}

interface CareerHistory {
  profile: {
    name: string;
    location?: string;
    public_email?: string | null;
    public_links?: Record<string, string>;
  };
  education: EducationRecord[];
  experience: ExperienceRecord[];
  leadership?: LeadershipRecord[];
  projects: CareerProject[];
  skills: { authoritative_current_resume: Record<string, string[] | undefined> };
}

const career = raw as unknown as CareerHistory;

// ── Lookup (throws on an unknown ID so a bad config fails the build) ────
function mustFind<T extends { id: string }>(list: T[], id: string, kind: string): T {
  const found = list.find((item) => item.id === id);
  if (!found) throw new Error(`career.ts: unknown ${kind} id "${id}" (check portfolio-config.ts)`);
  return found;
}

export const getProfile = () => career.profile;
export const getExperience = (id: string) => mustFind(career.experience, id, 'experience');
export const getProject = (id: string) => mustFind(career.projects, id, 'project');
export const getProjects = (ids: string[]) => ids.map(getProject);
export const getLeadership = (ids: string[]) => ids.map((id) => mustFind(career.leadership ?? [], id, 'leadership'));

// ── Dates ───────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const yearOf = (ym: string | null | undefined) => (ym ? ym.slice(0, 4) : '');
function monthYear(ym: string): string {
  const [y, m] = ym.split('-');
  return m ? `${MONTHS[Number(m) - 1]} ${y}` : y;
}
/** Months since year 0, for overlap math. An open end (current) counts as now. */
function toMonths(ym: string | null | undefined, fallback: number): number {
  if (!ym) return fallback;
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + ((m || 1) - 1);
}
const NOW_MONTHS = (() => {
  const d = new Date();
  return d.getFullYear() * 12 + d.getMonth();
})();

/** "2026 — now", "2025 — 2026", or "2025" when a role starts and ends in one year. */
export function yearRange(role: Pick<CareerRole, 'start_date' | 'end_date' | 'current'>): string {
  const start = yearOf(role.start_date);
  if (role.current) return `${start} — now`;
  const end = yearOf(role.end_date);
  if (!end || end === start) return start;
  return `${start} — ${end}`;
}

/** "Sep 2026 — present", "Jun 2025 — Nov 2025". Unresolved ends are omitted, never guessed. */
export function monthRange(role: Pick<CareerRole, 'start_date' | 'end_date' | 'current'>): string {
  if (!role.start_date) return '';
  const start = monthYear(role.start_date);
  if (role.current) return `${start} — present`;
  return role.end_date ? `${start} — ${monthYear(role.end_date)}` : start;
}

// ── Public filters ──────────────────────────────────────────────────────
/** Roles newest first. */
export const getRoles = (exp: ExperienceRecord) =>
  [...exp.roles].sort((a, b) => toMonths(b.start_date, 0) - toMonths(a.start_date, 0));

/** Achievements cleared for the website: website_default and not marked unsafe. */
export function getPublicAchievements(role: CareerRole, limit?: number): Achievement[] {
  const list = (role.achievements ?? []).filter((a) => a.website_default === true && a.public_safe !== false);
  return typeof limit === 'number' ? list.slice(0, limit) : list;
}

export function getAchievement(id: string): Achievement | undefined {
  for (const exp of career.experience) {
    for (const role of exp.roles) {
      const hit = role.achievements?.find((a) => a.id === id);
      if (hit) return hit;
    }
  }
  return undefined;
}

export function getCurrentRole(): { experience: ExperienceRecord; role: CareerRole } | null {
  for (const experience of career.experience) {
    const role = experience.roles.find((r) => r.current);
    if (role) return { experience, role };
  }
  return null;
}

/** Display name, e.g. "Amazon Web Services (via Keywords Studios)". */
export function organizationLabel(exp: ExperienceRecord): string {
  if (exp.engagement_employer) return `${exp.organization} (via ${exp.engagement_employer})`;
  if (exp.affiliation) return `${exp.organization} (${exp.affiliation})`;
  return exp.organization;
}

// ── Homepage: concise milestones ─────────────────────────────────────────
export interface CareerMilestone {
  key: string;
  years: string;
  organization: string;
  title: string;
  scope?: string;
}

/** One line per role for the given employers, newest first. */
export function getCareerSummary(experienceIds: string[]): CareerMilestone[] {
  const rows: Array<CareerMilestone & { sort: number }> = [];
  for (const exp of experienceIds.map(getExperience)) {
    getRoles(exp).forEach((role, i) => {
      rows.push({
        key: role.id ?? `${exp.id}-${i}`,
        years: yearRange(role),
        organization: exp.organization,
        title: role.canonical_title,
        scope: role.team_or_scope ?? undefined,
        sort: toMonths(role.start_date, 0),
      });
    });
  }
  return rows.sort((a, b) => b.sort - a.sort).map(({ sort: _sort, ...row }) => row);
}

// ── /career/: fuller, grouped timeline ───────────────────────────────────
export interface TimelineEntry {
  experience: ExperienceRecord;
  label: string;
  roles: Array<{ role: CareerRole; range: string; achievements: Achievement[] }>;
  /** Other displayed employers whose dates genuinely overlap this one. */
  alongside: string[];
  relatedProjects: CareerProject[];
}

export interface TimelineGroup {
  label: string;
  entries: TimelineEntry[];
}

function spanOf(exp: ExperienceRecord): [number, number] {
  const starts = exp.roles.map((r) => toMonths(r.start_date, NOW_MONTHS));
  const ends = exp.roles.map((r) => (r.current ? NOW_MONTHS : toMonths(r.end_date, toMonths(r.start_date, NOW_MONTHS))));
  return [Math.min(...starts), Math.max(...ends)];
}

/** Projects whose canonical record points back at this employer. */
export function getRelatedProjects(experienceId: string, allowedIds?: string[]): CareerProject[] {
  return career.projects.filter(
    (p) => p.related_experience_id === experienceId && (!allowedIds || allowedIds.includes(p.id)),
  );
}

export function getCareerTimeline(opts: {
  experienceIds: string[];
  achievementsPerRole: number;
  relatedProjectIds?: string[];
}): TimelineGroup[] {
  const exps = opts.experienceIds.map(getExperience);
  const spans = new Map(exps.map((e) => [e.id, spanOf(e)]));

  const entries: TimelineEntry[] = exps.map((exp) => {
    const [s, e] = spans.get(exp.id)!;
    const alongside = exps
      .filter((other) => other.id !== exp.id)
      .filter((other) => {
        const [os, oe] = spans.get(other.id)!;
        // Two or more shared months = real overlap (not a same-month handoff).
        return Math.min(e, oe) - Math.max(s, os) + 1 >= 2;
      })
      .map((other) => other.organization);
    return {
      experience: exp,
      label: exp.roles.some((r) => r.current) ? 'Now' : yearOf(getRoles(exp)[0].end_date ?? getRoles(exp)[0].start_date),
      roles: getRoles(exp).map((role) => ({
        role,
        range: monthRange(role),
        achievements: getPublicAchievements(role, opts.achievementsPerRole),
      })),
      alongside,
      relatedProjects: getRelatedProjects(exp.id, opts.relatedProjectIds),
    };
  });

  const groups: TimelineGroup[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.label === entry.label) last.entries.push(entry);
    else groups.push({ label: entry.label, entries: [entry] });
  }
  return groups;
}

// ── Education + skills ──────────────────────────────────────────────────
export interface EducationLine {
  id: string;
  institution: string;
  credential: string;
  when: string;
}

export function getCareerEducation(): EducationLine[] {
  return career.education
    .filter((e) => e.website_default)
    .map((e) => ({
      id: e.id,
      institution: e.institution,
      credential: e.field ? `${e.credential}, ${e.field}` : e.credential,
      when:
        e.status === 'in_progress'
          ? `In progress${e.expected_completion ? ` · expected ${e.expected_completion}` : ''}`
          : [yearOf(e.start_date), yearOf(e.end_date)].filter(Boolean).join(' — '),
    }));
}

/** Current-résumé skill groups only, relabeled for display by the caller. */
export function getPublicSkills(groups: Array<{ key: string; label: string }>) {
  const current = career.skills.authoritative_current_resume;
  return groups
    .map((g) => ({ label: g.label, items: current[g.key] ?? [] }))
    .filter((g) => g.items.length > 0);
}

// ── Projects: display helpers ────────────────────────────────────────────
/** Project year, or the start year of the job it came out of; never guessed. */
export function projectYear(p: CareerProject): string {
  if (p.date) return yearOf(p.date);
  if (p.related_experience_id) {
    const roles = getRoles(getExperience(p.related_experience_id));
    return yearOf(roles[roles.length - 1]?.start_date);
  }
  return '';
}

export function projectResult(p: CareerProject): string | undefined {
  return p.result_achievement_id ? getAchievement(p.result_achievement_id)?.text : undefined;
}

export function sentenceCase(s: string | undefined): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
