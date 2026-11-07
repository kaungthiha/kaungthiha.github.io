/**
 * Slideshows (src/components/portfolio/Slideshow.astro).
 *
 * The markup is already a working strip: a scroll-snap row you swipe or
 * scroll, each slide linking to its full-size image. This adds the counter,
 * the arrows and arrow keys, and opens a slide in a lightbox, which is the
 * same strip again, bigger. Closing the lightbox leaves the inline strip on
 * the slide you ended on.
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

export function initSlideshow(root: HTMLElement) {
  const track = root.querySelector<HTMLElement>(':scope > [data-track]');
  const bar = root.querySelector<HTMLElement>(':scope > [data-bar]');
  const dialog = root.querySelector<HTMLDialogElement>('dialog');
  if (!track || !bar) return;

  const titles = Array.from(track.children, (el) => (el as HTMLElement).dataset.title ?? '');
  root.classList.add('is-live');

  let inline: Strip;
  const update = controls(bar, titles, () => inline);
  inline = strip(track, update);

  // The slides past the first sit outside the viewport sideways, so lazy
  // loading would leave them blank mid-swipe: once the strip shows, fetch all.
  const eager = (scope: Element) => scope.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
  const seen = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { eager(track); seen.disconnect(); }
  }, { rootMargin: '200px 0px' });
  seen.observe(track);

  if (!dialog || typeof dialog.showModal !== 'function') return;

  const bigTrack = dialog.querySelector<HTMLElement>('[data-track]');
  const bigBar = dialog.querySelector<HTMLElement>('[data-bar]');
  if (!bigTrack || !bigBar) return;
  let big: Strip;
  const bigUpdate = controls(bigBar, titles, () => big);
  big = strip(bigTrack, bigUpdate);

  const open = (i: number) => {
    eager(bigTrack);
    dialog.showModal();
    big.go(i, false);
    bigTrack.focus({ preventScroll: true });
  };

  track.querySelectorAll<HTMLAnchorElement>('a').forEach((a, i) => {
    a.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(i);
    });
  });

  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  // A click on the dimmed space around the slide (not the slide or the bar) closes.
  dialog.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === dialog || t.classList.contains('slide')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    inline.go(big.index(), false);
    track.querySelectorAll('a')[big.index()]?.focus({ preventScroll: true });
  });
}
