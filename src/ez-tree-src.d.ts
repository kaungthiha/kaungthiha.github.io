// The `ez-tree-src` alias (astro.config.mjs) resolves to EZ-Tree's source
// entry. Re-export its public types from the installed package so TypeScript
// can type the aliased import.
declare module 'ez-tree-src' {
  export * from '@dgreenheck/ez-tree';
}
