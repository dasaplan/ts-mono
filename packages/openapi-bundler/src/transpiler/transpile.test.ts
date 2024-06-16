import { bundleOpenapi } from "../bundle.js";
import { createSpecProcessor } from "../post-process/index.js";
import { Transpiler } from "./transpiler.js";

describe("transpiler", () => {
  test("endpoints", async () => {
    const { parsed } = await bundleOpenapi("test/specs/pets-modular/pets-api.yml", {
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
    const { parsed } = await bundleOpenapi("test/specs/pets-modular/pets-api.yml", {
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
    "test/specs/pets-modular/pets-api.yml",
    "test/specs/pets-simple/pets-api.yml",
    "test/specs/pets-modular-complex/petstore-api.yml",
    "test/specs/generic/api.yml",
  ])("transpile %s", async (api) => {
    const { parsed } = await bundleOpenapi(api, {
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
