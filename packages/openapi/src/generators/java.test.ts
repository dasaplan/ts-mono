import { Folder } from "@dasaplan/ts-sdk";
import { generateJava } from "./java.js";
import { bundleOpenapi, createSpecProcessor } from "@dasaplan/openapi-bundler";
import { resolveSpecPath } from "openapi-example-specs";
import path from "path";
import { describe, test, expect } from "vitest";

describe("Generator: java", () => {
  test("generate java", async () => {
    const spec = "pets-modular/pets-api.yml";
    const out = Folder.of("test/out/java");
    const { outFile: bundled } = await bundleOpenapi(resolveSpecPath(spec), {
      outFile: out.makeFile("bundled.yml").absolutePath,
      postProcessor: createSpecProcessor({
        ensureDiscriminatorValues: true,
        mergeAllOf: true,
      }),
    });

    const outFolder = generateJava(bundled, out.absolutePath);
    const files = Folder.of(outFolder).readAllFilesAsString();
    files.forEach((f) => expect(f.content).toMatchSnapshot(`java-${spec}-${path.basename(f.src)}`));
  });
});
