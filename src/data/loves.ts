/* ──────────────────────────────────────────────────────────────────────
   Loves — personal field notes.

   A short list: a lowercase category, then a line or two in my own voice.
   `lead` is the thing itself (linked when `href` is set); `note` is why.

   PHOTO: nature belongs here as content too. When there's a real personal
   photo (a hike, a trail, somewhere with no signal), drop it under
   public/assets/images/loves/ and set `fieldPhoto` below. One photo max —
   this is not a gallery.
   ────────────────────────────────────────────────────────────────────── */

export interface LoveNote {
  category: string;
  lead: string;
  note: string;
  href?: string;
}

export const lovesHeading = 'Things I love.';

export const loves: LoveNote[] = [
  {
    category: 'language',
    lead: 'Relearning Japanese.',
    note: 'I used to be semi-fluent and let it slip. Getting it back through Duolingo and anime.',
  },
  {
    category: 'worlds',
    lead: 'Warhammer 40K lore.',
    note: 'An absurdly deep, grimdark universe. PancreasNoWork is peak.',
    href: 'https://www.youtube.com/@PancreasNoWork',
  },
  {
    category: 'cooking',
    lead: 'Cooking, and reading about it.',
    note:
      "Rereading Michael Ruhlman's “The Soul of a Chef,” the book that sparked " +
      'my love for cooking back in the day.',
  },
  {
    category: 'watching',
    lead: 'Witch Hat Atelier.',
    note: 'The magic system is so intricate. I love it.',
  },
  {
    category: 'reading',
    lead: '“Palo Alto” by Malcolm Harris.',
    note:
      'An unsentimental history of the place that shaped the industry I work in. ' +
      'Also “Ashes of the Imperium,” because sometimes you just want to read about ' +
      'a doomed galaxy before bed.',
  },
  {
    category: 'music',
    lead: "Whatever's on my Spotify.",
    note: 'Basic raver taste. My listening is public, so say hi if ours overlaps.',
    href: 'https://open.spotify.com/user/22k3hzyma66fj4nbmanjastiy?si=ea605d91ddae4bb2',
  },
];

/** Optional personal nature photo for the Loves section (see note above). */
export const fieldPhoto: { src: string; alt: string; caption?: string } | null = null;
