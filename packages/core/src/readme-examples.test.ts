import { describe, expect, test } from "bun:test";

/**
 * Every README sample marked `<!-- example: name -->` is the file `examples/name`, character for
 * character, and `tsconfig.examples.json` typechecks those files (part of `bun run typecheck`). So
 * the README cannot show code that does not compile.
 */
describe("README examples", () => {
  test("each marked sample matches its example file", async () => {
    const root = `${import.meta.dir}/..`;
    const readme = await Bun.file(`${root}/README.md`).text();
    const samples = [...readme.matchAll(/<!-- example: ([\w.-]+) -->\n\n?```\w+\n([\s\S]*?)```/g)];
    expect(samples.length).toBeGreaterThanOrEqual(1);
    for (const [, name, code] of samples)
      expect(await Bun.file(`${root}/examples/${name}`).text()).toBe(code!);
  });

  test("the description the README shows is the one encode.ts produces", async () => {
    const { describeProfile, encodeProfile } = await import("./index");
    const readme = await Bun.file(`${import.meta.dir}/../README.md`).text();
    const shown = readme.match(/describeProfile\(profile, "books"\); \/\/ "(.*)"/)![1];
    const profile = encodeProfile({
      items: [
        { id: "a", values: { genre: "fiction" } },
        { id: "b", values: { genre: "poetry" } },
        { id: "c", values: { genre: null } },
      ],
      dimensions: [
        {
          id: "genre",
          label: "Genre",
          categories: [
            { id: "fiction", label: "Fiction" },
            { id: "poetry", label: "Poetry" },
          ],
        },
      ],
    });
    expect(describeProfile(profile, "books")).toBe(shown!);
  });
});
