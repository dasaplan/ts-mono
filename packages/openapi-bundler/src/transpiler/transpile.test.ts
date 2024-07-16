import { File, Folder } from "@dasaplan/ts-sdk/index.js";
import { bundleOpenapi, OpenApiBundled } from "../bundle.js";
import { createSpecProcessor } from "../post-process/index.js";
import { Transpiler } from "./transpiler.js";
import { resolveSpecPath } from "openapi-example-specs";
import { oas30 } from "openapi3-ts";

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
    "pets-modular/pets-api.yml",
    "pets-simple/pets-api.yml",
    "pets-modular-complex/petstore-api.yml",
    "generic/api.yml",
  ])("transpile %s", async (specName) => {
    const api = resolveSpecPath(specName);
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

  test("should toposort array items correctly", () => {
    const openapi: OpenApiBundled = createApi((oa) =>
      withSchemas(oa, {
        Parent: {
          type: "object",
          properties: {
            parentProp: { type: "string" },
          },
        },
        A: {
          allOf: [
            { $ref: "#/components/schemas/Parent" },
            {
              type: "object",
              properties: {
                propA: { type: "string" },
              },
            },
          ],
        },
        B: {
          allOf: [
            { $ref: "#/components/schemas/Parent" },
            {
              type: "object",
              properties: {
                propB: { type: "string" },
              },
            },
          ],
        },
        List: {
          type: "object",
          properties: {
            as: {
              type: "array",
              items: { $ref: "#/components/schemas/A" },
            },
            bs: {
              type: "array",
              items: { $ref: "#/components/schemas/B" },
            },
          },
        },
      })
    );
    const spec = Transpiler.of(openapi);
    expect(spec.schemasTopoSorted().map((s) => s.getName())).toEqual([
      "Parent",
      "B",
      "A",
      "List",
    ]);
  });
});

function createApi(
  ...mods: Array<(oa: OpenApiBundled) => OpenApiBundled>
): OpenApiBundled {
  const api: OpenApiBundled = {
    openapi: "3.0.3",
    info: { version: "", title: "" },
    paths: {},
    components: {
      schemas: {},
    },
  };
  return mods.reduce((acc, curr) => curr(acc), api);
}

function withSchemas(
  oa: OpenApiBundled,
  schemas: NonNullable<oas30.ComponentsObject["schemas"]>
): OpenApiBundled {
  return {
    ...oa,
    components: {
      ...oa.components,
      schemas: {
        ...(oa.components?.schemas ?? {}),
        ...schemas,
      },
    },
  };
}
