import { describe, expect, test } from "bun:test";

/**
 * Every README sample marked `<!-- example: name -->` is the file `examples/name`, character for
 * character, and `tsconfig.examples.json` typechecks those files (part of `bun run typecheck`). So
 * the README cannot show code that does not compile.
 */
describe("README examples", () => {
  test("each marked sample matches its example file", async () => {
    const root = `${import.meta.dir}/../..`;
    const readme = await Bun.file(`${root}/README.md`).text();
    const samples = [...readme.matchAll(/<!-- example: ([\w.-]+) -->\n\n?```\w+\n([\s\S]*?)```/g)];
    expect(samples.length).toBeGreaterThanOrEqual(5);
    for (const [, name, code] of samples)
      expect(await Bun.file(`${root}/examples/${name}`).text()).toBe(code!);
  });
});
