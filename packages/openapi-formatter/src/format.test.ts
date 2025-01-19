import { resolveSpecPath } from "openapi-example-specs";
import { describe, test, expect } from "vitest";
import { File } from "@dasaplan/ts-sdk";
import { formatSpec } from "./format.js";

describe("format", () => {
  test("spec", async () => {
    const specPath = resolveSpecPath("pets-modular/pets-api.yml");
    const file = File.of(specPath);
    const fmt = await formatSpec(file, File.of("tmp", "fmt-pets-api.yml"));
    // const fmt = await resolveSpec(file);
    expect(fmt).toBeDefined();
  });
});
