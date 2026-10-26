import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const fromRoot = (file: string) => fileURLToPath(new URL(`../${file}`, import.meta.url));

// Stories import every package by its published name; resolve each to its source, so a change to
// a package shows in its stories without a build. More specific names first.
export default defineConfig({
  server: { fs: { allow: [".."] } },
  resolve: {
    alias: [
      {
        find: /^@data-profile\/fingerprint\/styles\.css$/,
        replacement: fromRoot("packages/fingerprint/styles.css"),
      },
      {
        find: /^@data-profile\/fingerprint\/react$/,
        replacement: fromRoot("packages/fingerprint/src/react/index.ts"),
      },
      {
        find: /^@data-profile\/fingerprint$/,
        replacement: fromRoot("packages/fingerprint/src/index.ts"),
      },
      { find: /^@data-profile\/waffle$/, replacement: fromRoot("packages/waffle/src/index.ts") },
      { find: /^@data-profile\/core$/, replacement: fromRoot("packages/core/src/index.ts") },
    ],
  },
});
