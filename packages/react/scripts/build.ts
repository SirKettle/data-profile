/**
 * Builds the package into `dist/` (see `scripts/build-package.ts` at the root).
 *
 *   bun run build              # check the API report, then build
 *   bun run build --api-report # update the API report instead of checking it
 */
import { join } from "node:path";
import { buildPackage } from "../../../scripts/build-package";

// Measured before the first release: 4.2 KB. Raise it deliberately, never silently.
await buildPackage({
  root: join(import.meta.dir, ".."),
  entries: ["index"],
  styles: ["styles.css"],
  budget: { index: 5_000 },
});
