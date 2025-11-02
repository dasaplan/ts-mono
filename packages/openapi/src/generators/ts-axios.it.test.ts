import { Folder, File } from "@dasaplan/ts-sdk";
import { generateTypescriptAxios } from "./ts-axios.js";
import { createSpecProcessor, bundleOpenapi } from "@dasaplan/openapi-bundler";
import { resolveSpecPath } from "openapi-example-specs";
import path from "path";
import { describe, test, expect, beforeAll } from "vitest";

describe("Generator: ts-axios", () => {
  const spec = "pets-modular/pets-api.yml";

  const out = Folder.resolve(__dirname, "..", "..", "test/out/ts-axios");
  beforeAll(() => {
    out.deleteSelf();
  });

  test("generate generateTypescriptAxios", async () => {
    const { outFile: bundled } = await bundleOpenapi(resolveSpecPath(spec), {
      outFile: out.makeFile(`pets-modular-pets-api-ts-bundled.yml`).absolutePath,
      postProcessor: createSpecProcessor({
        ensureDiscriminatorValues: true,
        mergeAllOf: true,
      }),
    });

    const bundledApi = File.of(bundled).readAsString();
    expect(bundledApi).toMatchSnapshot(`bundled-ts-axios-${spec}`);
    console.log(`found files 1: ${JSON.stringify(out.lsFiles())}`);

    const outFolder = await generateTypescriptAxios(bundled, out.absolutePath);
    console.log(`found files 2: ${JSON.stringify(Folder.of(outFolder).lsFiles())}`);

    const files = Folder.of(outFolder)
      .lsFiles()
      .filter((f) => !f.endsWith("api.ts"))
      .map((f) => ({ src: f, content: File.of(f).readAsString() }));

    console.log(`found files: ${files.length}`);
    for (const f of files) {
      const fileName = path.basename(f.src);
      console.log(`name: ${fileName}, src: ${JSON.stringify(f.src)}`);
      expect(f.content).toMatchSnapshot(`generate-ts-${spec}-${fileName}`);
    }
  }, 20000);
});
