import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const fromRoot = (file: string) => fileURLToPath(new URL(`../${file}`, import.meta.url));

// Stories import every package by its published name; resolve each to its source, so a change to
// a package shows in its stories without a build. More specific names first. A view's stylesheet
// is built from @data-profile/react's and its own; the docs site's stand-ins do that from source.
export default defineConfig({
  server: { fs: { allow: [".."] } },
  resolve: {
    alias: [
      {
        find: /^@data-profile\/fingerprint\/styles\.css$/,
        replacement: fromRoot("site/src/styles/sources/fingerprint.css"),
      },
      {
        find: /^@data-profile\/waffle\/styles\.css$/,
        replacement: fromRoot("site/src/styles/sources/waffle.css"),
      },
      {
        find: /^@data-profile\/waffle\/react$/,
        replacement: fromRoot("packages/waffle/src/react/index.ts"),
      },
      { find: /^@data-profile\/react$/, replacement: fromRoot("packages/react/src/index.ts") },
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
