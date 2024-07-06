import { Folder, File } from "@dasaplan/ts-sdk";
import { generateOpenapi } from "./index.js";
import path from "path";
import { createTsPostProcessor } from "./post-process/index.js";
import { resolveSpecPath } from "openapi-example-specs";

describe("Generate Integration", () => {
  describe("ts", () => {
    test.each(["generic/api.yml"])("%s", async (spec) => {
      const api = resolveSpecPath(spec);
      const out = Folder.resolve("test/out/post", path.dirname(spec)).absolutePath;
      const bundled = await generateOpenapi(api, out, { clearTemp: false });
      const processor = createTsPostProcessor({ deleteUnwantedFiles: false, ensureDiscriminatorValues: true });
      const g = processor(File.resolve(bundled, "api.ts").absolutPath);
      expect(Folder.of(g).readAllFilesAsString()).toMatchSnapshot(`cleaned-${api}`);
    });
  });

  describe("all", () => {
    test.each([
      "pets-modular/pets-api.yml",
      "pets-simple/pets-api.yml",
      "pets-modular-complex/petstore-api.yml",
      "generic/api.yml",
      "pets-recursive/pets-api.yml",
    ])("%s", async (spec) => {
      const api = resolveSpecPath(spec);
      const out = Folder.resolve("test/out/integration", path.dirname(spec)).absolutePath;
      const bundled = await generateOpenapi(api, out, { clearTemp: false });
      const files = Folder.of(bundled).readAllFilesAsString();
      files.forEach((f) => expect(f.content).toMatchSnapshot(`generate-openapi-${f.src}`));
    });
  });
});
