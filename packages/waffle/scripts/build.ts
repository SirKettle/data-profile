/**
 * Builds the package into `dist/` (see `scripts/build-package.ts` at the root): `.` and `./react`
 * sharing one chunk of the layout, their rolled-up declarations, and `styles.css`, which is
 * `@data-profile/react`'s stylesheet. `@data-profile/core`, `@data-profile/react` and React are
 * never bundled.
 *
 *   bun run build              # check the API reports, then build
 *   bun run build --api-report # update the API reports instead of checking them
 */
import { join } from "node:path";
import { buildPackage } from "../../../scripts/build-package";

// Measured with the React entry added: 0.9 KB and 1.8 KB. Raise a budget deliberately, never
// silently.
await buildPackage({
  root: join(import.meta.dir, ".."),
  entries: ["index", "react"],
  styles: ["../react/styles.css"],
  budget: { index: 1_200, react: 2_500 },
});
