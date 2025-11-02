import { resolveSpecPath } from "openapi-example-specs";
import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { File, Folder } from "@dasaplan/ts-sdk";
import { formatSpec } from "./format.js";
import { appLog } from "./logger.js";

describe("format integration", () => {
  const outDir = Folder.resolve(__dirname, "..", "tmp", "format");
  beforeAll(() => {
    appLog.setLogLevel("debug");
  });

  afterAll(() => {
    appLog.setLogLevel("info");
  });

  test("spec", async () => {
    const specPath = resolveSpecPath("pets-modular-complex/petstore-api.yml");
    const file = File.of(specPath);
    const fmt = await formatSpec(file, { outFolder: outDir });
    expect(fmt).toBeDefined();
  });

  test("bundled", async () => {
    const specPath = resolveSpecPath("pets-modular-complex/bundled-petstore-api.yml");
    const file = File.of(specPath);
    const fmt = await formatSpec(file, { outFolder: outDir, sortSpec: true });
    expect(fmt).toBeDefined();
  });
});
