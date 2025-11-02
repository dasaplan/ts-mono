import { Folder, File } from "@dasaplan/ts-sdk";
import { generateOpenapi } from "./index.js";
import { createTsPostProcessor } from "./post-process/index.js";
import { ExampleSpec, resolveSpecPath } from "openapi-example-specs";
import { describe, test, expect, beforeEach } from "vitest";

describe("Generate Integration", () => {
  describe("ts", () => {
    test.each(["generic/api.yml"] as Array<ExampleSpec>)(
      "%s",
      async (spec) => {
        const api = resolveSpecPath(spec);
        const out = Folder.resolve("test/out/post", spec);
        const bundled = await generateOpenapi(api, out.absolutePath, { clearTemp: true, tempFolder: out.cd("tmp").absolutePath });
        const processor = createTsPostProcessor({ deleteUnwantedFiles: false, ensureDiscriminatorValues: true });
        const outDir = processor(File.resolve(bundled, "api.ts").absolutePath);

        // noinspection DuplicatedCode
        const files = Folder.of(outDir).lsFiles().sort();
        for (const f of files) {
          if (f.endsWith("api.ts")) {
            console.log("ignoring api.ts in snapshot because of generator shenanigans");
            continue;
          }
          const filename = File.of(f).name;
          const content = File.of(f).readAsString();
          expect(content).toMatchSnapshot(`it-generate-all-${filename}-${spec}`);
        }
      },
      20000,
    );
  });

  describe("all", () => {
    const testDir = Folder.resolve(__dirname, "..", "test");
    const testOutDir = testDir.cd("out", "integration");

    beforeEach(() => {
      testOutDir.deleteSelf();
    });

    test.each([
      "pets-modular-complex/petstore-api.yml",
      "pets-modular/pets-api.yml",
      "pets-simple/pets-api.yml",
      "generic/api.yml",
      "pets-recursive/pets-api.yml",
      "usecases/extended-array-api.yml",
    ] satisfies Array<ExampleSpec>)("%s", async (spec) => {
      const api = resolveSpecPath(spec);
      const out = testOutDir.cd(spec);

      const outDir = await generateOpenapi(api, out.absolutePath, {
        clearTemp: true,
        tempFolder: out.cd(`tmp/${spec}`).absolutePath,
      });

      // noinspection DuplicatedCode
      const files = Folder.of(outDir).lsFiles().sort();
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
