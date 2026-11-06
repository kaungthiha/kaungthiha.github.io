/* ──────────────────────────────────────────────────────────────────────
   The grove's scroll life. Progressive enhancement only: without this the
   grove is a fully lit, fully readable document.

   - The trunk fills with light down to a reading line just past mid-screen.
   - The branch under that line is active (glows); the others recede.
   - Twigs, rings and nodes grow in the first time they scroll into view.
   - The mini-trunk mirrors progress and marks the active branch.
   ────────────────────────────────────────────────────────────────────── */

export function initGrove(root: HTMLElement): void {
  const col = root.querySelector<HTMLElement>('.grove-col');
  const lit = root.querySelector<HTMLElement>('.trunk-lit');
  if (!col || !lit) return;
  const branches = Array.from(root.querySelectorAll<HTMLElement>('.branch'));
  const miniLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>('.mini-trunk a'));

  root.classList.add('is-live');

  // Grow twigs in once, as they first reach the lower part of the screen.
  const grow = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-grown');
        grow.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  root.querySelectorAll('.twig, .ring, .branch-node, .trunk-crown').forEach((el) => grow.observe(el));

  let frame = 0;
  function update(): void {
    frame = 0;
    const r = col!.getBoundingClientRect();
    const focus = window.innerHeight * 0.55;
    const litPx = Math.min(r.height, Math.max(0, focus - r.top));
    lit!.style.height = `${litPx}px`;
    root.style.setProperty('--grove-progress', String(r.height ? litPx / r.height : 0));
    root.classList.toggle('is-entered', r.top < window.innerHeight * 0.5);

    // The active branch is the last one whose node has crossed the reading
    // line (its node, not its top padding, so the previous branch stays lit
    // while you're still reading its last twigs).
    let active: HTMLElement | null = null;
    for (const b of branches) {
      const node = b.querySelector('.branch-node') ?? b;
      if (node.getBoundingClientRect().top <= focus) active = b;
    }
    // Past the last branch (the closing links), let everything rest lit.
    if (active && active.getBoundingClientRect().bottom < focus * 0.6) active = null;
    for (const b of branches) b.classList.toggle('is-active', b === active);
    root.classList.toggle('has-active', !!active);
    for (const a of miniLinks) {
      if (active && a.dataset.section === active.id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  // Late layout changes (fonts, images) move the branches without a scroll.
  new ResizeObserver(schedule).observe(col);
  update();
}
