import { Folder } from "@dasaplan/ts-sdk";
import { generateTypescriptAxios } from "./ts-axios.js";
import { createSpecProcessor, bundleOpenapi } from "@dasaplan/openapi-bundler";
import { resolveSpecPath } from "openapi-example-specs";
import path from "path";

describe("Generator: ts-axios", () => {
  test("generate generateTypescriptAxios", async () => {
    const spec = "pets-modular/pets-api.yml";
    const { outFile: bundled } = await bundleOpenapi(resolveSpecPath(spec), {
      postProcessor: createSpecProcessor({
        ensureDiscriminatorValues: true,
        mergeAllOf: true,
      }),
    });
    const outFolder = generateTypescriptAxios(bundled, "test/out/ts");
    const files = Folder.of(outFolder).readAllFilesAsString();
    files.forEach((f) => expect(f.content).toMatchSnapshot(`generate-ts-${spec}-${path.basename(f.src)}`));
  });
});
