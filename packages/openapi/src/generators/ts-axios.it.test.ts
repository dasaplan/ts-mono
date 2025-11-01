import { Folder, File } from "@dasaplan/ts-sdk";
import { generateTypescriptAxios } from "./ts-axios.js";
import { createSpecProcessor, bundleOpenapi } from "@dasaplan/openapi-bundler";
import { resolveSpecPath } from "openapi-example-specs";
import path from "path";
import { describe, test, expect } from "vitest";

describe("Generator: ts-axios", () => {
  test("generate generateTypescriptAxios", async () => {
    const spec = "pets-modular/pets-api.yml";
    const out = Folder.of("test/out/ts-axios");

    const { outFile: bundled } = await bundleOpenapi(resolveSpecPath(spec), {
      outFile: out.makeFile(`${spec}-ts-bundled.yml`).absolutePath,
      postProcessor: createSpecProcessor({
        ensureDiscriminatorValues: true,
        mergeAllOf: true,
      }),
    });
    const outFolder = await generateTypescriptAxios(bundled, out.absolutePath);
    const files = Folder.of(outFolder)
      .lsFiles()
      .filter((f) => !f.endsWith("api.ts"))
      .map((f) => ({ src: f, content: File.of(f).readAsString() }));
    files.forEach((f) => expect(f.content).toMatchSnapshot(`generate-ts-${spec}-${path.basename(f.src)}`));
  }, 20000);
});
