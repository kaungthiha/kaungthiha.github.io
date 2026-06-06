// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';

// https://astro.build/config
export default defineConfig({
  // Root user site served from the apex of the GitHub Pages domain.
  // IMPORTANT: this is a `<username>.github.io` site, so there is NO `base`.
  // Do not add a `base` path here — assets and links resolve from `/`.
  site: 'https://kaungthiha.github.io',

  // Static, pre-rendered output (GitHub Pages cannot run a server).
  output: 'static',

  // Preserve old Jekyll URLs that changed shape in the migration.
  // The DSC case study moved from `/pages/dsc-case-study.html` to a clean
  // `/pages/dsc-case-study/` path; redirect the old `.html` link so any
  // external references don't 404.
  redirects: {
    '/pages/dsc-case-study.html': '/pages/dsc-case-study/',
  },

  integrations: [
    sitemap(),
  ],

  vite: {
    resolve: {
      alias: {
        // Bypass the package `exports` gate to import EZ-Tree from source, so
        // its textures are bundled by Vite (and externalized below) rather than
        // pulled in pre-base64-inlined from build/ez-tree.es.js.
        'ez-tree-src': fileURLToPath(
          new URL('./node_modules/@dgreenheck/ez-tree/src/lib/index.js', import.meta.url),
        ),
      },
    },
    build: {
      // EZ-Tree (imported from source) brings bark/leaf textures. Emit them as
      // separate files rather than base64-inlining, so the browser fetches only
      // what's referenced at runtime (we disable bark textures, so just leaves)
      // and caches them independently of the JS.
      assetsInlineLimit: 0,
    },
  },

  // The three live tools (attendance-tracker, festival-thingamabob, ai-usage-tracker)
  // are pre-built static apps copied into `public/tools/`. Astro copies `public/`
  // to the build output verbatim, preserving their `/tools/<name>/` URLs.
});
