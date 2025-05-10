import { describe, expect, test } from "vitest";
import { Pipeline } from "./index.js";

describe("pipeline", () => {
  test("onChangedSinceLastCommit", async () => {
    const actual = await Pipeline.onChangedSinceLastCommit("test");
    const testActual = actual.replace(/\[.*]/, "[hash]");
    expect(testActual).toMatchInlineSnapshot(`"pnpm --filter "...[hash]" test"`);
  });
  test("onChangedSinceLastCommit - error", async () => {
    const actual = await Pipeline.onChangedSinceLastCommit("test");
    const testActual = actual.replace(/\[.*]/, "[hash]");
    expect(testActual).toMatchInlineSnapshot(`"pnpm --filter "...[hash]" test"`);
  });

  test("onChangedSinceMain", () => {
    expect(Pipeline.onChangedSinceMain("test")).toMatchInlineSnapshot(`"pnpm --filter "...[origin/main]" test"`);
  });
});
