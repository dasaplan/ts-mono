import { File, Folder } from "@dasaplan/ts-sdk/index.js";
import { bundleOpenapi } from "../bundle.js";
import { createSpecProcessor } from "../post-process/index.js";
import { Transpiler } from "./transpiler.js";
import { resolveSpecPath } from "openapi-example-specs";

describe("transpiler", () => {
  test("endpoints", async () => {
    const specPath = resolveSpecPath("pets-modular/pets-api.yml");
    const { parsed } = await bundleOpenapi(specPath ?? "", {
      outFile: Folder.cwd("tmp", "endpoints").makeFile(File.of(specPath).name)
        .absolutPath,
      postProcessor: createSpecProcessor({
        mergeAllOf: true,
        ensureDiscriminatorValues: true,
      }),
    });
    // const schemas = await generateZod(parsed);
    const spec = Transpiler.of(parsed);
    const endpoints = spec.endpoints();
    expect(endpoints).toMatchSnapshot("endpoints");
  });

  test("schemas", async () => {
    const specPath = resolveSpecPath("pets-modular/pets-api.yml");
    const { parsed } = await bundleOpenapi(specPath, {
      outFile: Folder.cwd("tmp", "schemas").makeFile(File.of(specPath).name)
        .absolutPath,
      postProcessor: createSpecProcessor({
        mergeAllOf: true,
        ensureDiscriminatorValues: true,
      }),
    });
    const spec = Transpiler.of(parsed);
    const schemas = spec.schemas();
    expect(schemas).toMatchSnapshot("schemas");
    expect(schemas).toMatchSnapshot("schemas");
  });

  test.each([
    resolveSpecPath("pets-modular/pets-api.yml"),
    resolveSpecPath("pets-simple/pets-api.yml"),
    resolveSpecPath("pets-modular-complex/petstore-api.yml"),
    resolveSpecPath("generic/api.yml"),
  ])("transpile %s", async (api) => {
    const { parsed } = await bundleOpenapi(api, {
      outFile: Folder.cwd("tmp", "transpile").makeFile(File.of(api).name)
        .absolutPath,
      postProcessor: createSpecProcessor({
        mergeAllOf: true,
        ensureDiscriminatorValues: true,
      }),
    });
    const spec = Transpiler.of(parsed);
    expect(spec.schemas()).toMatchSnapshot("schemas");
    expect(spec.schemasTopoSorted()).toMatchSnapshot("schemas-sorted");
    expect(spec.endpoints()).toMatchSnapshot("endpoints");
  });
});
