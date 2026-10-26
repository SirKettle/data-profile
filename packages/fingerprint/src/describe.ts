import { describeProfile } from "@data-profile/core";
import type { FingerprintLayout } from "./types";

/**
 * A plain-language summary of what a layout shows, for a screen reader or a caption: the total, the
 * largest categories of the arranging dimension with their counts, which dimension each visual
 * property shows when they differ, and how many items each mark stands for. Every number in it is
 * one the legends also show. Core's `describeProfile`.
 */
export function describeLayout(layout: FingerprintLayout, unit = "items"): string {
  return describeProfile(layout, unit);
}
