/* ──────────────────────────────────────────────────────────────────────
   Homepage observer — small progressive enhancements for a linear page.

   • Publishes --hero-progress (1 = hero fills the screen, 0 = scrolled past)
     so CSS can fade the forest from immersive to quiet as the reader moves
     into the content.
   • Hides the minimal nav while the hero is in view.
   • Marks the section currently being read with aria-current.

   Nothing here gates content: without JS every section is still in the
   document and the nav is simply always visible.
   ────────────────────────────────────────────────────────────────────── */

const root = document.documentElement;
const hero = document.querySelector<HTMLElement>('.hero-intro');
const nav = document.querySelector<HTMLElement>('[data-minimal-nav]');
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]'));

let ticking = false;
function update(): void {
  ticking = false;
  const bottom = hero ? hero.getBoundingClientRect().bottom : 0;
  const progress = Math.min(1, Math.max(0, bottom / window.innerHeight));
  root.style.setProperty('--hero-progress', progress.toFixed(3));
  nav?.classList.toggle('is-hidden', progress > 0.35);
}
function requestUpdate(): void {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(update);
  }
}
window.addEventListener('scroll', requestUpdate, { passive: true });
window.addEventListener('resize', requestUpdate);
update();

// Active section: whichever section crosses the middle band of the viewport.
if ('IntersectionObserver' in window && links.length > 0) {
  const sections = links
    .map((l) => document.getElementById(l.dataset.navLink ?? ''))
    .filter((el): el is HTMLElement => el !== null);
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of links) {
          if (link.dataset.navLink === entry.target.id) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        }
      }
    },
    { rootMargin: '-40% 0px -55% 0px' },
  );
  sections.forEach((s) => observer.observe(s));
}
