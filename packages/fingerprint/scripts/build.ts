/**
 * Builds the package into `dist/` (see `scripts/build-package.ts` at the root): `.` and `./react`
 * sharing one chunk of the layout, their rolled-up declarations, and `styles.css`, which is
 * `@data-profile/react`'s stylesheet followed by the fingerprint's own, so one import styles
 * everything. `@data-profile/core`, `@data-profile/react` and React are never bundled.
 *
 *   bun run build              # check the API reports, then build
 *   bun run build --api-report # update the API reports instead of checking them
 */
import { join } from "node:path";
import { buildPackage } from "../../../scripts/build-package";

// Measured when the controls moved to @data-profile/react: 5.6 KB and 8.2 KB. Raise a budget
// deliberately, never silently.
await buildPackage({
  root: join(import.meta.dir, ".."),
  entries: ["index", "react"],
  styles: ["../react/styles.css", "styles.css"],
  budget: { index: 7_000, react: 10_000 },
});
