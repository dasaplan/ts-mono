import { Folder, File } from "@dasaplan/ts-sdk";
import { generateOpenapi } from "./index.js";
import { createTsPostProcessor } from "./post-process/index.js";
import { ExampleSpec, resolveSpecPath } from "openapi-example-specs";
import { describe, test, expect } from "vitest";

describe("Generate Integration", () => {
  describe("ts", () => {
    test.each(["generic/api.yml"] as Array<ExampleSpec>)(
      "%s",
      async (spec) => {
        const api = resolveSpecPath(spec);
        const out = Folder.resolve("test/out/post", spec);
        const bundled = await generateOpenapi(api, out.absolutePath, { clearTemp: true, tempFolder: out.cd("tmp").absolutePath });
        const processor = createTsPostProcessor({ deleteUnwantedFiles: false, ensureDiscriminatorValues: true });
        const g = processor(File.resolve(bundled, "api.ts").absolutePath);
        const files = Folder.of(g)
          .readAllFilesAsString()
          .map((f) => f.content);
        expect(files).toMatchSnapshot(`cleaned-${spec}`);
      },
      20000,
    );
  });

  describe("all", () => {
    test.each([
      "pets-modular/pets-api.yml",
      "pets-simple/pets-api.yml",
      "pets-modular-complex/petstore-api.yml",
      "generic/api.yml",
      "pets-recursive/pets-api.yml",
      "usecases/extended-array-api.yml",
    ] satisfies Array<ExampleSpec>)("%s", async (spec) => {
      const api = resolveSpecPath(spec);
      const testDir = Folder.resolve(__dirname, "..", "test");
      const out = testDir.cd("out/integration", spec);
      const outDir = await generateOpenapi(api, out.absolutePath, {
        clearTemp: true,
        tempFolder: out.cd("tmp").absolutePath,
      });
      const files = Folder.of(outDir).lsFiles();

      for (const f of files) {
        if (f.endsWith("api.ts")) {
          console.log("ignoring api.ts in snapshot because of generator shenanigans");
          continue;
        }
        const filename = File.of(f).name;
        const content = File.of(f).readAsString();
        expect(content).toMatchSnapshot(`it-generate-all-${filename}-${spec}`);
      }
    });
  }, 20000);
});
