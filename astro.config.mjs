// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';

// EZ-Tree's source (textures.js) eagerly calls TextureLoader.load() on every
// bark + leaf image it imports. Under Astro those imports resolve to image
// metadata objects, so the browser requested the literal URL "[object Object]"
// (a console 404). We never use those textures — bark texturing is off and
// forest.ts assigns its own leaf maps — so stub them with a 1×1 data URI:
// no request, no 404, and none of the ~20 textures are downloaded.
function ezTreeTextureStub() {
  const DIR = '/@dgreenheck/ez-tree/src/lib/';
  const STUB = 'virtual:ez-tree-texture-stub';
  const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  return {
    name: 'ez-tree-texture-stub',
    enforce: /** @type {const} */ ('pre'),
    /** @param {string} source @param {string | undefined} importer */
    resolveId(source, importer) {
      if (importer && importer.replaceAll('\\', '/').includes(DIR) && /[.](png|jpe?g)$/.test(source)) {
        return STUB;
      }
      return null;
    },
    /** @param {string} id */
    load(id) {
      return id === STUB ? `export default ${JSON.stringify(PIXEL)};` : null;
    },
  };
}

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
    plugins: [ezTreeTextureStub()],
    resolve: {
      alias: {
        // Bypass the package `exports` gate to import EZ-Tree from source, so
        // its textures are bundled by Vite (and externalized below) rather than
        // pulled in pre-base64-inlined from build/ez-tree.es.js.
        'ez-tree-src': fileURLToPath(
          new URL('./node_modules/@dgreenheck/ez-tree/src/lib/index.js', import.meta.url),
        ),
        // Same exports-gate bypass for the leaf textures we load ourselves
        // (EZ-Tree's own eager loader doesn't fetch them under this setup).
        'ez-tree-leaves': fileURLToPath(
          new URL('./node_modules/@dgreenheck/ez-tree/src/lib/assets/leaves', import.meta.url),
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
