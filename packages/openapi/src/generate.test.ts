import { Folder, File } from "@dasaplan/ts-sdk";
import { generateOpenapi } from "./index.js";
import path from "path";
import { createTsPostProcessor } from "./post-process/index.js";
import { resolveSpecPath } from "openapi-example-specs";

describe("Generate Integration", () => {
  describe("ts", () => {
    test.each(["generic/api.yml"])("%s", async (spec) => {
      const api = resolveSpecPath(spec);
      const out = Folder.resolve("test/out/post", spec);
      const bundled = await generateOpenapi(api, out.absolutePath, { clearTemp: false, tempFolder: out.resolve("tmp").absolutePath });
      const processor = createTsPostProcessor({ deleteUnwantedFiles: false, ensureDiscriminatorValues: true });
      const g = processor(File.resolve(bundled, "api.ts").absolutePath);
      const files = Folder.of(g)
        .readAllFilesAsString()
        .map((f) => f.content);
      expect(files).toMatchSnapshot(`cleaned-${spec}`);
    });
  });

  describe("all", () => {
    test.each([
      "pets-modular/pets-api.yml",
      // "pets-simple/pets-api.yml",
      // "pets-modular-complex/petstore-api.yml",
      // "generic/api.yml",
      // "pets-recursive/pets-api.yml",
      // "usecases/extended-array-api.yml",
    ])("%s", async (spec) => {
      const api = resolveSpecPath(spec);
      const out = Folder.resolve("test/out/integration", spec);
      const outDir = await generateOpenapi(api, out.absolutePath, { clearTemp: false, tempFolder: out.resolve("tmp").absolutePath });
      const files = Folder.of(outDir)
        .readAllFilesAsString()
        .map((f) => f.content);
      expect(files).toMatchSnapshot(`generate-openapi-all-${spec}`);
    });
  });
});
