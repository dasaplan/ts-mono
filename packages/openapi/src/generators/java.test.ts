import { Folder } from "@dasaplan/node-sdk";
import { bundleOpenapi } from "../bundle.js";
import { createSpecProcessor } from "../post-process/index.js";
import { generateJava } from "./java.js";

describe("Generator: java", () => {
  test("generate java", async () => {
    const { outFile: bundled } = await bundleOpenapi("test/specs/pets-modular/pets-api.yml", {
      postProcessor: createSpecProcessor({
        ensureDiscriminatorValues: true,
        mergeAllOf: true,
      }),
    });
    const outFolder = generateJava(bundled, "test/out/java");
    const files = Folder.of(outFolder).readAllFilesAsString();
    files.forEach((f) => expect(f.content).toMatchSnapshot(`java-${f.src}`));
  });
});
