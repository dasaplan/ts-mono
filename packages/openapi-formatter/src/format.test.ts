import { resolveSpecPath } from "openapi-example-specs";
import { describe, test, expect } from "vitest";
import { File, Folder } from "@dasaplan/ts-sdk";
import { formatSpec } from "./format.js";

describe("format", () => {
  test("spec", async () => {
    const specPath = resolveSpecPath("pets-modular-complex/petstore-api.yml");
    const file = File.of(specPath);
    const fmt = await formatSpec(file, { outFolder: Folder.of("tmp") });
    expect(fmt).toBeDefined();
  });

  test("bundled", async () => {
    const file = File.of("tmp/bundled-petstore-api.yml");
    const fmt = await formatSpec(file, { outFolder: Folder.of("tmp2") });
    expect(fmt).toBeDefined();
  });
});
