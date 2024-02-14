import { Folder, File } from "@dasaplan/node-sdk";
import { generateOpenapi } from "./index.js";
import path from "path";
import { createTsPostProcessor } from "./post-process/index.js";

describe("Generate Integration", () => {
  describe("ts", () => {
    test.each(["test/specs/generic/api.yml"])("%s", async (api) => {
      const out = Folder.resolve("test/out/post", path.dirname(api)).absolutePath;
      const bundled = await generateOpenapi(api, out, { clearTemp: false });
      const processor = createTsPostProcessor({ deleteUnwantedFiles: false, ensureDiscriminatorValues: true });
      const g = processor(File.resolve(bundled, "api.ts").absolutPath);
      expect(Folder.of(g).readAllFilesAsString()).toMatchSnapshot(`cleaned-${api}`);
    });
  });

  describe("all", () => {
    test.each([
      "test/specs/pets-modular/pets-api.yml",
      "test/specs/pets-simple/pets-api.yml",
      "test/specs/pets-modular-complex/petstore-api.yml",
      "test/specs/generic/api.yml",
      "test/specs/pets-recursive/pets-api.yml",
    ])("%s", async (api) => {
      const out = Folder.resolve("test/out/integration", path.dirname(api)).absolutePath;
      const bundled = await generateOpenapi(api, out, { clearTemp: false });
      const files = Folder.of(bundled).readAllFilesAsString();
      files.forEach((f) => expect(f.content).toMatchSnapshot(`generate-openapi-${f.src}`));
    });
  });
});
