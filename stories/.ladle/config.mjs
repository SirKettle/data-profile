/**
 * Ladle: every view's stories, against the packages' source. Run `bun run stories` at the root.
 * @type {import("@ladle/react").UserConfig}
 */
export default {
  stories: "src/**/*.stories.tsx",
  viteConfig: "vite.config.ts",
  outDir: "build",
};
