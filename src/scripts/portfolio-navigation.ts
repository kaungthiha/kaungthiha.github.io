/* ──────────────────────────────────────────────────────────────────────
   Portfolio navigation — progressive enhancement for the content stage.

   Owns:
   • Section switching via the ARIA tablist (work / create / loves), including
     roving-tabindex keyboard support (←/→, Home/End) and click.
   • Hash routing: #work / #create / #loves open the right section on load,
     and switching updates the hash (history) so back/forward work.
   • The homepage top-nav links ([data-nav-target]) which, from the hero,
     scroll the stage into view and then activate the requested section.
   • Create master-detail selection (project index → active detail).
   • The diagram lightbox: open/close, Escape, focus trap + restore.

   All section content is in the DOM at build time, so with JS disabled every
   section and every project detail is still readable (they render un-hidden by
   the no-JS baseline; this script hides the inactive ones once it runs).
   ────────────────────────────────────────────────────────────────────── */

type SectionId = 'work' | 'create' | 'loves';
const SECTIONS: SectionId[] = ['work', 'create', 'loves'];

function isSection(v: string | null): v is SectionId {
  return v === 'work' || v === 'create' || v === 'loves';
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Section switching ────────────────────────────────────────────────────
const switcher = document.querySelector<HTMLElement>('[data-section-switcher]');
const tabs = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-section-tab]'));
const panels = new Map<SectionId, HTMLElement>();
SECTIONS.forEach((id) => {
  const panel = document.querySelector<HTMLElement>(`[data-section="${id}"]`);
  if (panel) panels.set(id, panel);
});

let activeSection: SectionId = 'work';

function showSection(id: SectionId, opts: { focusPanel?: boolean; updateHash?: boolean } = {}): void {
  if (!panels.has(id)) return;
  activeSection = id;

  panels.forEach((panel, key) => {
    const on = key === id;
    panel.hidden = !on;
  });

  tabs.forEach((tab) => {
    const on = tab.dataset.sectionTab === id;
    tab.classList.toggle('is-active', on);
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
    tab.tabIndex = on ? 0 : -1;
  });

  if (opts.updateHash !== false && window.location.hash !== `#${id}`) {
    history.pushState(null, '', `#${id}`);
  }
  if (opts.focusPanel) {
    const panel = panels.get(id);
    panel?.focus({ preventScroll: true });
  }
}

// Tab clicks (anchors → keep hash deep-linking but stop the default jump)
tabs.forEach((tab) => {
  tab.addEventListener('click', (e) => {
    const id = tab.dataset.sectionTab;
    if (!isSection(id ?? null)) return;
    e.preventDefault();
    showSection(id as SectionId, { focusPanel: true });
  });
});

// Roving-tabindex keyboard nav on the tablist
switcher?.addEventListener('keydown', (e) => {
  const idx = tabs.findIndex((t) => t.dataset.sectionTab === activeSection);
  let next = -1;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % tabs.length;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + tabs.length) % tabs.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = tabs.length - 1;
  if (next === -1) return;
  e.preventDefault();
  const id = tabs[next].dataset.sectionTab;
  if (isSection(id ?? null)) {
    showSection(id as SectionId, { focusPanel: false });
    tabs[next].focus();
  }
});

// ── Hash + history ───────────────────────────────────────────────────────
function sectionFromHash(): SectionId | null {
  const h = window.location.hash.replace('#', '');
  return isSection(h) ? (h as SectionId) : null;
}

window.addEventListener('popstate', () => {
  const id = sectionFromHash();
  if (id) showSection(id, { updateHash: false });
});

// ── Hero top-nav: scroll the stage in, then activate ─────────────────────
const heroEl = document.querySelector<HTMLElement>('.hero-intro');
const stageEl = document.getElementById('portfolio-content');

function onHero(): boolean {
  return heroEl ? heroEl.getBoundingClientRect().bottom > window.innerHeight * 0.5 : false;
}

document.querySelectorAll<HTMLElement>('[data-nav-target]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = link.dataset.navTarget;
    if (!isSection(target ?? null)) return; // brand link ("me") just scrolls up
    e.preventDefault();
    const wasOnHero = onHero();
    if (wasOnHero && stageEl) {
      stageEl.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
    showSection(target as SectionId, { focusPanel: !wasOnHero });
  });
});

// Brand / "me" link → scroll back to the hero top
document.querySelectorAll<HTMLElement>('[data-nav-target="me"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
});

// ── Create master-detail ─────────────────────────────────────────────────
const indexItems = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-project-target]'));
const details = Array.from(document.querySelectorAll<HTMLElement>('[data-project]'));

function showProject(slug: string): void {
  indexItems.forEach((btn) => {
    const on = btn.dataset.projectTarget === slug;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
  });
  details.forEach((d) => {
    const on = d.dataset.project === slug;
    d.classList.toggle('is-active', on);
    d.setAttribute('aria-hidden', on ? 'false' : 'true');
  });
}

indexItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    const slug = btn.dataset.projectTarget;
    if (slug) showProject(slug);
  });
});

// ── Diagram lightbox (focus trap + restore) ──────────────────────────────
const lightbox = document.getElementById('pf-lightbox');
const lightboxImg = lightbox?.querySelector<HTMLImageElement>('.pf-lightbox-img') ?? null;
const lightboxCap = lightbox?.querySelector<HTMLElement>('.pf-lightbox-caption') ?? null;
const lightboxClose = lightbox?.querySelector<HTMLButtonElement>('.pf-lightbox-close') ?? null;
let lastFocused: HTMLElement | null = null;

function openLightbox(src: string, caption: string): void {
  if (!lightbox || !lightboxImg || !lightboxCap) return;
  lastFocused = document.activeElement as HTMLElement;
  lightboxImg.src = src;
  lightboxImg.alt = caption || '';
  lightboxCap.textContent = caption || '';
  lightbox.hidden = false;
  lightbox.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  lightboxClose?.focus();
}

function closeLightbox(): void {
  if (!lightbox || !lightboxImg) return;
  lightbox.classList.remove('is-open');
  lightbox.hidden = true;
  lightboxImg.src = '';
  document.body.style.overflow = '';
  lastFocused?.focus();
}

document.querySelectorAll<HTMLButtonElement>('[data-lightbox-src]').forEach((btn) => {
  btn.addEventListener('click', () =>
    openLightbox(btn.dataset.lightboxSrc ?? '', btn.dataset.lightboxCaption ?? ''),
  );
});
lightbox?.querySelectorAll<HTMLElement>('[data-lightbox-close]').forEach((el) => {
  el.addEventListener('click', closeLightbox);
});
document.addEventListener('keydown', (e) => {
  if (!lightbox || lightbox.hidden) return;
  if (e.key === 'Escape') {
    closeLightbox();
  } else if (e.key === 'Tab') {
    // Only the close button is focusable inside — keep focus on it.
    e.preventDefault();
    lightboxClose?.focus();
  }
});

// ── Boot: open the section from the URL hash (default work) ───────────────
const initial = sectionFromHash() ?? 'work';
showSection(initial, { updateHash: false });
if (details.length > 0) showProject(details[0].dataset.project ?? '');

// If we loaded with a section hash, bring the stage into view once.
if (sectionFromHash() && stageEl) {
  stageEl.scrollIntoView({ behavior: 'auto', block: 'start' });
}
