import type { MarkProps, Renderer } from "@data-profile/react";
import type { FingerprintNode } from "../types";

export { markOpacity } from "@data-profile/core";
export { dotsRenderer, shapesRenderer } from "@data-profile/react";

/** What a renderer's `mark` receives. `@data-profile/react`'s `MarkProps`, for a fingerprint's nodes. */
export type FingerprintMarkProps = MarkProps<FingerprintNode>;

/**
 * Draws marks: `@data-profile/react`'s `Renderer`. `mark` draws one mark centred on the origin,
 * `node.size` across, with the ridge running along the x axis; the canvas positions and rotates it.
 * A renderer draws any data-profile view, since every view's marks have this shape.
 */
export type FingerprintRenderer = Renderer<FingerprintNode>;
