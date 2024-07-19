import { Folder } from "@dasaplan/ts-sdk";
import { generateJava } from "./java.js";
import { bundleOpenapi, createSpecProcessor } from "@dasaplan/openapi-bundler";
import { resolveSpecPath } from "openapi-example-specs";
import path from "path";
import { describe, test, expect } from "vitest";

describe("Generator: java", () => {
  test("generate java", async () => {
    const spec = "pets-modular/pets-api.yml";
    const { outFile: bundled } = await bundleOpenapi(resolveSpecPath(spec), {
      postProcessor: createSpecProcessor({
        ensureDiscriminatorValues: true,
        mergeAllOf: true,
      }),
    });
    const outFolder = generateJava(bundled, "test/out/java");
    const files = Folder.of(outFolder).readAllFilesAsString();
    files.forEach((f) => expect(f.content).toMatchSnapshot(`java-${spec}-${path.basename(f.src)}`));
  });
});
