#!/usr/bin/env node
/* ──────────────────────────────────────────────────────────────────────
   npm run validate:career

   Lightweight checks on src/data/career/career-history.json (no deps):
   required fields, unique IDs, resolvable source IDs, exactly one current
   role, and that every ID referenced in portfolio-config.ts exists.
   (The build also fails fast on unknown IDs via src/lib/career.ts.)
   ────────────────────────────────────────────────────────────────────── */

import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const data = JSON.parse(readFileSync(new URL('src/data/career/career-history.json', root), 'utf8'));
const config = readFileSync(new URL('src/data/portfolio/portfolio-config.ts', root), 'utf8');
const errors = [];
const fail = (msg) => errors.push(msg);

// Required top-level fields (mirrors career-history.schema.json).
for (const key of ['schema_version', 'generated_on', 'dataset_name', 'usage_contract', 'profile', 'education',
  'experience', 'projects', 'skills', 'source_files', 'data_quality_notes']) {
  if (!(key in data)) fail(`missing top-level field "${key}"`);
}

// Unique IDs across records.
const ids = new Map();
const note = (id, where) => {
  if (!id) return;
  if (ids.has(id)) fail(`duplicate id "${id}" (${ids.get(id)} and ${where})`);
  else ids.set(id, where);
};
for (const e of data.education ?? []) note(e.id, 'education');
for (const l of data.leadership ?? []) note(l.id, 'leadership');
for (const p of data.projects ?? []) note(p.id, 'projects');
for (const exp of data.experience ?? []) {
  note(exp.id, 'experience');
  if (!exp.organization) fail(`${exp.id}: missing organization`);
  for (const role of exp.roles ?? []) {
    note(role.id, `${exp.id} role`);
    for (const k of ['canonical_title', 'start_date', 'current']) {
      if (!(k in role)) fail(`${exp.id}: role missing "${k}"`);
    }
    for (const a of role.achievements ?? []) note(a.id, `${exp.id} achievement`);
  }
}

// Every source_id resolves to a source_files entry.
const sources = new Set((data.source_files ?? []).map((s) => s.id));
for (const s of data.source_files ?? []) {
  if (!/^[a-f0-9]{64}$/.test(s.sha256 ?? '')) fail(`source ${s.id}: sha256 is not a 64-char hex digest`);
}
JSON.stringify(data, (key, value) => {
  if ((key === 'source_ids' || key === 'title_source_ids') && Array.isArray(value)) {
    for (const id of value) if (!sources.has(id)) fail(`unknown source id "${id}"`);
  }
  return value;
});

// Exactly one current role.
const current = data.experience.flatMap((e) => e.roles.filter((r) => r.current).map((r) => `${e.organization}: ${r.canonical_title}`));
if (current.length !== 1) fail(`expected exactly one current role, found ${current.length}: ${current.join('; ')}`);

// Project relationships resolve.
for (const p of data.projects) {
  if (p.related_experience_id && !data.experience.some((e) => e.id === p.related_experience_id)) {
    fail(`${p.id}: related_experience_id "${p.related_experience_id}" does not exist`);
  }
  if (p.result_achievement_id && !ids.has(p.result_achievement_id)) {
    fail(`${p.id}: result_achievement_id "${p.result_achievement_id}" does not exist`);
  }
}

// Every canonical-looking ID in the portfolio config exists in the dataset.
for (const [, id] of config.matchAll(/'((?:exp|proj|lead|edu)_[a-z0-9_]+)'/g)) {
  if (!ids.has(id)) fail(`portfolio-config.ts references unknown id "${id}"`);
}

if (errors.length) {
  console.error(`career-history.json: ${errors.length} problem(s)\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`career-history.json OK — ${data.experience.length} employers, ${data.projects.length} projects, current role: ${current[0]}`);
