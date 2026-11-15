/* ──────────────────────────────────────────────────────────────────────
   The grove's life. Progressive enhancement: the markup has every branch
   and twig open, so without this it is a plain, fully readable document.

   With it, the grove starts at the root: an overview of the branches. Open
   one and its twigs grow in while the others zoom out; the light travels
   down the trunk to the open branch's node (or, in the overview, to the
   node being pointed at). Links into the grove (#work, #story-…,
   related-work links, the mini-trunk) open whatever they point into.

   It also draws the tree (.grove-tree, an SVG behind the content): a gently
   uneven trunk, and for the open branch a spine that leaves the trunk at
   its node and runs down beside its twigs, so the branch reads as its own
   limb. Geometry comes from where the nodes actually sit, re-measured only
   when the layout changes (never per frame).
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

  // ── The tree: trunk, light, and the open branch's spine ────────────
  const tree = root.querySelector<SVGSVGElement>('.grove-tree');
  const pTrunk = tree?.querySelector<SVGPathElement>('.tree-trunk');
  const pLit = tree?.querySelector<SVGPathElement>('.tree-lit');
  const pSpine = tree?.querySelector<SVGPathElement>('.tree-spine');
  const spark = tree?.querySelector<SVGCircleElement>('.tree-spark');
  // Grown, not ruled: a slow wander of a couple of pixels, fixed for a given height.
  const wander = (y: number, k = 1) => k * (1.5 * Math.sin(y * 0.011 + 1.3) + 0.8 * Math.sin(y * 0.029 + 0.4));
  const run = (x: number, from: number, to: number, k: number) => {
    let d = '';
    for (let y = from + 24; y < to; y += 24) d += `L${(x + wander(y, k)).toFixed(1)} ${y.toFixed(1)}`;
    return `${d}L${(x + wander(to, k)).toFixed(1)} ${to.toFixed(1)}`;
  };

  let pointed: HTMLDetailsElement | null = null;
  let grown: HTMLDetailsElement | null = null;
  let frame = 0;
  function light(): void {
    frame = 0;
    const open = branches.find((b) => b.open) ?? null;
    const c = col!.getBoundingClientRect();
    const t = trunk!.getBoundingClientRect();
    const x = t.left - c.left + t.width / 2, top = t.top - c.top, bottom = t.bottom - c.top - 6;   // stop at the root node's rim
    // The light stops at the open branch's node (in the overview, the pointed one).
    const r = rowOf(open ?? pointed ?? branches[0]).getBoundingClientRect();
    const y = Math.min(bottom, Math.max(top, r.top + r.height / 2 - c.top));
    lit!.style.height = `${y - top}px`;
    if (!tree || !pTrunk || !pLit || !pSpine || !spark) return;

    const d = `M${(x + wander(top)).toFixed(1)} ${top.toFixed(1)}${run(x, top, bottom, 1)}`;
    pTrunk.setAttribute('d', d);
    pLit.setAttribute('d', d);
    for (const g of tree.querySelectorAll('linearGradient')) {
      g.setAttribute('y1', String(top));
      g.setAttribute('y2', String(top + 64));
    }
    pLit.style.strokeDashoffset = String(1 - (y - top) / Math.max(1, bottom - top));
    spark.style.transform = `translate(${x + wander(y)}px, ${y}px)`;

    // The open branch's spine: off the trunk below its node, then down beside
    // its twigs to the last one, whose elbow carries on from it.
    const twigs = open?.querySelectorAll<HTMLElement>(':scope > .branch-body .twig');
    const last = twigs?.[twigs.length - 1];
    if (open && last) {
      const sx = x + (parseFloat(getComputedStyle(root).getPropertyValue('--spine-off')) || 18);
      const x0 = (x + wander(y)).toFixed(1), end = Math.max(y + 60, last.getBoundingClientRect().top - c.top);
      pSpine.setAttribute('d',
        `M${x0} ${y + 7}C${x0} ${y + 30} ${sx.toFixed(1)} ${y + 20} ${(sx + wander(y + 52, 0.6)).toFixed(1)} ${y + 52}${run(sx, y + 52, end, 0.6)}`);
      if (grown !== open) {
        // A new branch: grow the spine from the trunk (restart the animation).
        pSpine.classList.remove('is-growing');
        void pSpine.getBoundingClientRect();
        pSpine.classList.add('is-on', 'is-growing');
      }
    } else pSpine.classList.remove('is-on', 'is-growing');
    grown = open && last ? open : null;
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
  // The address follows the tree, so the browser's Back retraces it.
  function remember(target: HTMLDetailsElement | null): void {
    const url = target ? `#${target.id}` : location.pathname + location.search;
    if ((target ? `#${target.id}` : '') !== location.hash) history.pushState(null, '', url);
  }
  // Back to the overview, keeping your place: focus returns to the branch you were in.
  function overview(): void {
    const was = branches.find((b) => b.open);
    if (!was) return;
    setBranch(null);
    remember(null);
    const summary = summaryOf(was);
    summary.focus({ preventScroll: true });
    requestAnimationFrame(() => summary.scrollIntoView({ block: 'center', behavior }));
  }

  for (const b of branches) {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'grove-back';
    back.innerHTML = '<span aria-hidden="true">←</span> Back to branches';
    back.addEventListener('click', overview);
    b.querySelector(':scope > .branch-body')?.append(back);

    const summary = summaryOf(b);
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      const closing = b.open;
      setBranch(closing ? null : b);
      remember(closing ? null : b);
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
    if (a?.classList.contains('mini-back')) { e.preventDefault(); overview(); return; }
    const el = a ? target(a.hash) : null;
    if (!el) return;
    e.preventDefault();
    history.replaceState(null, '', a!.hash);
    reveal(el);
  });
  window.addEventListener('hashchange', () => {
    const el = target(location.hash);
    if (el) reveal(el);
    else if (!location.hash) setBranch(null);   // Back, out of a branch
  });

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
