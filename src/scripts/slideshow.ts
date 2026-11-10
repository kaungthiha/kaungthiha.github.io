/**
 * Slideshows and lightboxes (src/components/portfolio/Slideshow.astro and
 * Lightbox.astro).
 *
 * The markup is already a working strip: a scroll-snap row you swipe or
 * scroll, each slide linking to its full-size image. This adds the counter,
 * the arrows and arrow keys, and opens a slide in a lightbox, which is the
 * same strip again, bigger. Closing the lightbox leaves the inline strip on
 * the slide you ended on. Figures elsewhere on a page (a case study's) can
 * open a lightbox too, via data-opens and data-index.
 */

interface Strip {
  go(i: number, smooth?: boolean): void;
  index(): number;
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Drives one scroll-snap track; `onChange` hears every settled slide change. */
function strip(track: HTMLElement, onChange: (i: number) => void): Strip {
  const slides = track.children as HTMLCollectionOf<HTMLElement>;
  const count = slides.length;
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
  // One slide plus the gap after it.
  const step = () => Math.max(1, count > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth);
  const index = () => clamp(Math.round(track.scrollLeft / step()));

  let current = -1;
  // While a button or key scrolls the strip, the slides it passes don't count.
  let target: number | null = null;
  let release = 0;
  const set = (i: number) => { if (i !== current) { current = i; onChange(i); } };

  let raf = 0;
  const sync = () => {
    raf = 0;
    const i = index();
    if (target !== null) {
      if (i !== target) return;
      target = null;
    }
    set(i);
  };
  track.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(sync); }, { passive: true });

  const go = (i: number, smooth = true) => {
    i = clamp(i);
    target = i;
    window.clearTimeout(release);
    release = window.setTimeout(() => { target = null; sync(); }, 900);
    set(i);
    track.scrollTo({ left: i * step(), behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto' });
  };

  track.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (step) go((target ?? current) + step);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(count - 1);
    else return;
    e.preventDefault();
  });

  sync();
  return { go, index: () => target ?? current };
}

/** Wires the counter and arrows in `bar` to a strip. */
function controls(bar: HTMLElement, titles: string[], s: () => Strip) {
  const count = bar.querySelector<HTMLElement>('[data-count]');
  const title = bar.querySelector<HTMLElement>('[data-slide-title]');
  const prev = bar.querySelector<HTMLButtonElement>('[data-prev]');
  const next = bar.querySelector<HTMLButtonElement>('[data-next]');
  prev?.addEventListener('click', () => s().go(s().index() - 1));
  next?.addEventListener('click', () => s().go(s().index() + 1));
  bar.hidden = false;
  return (i: number) => {
    if (count) count.textContent = String(i + 1);
    if (title) title.textContent = titles[i] ?? '';
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === titles.length - 1;
  };
}

// The slides past the first sit outside the viewport sideways, so lazy
// loading would leave them blank mid-swipe: fetch them all once they matter.
const eager = (scope: Element) => scope.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });

interface Lightbox {
  open(i: number, onClose?: (i: number) => void): void;
}

/** Wires a Lightbox.astro dialog once; null where <dialog> isn't supported. */
const lightboxes = new WeakMap<HTMLDialogElement, Lightbox>();
function lightbox(dialog: HTMLDialogElement): Lightbox | null {
  const known = lightboxes.get(dialog);
  if (known) return known;
  const track = dialog.querySelector<HTMLElement>('[data-track]');
  const bar = dialog.querySelector<HTMLElement>('[data-bar]');
  if (!track || !bar || typeof dialog.showModal !== 'function') return null;

  const titles = Array.from(track.children, (el) => (el as HTMLElement).dataset.title ?? '');
  let s: Strip;
  const update = controls(bar, titles, () => s);
  s = strip(track, update);
  let closed: ((i: number) => void) | undefined;

  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  // A click on the dimmed space around the slide (not the slide or the bar) closes.
  dialog.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === dialog || t.classList.contains('slide')) dialog.close();
  });
  dialog.addEventListener('close', () => closed?.(s.index()));

  const box: Lightbox = {
    open(i, onClose) {
      closed = onClose;
      eager(track);
      dialog.showModal();
      s.go(i, false);
      track.focus({ preventScroll: true });
    },
  };
  lightboxes.set(dialog, box);
  return box;
}

/** A plain click opens the lightbox; modified clicks keep the link's own target. */
function onPlainClick(a: HTMLAnchorElement, run: () => void) {
  a.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    run();
  });
}

export function initSlideshow(root: HTMLElement) {
  const track = root.querySelector<HTMLElement>(':scope > [data-track]');
  const bar = root.querySelector<HTMLElement>(':scope > [data-bar]');
  if (!track || !bar) return;

  const titles = Array.from(track.children, (el) => (el as HTMLElement).dataset.title ?? '');
  root.classList.add('is-live');

  let inline: Strip;
  const update = controls(bar, titles, () => inline);
  inline = strip(track, update);

  const seen = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { eager(track); seen.disconnect(); }
  }, { rootMargin: '200px 0px' });
  seen.observe(track);

  const dialog = root.querySelector<HTMLDialogElement>(':scope > dialog');
  const box = dialog && lightbox(dialog);
  if (!box) return;
  const links = track.querySelectorAll<HTMLAnchorElement>('a');
  // Closing leaves the strip on the slide the lightbox ended on.
  links.forEach((a, i) => onPlainClick(a, () => box.open(i, (end) => {
    inline.go(end, false);
    links[end]?.focus({ preventScroll: true });
  })));
}

/** Links marked data-opens={lightbox id} data-index={n} open that slide. */
export function initLightboxLinks() {
  document.querySelectorAll<HTMLAnchorElement>('a[data-opens]').forEach((a) => {
    const dialog = document.querySelector<HTMLDialogElement>(`dialog[data-lightbox="${a.dataset.opens}"]`);
    const box = dialog && lightbox(dialog);
    if (!box) return;
    // On close the dialog hands focus back to this link by itself.
    onPlainClick(a, () => box.open(Number(a.dataset.index) || 0));
  });
}
