// The `ez-tree-leaves` alias (astro.config.mjs) resolves to EZ-Tree's leaf
// texture directory. Declare the PNG imports as URL strings.
declare module 'ez-tree-leaves/*.png' {
  const url: string;
  export default url;
}
