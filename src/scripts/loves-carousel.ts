/* ──────────────────────────────────────────────────────────────────────
   Loves carousel — manual, dependency-free.

   The track is a CSS scroll-snap row (native swipe + trackpad already work).
   This script adds prev/next buttons, a live "NN / TT" position readout,
   keyboard ←/→ when the track is focused, and disabled end-states. An
   IntersectionObserver keeps the readout in sync with whatever the user
   swipes to. No autoplay. Respects prefers-reduced-motion for programmatic
   scrolls (native user scrolling is untouched).
   ────────────────────────────────────────────────────────────────────── */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const root = document.querySelector<HTMLElement>('[data-loves-carousel]');
const track = root?.querySelector<HTMLElement>('[data-loves-track]') ?? null;
const slides = track ? Array.from(track.querySelectorAll<HTMLElement>('[data-loves-slide]')) : [];
const prevBtn = root?.querySelector<HTMLButtonElement>('[data-loves-prev]') ?? null;
const nextBtn = root?.querySelector<HTMLButtonElement>('[data-loves-next]') ?? null;
const currentEl = root?.querySelector<HTMLElement>('[data-loves-current]') ?? null;

if (track && slides.length > 0) {
  let index = 0;

  function pad(n: number): string {
    return String(n + 1).padStart(2, '0');
  }

  function syncControls(): void {
    if (currentEl) currentEl.textContent = pad(index);
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === slides.length - 1;
  }

  function goTo(i: number, smooth = true): void {
    index = Math.max(0, Math.min(slides.length - 1, i));
    const slide = slides[index];
    if (track) {
      track.scrollTo({
        left: slide.offsetLeft - track.offsetLeft,
        behavior: smooth && !prefersReducedMotion ? 'smooth' : 'auto',
      });
    }
    syncControls();
  }

  prevBtn?.addEventListener('click', () => goTo(index - 1));
  nextBtn?.addEventListener('click', () => goTo(index + 1));

  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goTo(slides.length - 1);
    }
  });

  // Keep the readout honest when the user swipes/scrolls the track directly.
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          const i = slides.indexOf(entry.target as HTMLElement);
          if (i !== -1) {
            index = i;
            syncControls();
          }
        }
      });
    },
    { root: track, threshold: [0.6] },
  );
  slides.forEach((s) => io.observe(s));

  syncControls();
}
