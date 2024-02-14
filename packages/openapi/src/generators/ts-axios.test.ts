import { Folder } from "@dasaplan/node-sdk";
import { bundleOpenapi } from "../bundle.js";
import { generateTypescriptAxios } from "./ts-axios.js";
import { createSpecProcessor } from "../post-process/index.js";

describe("Generator: ts-axios", () => {
  test("generate generateTypescriptAxios", async () => {
    const { outFile: bundled } = await bundleOpenapi("test/specs/pets-modular/pets-api.yml", {
      postProcessor: createSpecProcessor({
        ensureDiscriminatorValues: true,
        mergeAllOf: true,
      }),
    });
    const outFolder = generateTypescriptAxios(bundled, "test/out/ts");
    const files = Folder.of(outFolder).readAllFilesAsString();
    files.forEach((f) => expect(f.content).toMatchSnapshot(`generate-ts-${f.src}`));
  });
});
