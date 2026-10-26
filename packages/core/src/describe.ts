import type { Channel, Profile } from "./types";

const PROPERTY: Record<Exclude<Channel, "arrange">, string> = {
  color: "colour",
  shape: "shape",
  lightness: "lightness",
};

/**
 * A plain-language summary of what a profile shows, for a screen reader or a caption: the total,
 * the largest categories of the arranging dimension with their counts, which dimension each visual
 * property shows when they differ, and how many items each mark stands for. Every number in it is
 * one the legends also show. A view's layout that carries these fields can be passed as it is.
 */
export function describeProfile(
  profile: Pick<Profile, "encoding" | "legends" | "itemsPerMark" | "itemCount">,
  unit = "items",
): string {
  if (profile.itemCount === 0) return `No ${unit} yet.`;
  const arrange = profile.legends.find((group) => group.dimensionId === profile.encoding.arrange)!;
  const ranked = arrange.entries
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
  const named = ranked
    .slice(0, 3)
    .map((entry) => `${entry.label} ${entry.count.toLocaleString("en-GB")}`);
  const rest = ranked.length - named.length;
  const parts = [
    `${profile.itemCount.toLocaleString("en-GB")} ${unit} by ${arrange.label.toLowerCase()}: ${named.join(", ")}${
      rest > 0 ? `, and ${rest} more ${rest === 1 ? "category" : "categories"}` : ""
    }.`,
  ];
  if (profile.legends.length > 1) {
    const shown = profile.legends.flatMap((group) =>
      group.channels
        .filter((channel): channel is Exclude<Channel, "arrange"> => channel !== "arrange")
        .map((channel) =>
          channel === "lightness"
            ? `lightness shows ${group.label.toLowerCase()} (fainter is earlier)`
            : `${PROPERTY[channel]} shows ${group.label.toLowerCase()}`,
        ),
    );
    if (shown.length) parts.push(`${shown.join(", ").replace(/^./, (c) => c.toUpperCase())}.`);
  }
  if (profile.itemsPerMark > 1)
    parts.push(`Each mark stands for up to ${profile.itemsPerMark} ${unit}.`);
  return parts.join(" ");
}
