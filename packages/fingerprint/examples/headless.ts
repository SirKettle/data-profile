import {
  describeLayout,
  formFromItems,
  layoutFingerprint,
  type FingerprintDimension,
  type FingerprintItem,
} from "@data-profile/fingerprint";

export function summarise(items: FingerprintItem[], dimensions: FingerprintDimension[]) {
  const layout = layoutFingerprint({
    items,
    dimensions,
    encoding: { arrange: "genre" },
    form: formFromItems(items, dimensions),
    maxMarks: 600,
  });
  return {
    description: describeLayout(layout, "books"),
    pattern: layout.form.pattern,
    marks: layout.nodes.length,
    warnings: layout.warnings,
  };
}
