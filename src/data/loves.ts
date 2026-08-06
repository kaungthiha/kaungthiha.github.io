/* ──────────────────────────────────────────────────────────────────────
   Loves — a manually controlled visual shelf of taste and curiosity.

   Single source of truth for the Loves carousel AND the "currently loving"
   line above it (items with `currently: true`). Seeded from verified current-
   site content — the old "Currently…" cards (Japanese study, the three books,
   Warhammer 40K lore, Culinary Class Wars, music) plus cooking.

   IMAGES: no real owned photo exists for these yet, so `image` is left
   undefined and the component renders a tasteful neutral placeholder. Do NOT
   invent product/travel photos. When Kaung provides images, drop them under
   public/assets/images/loves/ and set `image` + `imageAlt`. See the summary
   TODO list.
   ────────────────────────────────────────────────────────────────────── */

export interface LoveItem {
  id: string;
  category: string;
  title: string;
  caption: string;
  /** Path under /assets/images/loves/. Omit → neutral placeholder + TODO. */
  image?: string;
  imageAlt?: string;
  href?: string;
  currently?: boolean;
  credit?: string;
}

export const loves: LoveItem[] = [
  {
    id: 'japanese',
    category: 'Languages & learning',
    title: 'Relearning Japanese',
    caption:
      'I used to be semi-fluent and let it slip. Getting it back — one stubborn ' +
      'kanji at a time — has been oddly grounding.',
    currently: true,
  },
  {
    id: 'wh40k',
    category: 'Games, worlds & lore',
    title: 'Warhammer 40K lore',
    caption:
      'An absurdly deep, grimdark universe. I fall down PancreasNoWork lore ' +
      'dives and come back up an hour later, no regrets.',
    href: 'https://www.youtube.com/@PancreasNoWork',
    currently: true,
  },
  {
    id: 'cooking',
    category: 'Cooking & food',
    title: 'Cooking (and reading about it)',
    caption:
      'Working through Michael Ruhlman\'s "The Soul of a Chef." Good cooking is ' +
      'just product thinking you can eat.',
    currently: true,
  },
  {
    id: 'culinary-class-wars',
    category: 'Watching',
    title: 'Culinary Class Wars',
    caption:
      'A cooking competition with real stakes and real craft. Season 2 has been ' +
      'living in my head rent-free.',
    currently: true,
  },
  {
    id: 'palo-alto',
    category: 'Books',
    title: '“Palo Alto” — Malcolm Harris',
    caption:
      'A sprawling, unsentimental history of the place that shaped the industry ' +
      'I work in. Changes how you read a lot of tech mythology.',
  },
  {
    id: 'wh40k-book',
    category: 'Books',
    title: '“Ashes of the Imperium” — Chris Wraight',
    caption:
      'The 40K rabbit hole, in prose form. Sometimes you just want to read about ' +
      'a doomed galaxy before bed.',
  },
  {
    id: 'music',
    category: 'Music',
    title: 'Whatever\'s on my Spotify',
    caption:
      'Music is always running in the background while I build. My listening ' +
      'is public — say hi if our taste overlaps.',
    href: 'https://open.spotify.com/user/22k3hzyma66fj4nbmanjastiy?si=ea605d91ddae4bb2',
  },
];
