/* ──────────────────────────────────────────────────────────────────────
   The career map (CareerMap.astro) as a picker. Without this script the map
   is a set of plain links into a full list of employers. With it, the list
   becomes a single panel: picking a fork on the map lights the path to it
   and shows that employer's entry, in place, with no scrolling away.

   Links from elsewhere into an employer (#exp_…, "related work") arrive
   through grove.ts, which announces what it reveals (`grove:reveal`).
   ────────────────────────────────────────────────────────────────────── */

export function initCareerMap(root: ParentNode = document): void {
  const map = root.querySelector<HTMLElement>('.career-map');
  const body = map?.closest<HTMLElement>('.branch-body');
  const panels = Array.from(body?.querySelectorAll<HTMLElement>('.map-panels > .twig') ?? []);
  if (!map || !body || !panels.length) return;
  const links = Array.from(map.querySelectorAll<HTMLAnchorElement>('a[data-pick]'));
  const jobs = Array.from(map.querySelectorAll<SVGGElement>('.map-job'));

  function pick(id: string): void {
    if (!panels.some((p) => p.id === id)) return;
    for (const a of links) {
      if (a.dataset.pick === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
    for (const g of jobs) g.classList.toggle('is-picked', g.dataset.for === id);
    for (const p of panels) {
      const on = p.id === id;
      p.classList.toggle('is-picked', on);
      const d = p.querySelector<HTMLDetailsElement>(':scope > details');
      if (d) d.open = on;
    }
  }

  for (const a of links) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      pick(a.dataset.pick!);
      history.replaceState(null, '', `#${a.dataset.pick}`);
    });
  }
  window.addEventListener('grove:reveal', (e) => {
    const panel = ((e as CustomEvent).detail as Element | null)?.closest?.('.map-panels > .twig');
    if (panel) pick(panel.id);
  });

  body.classList.add('is-mapped');
  const hashed = panels.find((p) => `#${p.id}` === location.hash || (location.hash.length > 1 && p.querySelector(`[id="${CSS.escape(location.hash.slice(1))}"]`)));
  pick(hashed?.id ?? map.dataset.default ?? panels[0].id);

  // On narrow screens the map scrolls sideways: start at the present.
  const scroller = map.querySelector<HTMLElement>('.career-map-scroll');
  if (scroller) scroller.scrollLeft = scroller.scrollWidth;
}
