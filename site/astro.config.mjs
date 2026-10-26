// The documentation site. Every demo on it imports the package source from ../packages, so the docs always run
// the code in this commit, and every page shows the very file its demo runs.
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import starlightLinksValidator from "starlight-links-validator";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";

const fromRoot = (file) => fileURLToPath(new URL(`../${file}`, import.meta.url));

export default defineConfig({
  site: "https://sirkettle.github.io",
  base: "/data-profile",
  integrations: [
    react(),
    starlight({
      title: "data-profile",
      description:
        "Draw any collection as a deterministic fingerprint: one mark per item along real-looking ridges.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/SirKettle/data-profile",
        },
      ],
      editLink: { baseUrl: "https://github.com/SirKettle/data-profile/edit/main/site/" },
      customCss: ["./src/styles/demo.css"],
      plugins: [
        starlightLinksValidator({ errorOnRelativeLinks: false }),
        starlightTypeDoc({
          entryPoints: [
            fromRoot("packages/core/src/index.ts"),
            fromRoot("packages/react/src/index.ts"),
            fromRoot("packages/fingerprint/src/index.ts"),
            fromRoot("packages/fingerprint/src/react/index.ts"),
            fromRoot("packages/waffle/src/index.ts"),
            fromRoot("packages/waffle/src/react/index.ts"),
          ],
          tsconfig: fileURLToPath(new URL("./tsconfig.typedoc.json", import.meta.url)),
          output: "reference",
          sidebar: { label: "API reference", collapsed: true },
          typeDoc: {
            entryFileName: "index",
            excludePrivate: true,
            excludeInternal: true,
            sort: ["kind", "alphabetical"],
          },
        }),
      ],
      sidebar: [
        { label: "Start", items: ["getting-started"] },
        { label: "Guides", items: [{ autogenerate: { directory: "guides" } }] },
        typeDocSidebarGroup,
      ],
    }),
  ],
  vite: {
    // The demos import the package source, outside the site: let the dev server read it.
    server: { fs: { allow: [".."] } },
    resolve: {
      // A view's stylesheet is built from @data-profile/react's and its own: the stand-ins in
      // src/styles/sources do the same from source.
      alias: [
        {
          find: /^@data-profile\/fingerprint\/styles\.css$/,
          replacement: fileURLToPath(
            new URL("./src/styles/sources/fingerprint.css", import.meta.url),
          ),
        },
        {
          find: /^@data-profile\/waffle\/styles\.css$/,
          replacement: fileURLToPath(new URL("./src/styles/sources/waffle.css", import.meta.url)),
        },
        {
          find: /^@data-profile\/react\/styles\.css$/,
          replacement: fromRoot("packages/react/styles.css"),
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
        { find: /^@data-profile\/core$/, replacement: fromRoot("packages/core/src/index.ts") },
        { find: /^@data-profile\/waffle$/, replacement: fromRoot("packages/waffle/src/index.ts") },
      ],
    },
  },
});
