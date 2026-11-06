/* ──────────────────────────────────────────────────────────────────────
   The grove's life. Progressive enhancement: the markup has every branch
   and twig open, so without this it is a plain, fully readable document.

   With it, the grove starts at the root: an overview of the branches. Open
   one and its twigs grow in while the others zoom out; the light travels
   down the trunk through the open branch (or, in the overview, to the node
   being pointed at). Links into the grove (#work, #story-…, related-work
   links, the mini-trunk) open whatever they point into.
   ────────────────────────────────────────────────────────────────────── */

export function initGrove(root: HTMLElement): void {
  const col = root.querySelector<HTMLElement>('.grove-col');
  const trunk = root.querySelector<HTMLElement>('.trunk');
  const lit = root.querySelector<HTMLElement>('.trunk-lit');
  if (!col || !trunk || !lit) return;
  const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const branches = Array.from(root.querySelectorAll<HTMLDetailsElement>('details.branch'));
  const miniLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>('.mini-trunk a'));
  const summaryOf = (b: HTMLDetailsElement) => b.querySelector<HTMLElement>(':scope > summary')!;
  const rowOf = (b: HTMLDetailsElement) => b.querySelector<HTMLElement>('.branch-node-row') ?? summaryOf(b);

  // Start at the root.
  root.querySelectorAll<HTMLDetailsElement>('details').forEach((d) => { d.open = false; });
  root.classList.add('is-live');

  // ── The light on the trunk ─────────────────────────────────────────
  let pointed: HTMLDetailsElement | null = null;
  let frame = 0;
  function light(): void {
    frame = 0;
    const open = branches.find((b) => b.open);
    const t = trunk!.getBoundingClientRect();
    let y: number;
    if (open) y = open.getBoundingClientRect().bottom;
    else {
      const r = rowOf(pointed ?? branches[0]).getBoundingClientRect();
      y = r.top + r.height / 2;
    }
    lit!.style.height = `${Math.min(t.height, Math.max(0, y - t.top))}px`;
  }
  const relight = () => { if (!frame) frame = requestAnimationFrame(light); };

  // ── Open one branch (or none: back to the overview) ────────────────
  function setBranch(target: HTMLDetailsElement | null): void {
    for (const b of branches) b.open = b === target;
    root.classList.toggle('has-open', !!target);
    const i = target ? branches.indexOf(target) : -1;
    root.style.setProperty('--mini-progress', String(i < 0 ? 0 : i / Math.max(1, branches.length - 1)));
    for (const a of miniLinks) {
      if (target && a.dataset.section === target.id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
    relight();
  }

  for (const b of branches) {
    const summary = summaryOf(b);
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      const closing = b.open;
      setBranch(closing ? null : b);
      // Keep the node you just used in view as the layout re-flows.
      requestAnimationFrame(() => {
        const r = summary.getBoundingClientRect();
        if (r.top < 0 || r.top > window.innerHeight * 0.45) {
          summary.scrollIntoView({ block: closing ? 'center' : 'start', behavior });
        }
      });
    });
    // In the overview, pointing at a node sends the light to it.
    const point = (on: boolean) => () => { pointed = on ? b : null; if (!b.open) relight(); };
    summary.addEventListener('pointerenter', point(true));
    summary.addEventListener('pointerleave', point(false));
    summary.addEventListener('focus', point(true));
    summary.addEventListener('blur', point(false));
  }

  // ── Links into the grove open what they point into ─────────────────
  function reveal(el: HTMLElement): void {
    const branch = el.closest<HTMLDetailsElement>('details.branch');
    if (branch && !branch.open) setBranch(branch);
    // Open every twig between the branch and the target (and a twig the
    // target wraps, e.g. an employer's list item).
    for (let d = el.closest('details'); d && d !== branch; d = d.parentElement?.closest('details') ?? null) {
      (d as HTMLDetailsElement).open = true;
    }
    el.querySelector<HTMLDetailsElement>(':scope > details.twig-details')?.setAttribute('open', '');
    relight();
    const focus = el === branch ? summaryOf(branch) : el;
    requestAnimationFrame(() => focus.scrollIntoView({ block: 'start', behavior }));
  }
  function target(hash: string): HTMLElement | null {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    const el = id ? document.getElementById(id) : null;
    return el && el !== root && root.contains(el) ? el : null;
  }
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    const el = a ? target(a.hash) : null;
    if (!el) return;
    e.preventDefault();
    history.replaceState(null, '', a!.hash);
    reveal(el);
  });
  window.addEventListener('hashchange', () => { const el = target(location.hash); if (el) reveal(el); });

  // ── Nodes grow in as the grove first comes into view ───────────────
  const grow = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-grown');
        grow.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  root.querySelectorAll('.branch-node, .trunk-crown, .grove-hint').forEach((el) => grow.observe(el));

  // The mini-trunk appears once you're in the grove.
  const entered = () => {
    const r = root.getBoundingClientRect();
    root.classList.toggle('is-entered', r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.3);
  };
  window.addEventListener('scroll', entered, { passive: true });
  window.addEventListener('resize', () => { entered(); relight(); });
  // Twigs opening, fonts and images settling all move the trunk's target.
  new ResizeObserver(relight).observe(col);

  setBranch(null);
  entered();
  const initial = target(location.hash);
  if (initial) reveal(initial);
}
