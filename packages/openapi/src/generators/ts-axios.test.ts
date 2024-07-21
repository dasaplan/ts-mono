import { Folder } from "@dasaplan/ts-sdk";
import { generateTypescriptAxios } from "./ts-axios.js";
import { createSpecProcessor, bundleOpenapi } from "@dasaplan/openapi-bundler";
import { resolveSpecPath } from "openapi-example-specs";
import path from "path";
import { describe, test, expect } from "vitest";

describe("Generator: ts-axios", () => {
  test("generate generateTypescriptAxios", async () => {
    const spec = "pets-modular/pets-api.yml";
    const out = Folder.of("test/out/ts");

    const { outFile: bundled } = await bundleOpenapi(resolveSpecPath(spec), {
      outFile: out.makeFile("bundled.yml").absolutePath,
      postProcessor: createSpecProcessor({
        ensureDiscriminatorValues: true,
        mergeAllOf: true,
      }),
    });
    const outFolder = generateTypescriptAxios(bundled, out.absolutePath);
    const files = Folder.of(outFolder).readAllFilesAsString();
    files.forEach((f) => expect(f.content).toMatchSnapshot(`generate-ts-${spec}-${path.basename(f.src)}`));
  });
});
