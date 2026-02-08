import { File, Folder } from "@dasaplan/ts-sdk";
import { bundleOpenapi, OpenApiBundled } from "../bundle.js";
import { createSpecProcessor } from "../post-process/index.js";
import { Transpiler } from "./transpiler.js";
import { ExampleSpec, resolveSpecPath } from "openapi-example-specs";
import { describe, test, expect } from "vitest";
import { OpenapiBundledMock } from "../bundled-mock.js";

describe("transpiler", () => {
  const { withSchemas, createApi } = OpenapiBundledMock.create();

  test("foo", async () => {
    const spec = resolveSpecPath("fullmetal/openapi.yml");
    const out = Folder.cwd("tmp", "react");
    const { parsed } = await bundleOpenapi(spec, {
      outFile: out.makeFile(File.of(spec).name).absolutePath,
      ensureDiscriminatorValues: true,
      mergeAllOf: true,
    });

    const transpiler = Transpiler.of(parsed);
    const schemas = transpiler.schemasTopoSorted().map((s) => {
      return {
        id: s.getId(),
        name: s.getName(),
        kind: s.kind,
        componentType: s.component.kind,
        isCircular: s.isCircular,
      };
    });

    const _endpoints = transpiler.endpoints();
    const endpoints = _endpoints.map((e) => {
      return {
        operationId: e.alias,
        method: e.method,
        deprecated: e.deprecated,
        description: e.description,
        path: e.path,
        requestBodyId: e.requestBody?.schema?.getId(),
      };
    });

    const requests = _endpoints.flatMap((e) => {
      if (!e.requestBody || !e.requestBody.schema) return [];
      return {
        id: `${e.alias}::${e.requestBody.schema.getId()}`,
        operationId: e.alias,
        parameterIds: e.parameters?.map((p) => `${e.alias}::${p.name}`) ?? [],
        format: e.requestBody.format,
      };
    });

    const responses = _endpoints.flatMap((e) =>
      e.responses.map((r) => ({
        id: `${e.alias}::${r.status}`,
        operationId: e.alias,
        description: r.description,
        status: r.status,
        format: r.format,
        schemaId: r.schema?.getId(),
      })),
    );

    const parameters = transpiler.parameters().map((p) => ({
      id: `${p.endpoint.alias}::${p.name}`,
      description: p.description,
      operationId: p.endpoint.alias,
      name: p.name,
      schemaId: p.schema.getId(),
      isRequired: p.isRequired,
      type: p.type,
    }));

    out.makeFile("transpiled.json").write(
      JSON.stringify({
        api: {
          openapiVersion: parsed.openapi,
          info: parsed.info,
        },
        schemas,
        endpoints,
        parameters,
        responses,
        requests,
      }),
    );
  });

  test("endpoints", async () => {
    const specPath = resolveSpecPath("pets-modular/pets-api.yml");
    const { parsed } = await bundleOpenapi(specPath ?? "", {
      outFile: Folder.cwd("tmp", "endpoints").makeFile(File.of(specPath).name).absolutePath,
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
      outFile: Folder.cwd("tmp", "schemas").makeFile(File.of(specPath).name).absolutePath,
      postProcessor: createSpecProcessor({
        mergeAllOf: true,
        ensureDiscriminatorValues: true,
      }),
    });
    const spec = Transpiler.of(parsed);
    const schemas = spec.schemas();
    expect(schemas).toMatchSnapshot("schemas");
  });

  test("schemas fullmetal", async () => {
    const specPath = resolveSpecPath("fullmetal/openapi.yml");
    const { parsed } = await bundleOpenapi(specPath, {
      outFile: Folder.cwd("tmp", "schemas").makeFile(File.of(specPath).name).absolutePath,
      postProcessor: createSpecProcessor({
        mergeAllOf: true,
        ensureDiscriminatorValues: true,
      }),
    });
    const spec = Transpiler.of(parsed);
    const schemas = spec.schemas();
    const parameters = spec.parameters();
    expect(schemas).toMatchSnapshot("fullmetal");
    expect(JSON.parse(JSON.stringify(parameters))).toMatchInlineSnapshot(`
      [
        {
          "endpoint": {
            "alias": "updateInventoryItem",
            "deprecated": false,
            "method": "put",
            "path": "/inventory/{productId}",
          },
          "isRequired": true,
          "name": "productId",
          "schema": {
            "component": {
              "kind": "INLINE",
              "name": "productIdSchema",
            },
            "kind": "PRIMITIVE",
            "raw": {
              "type": "string",
            },
            "type": "string",
          },
          "type": "path",
        },
        {
          "endpoint": {
            "alias": "changeInventoryItem",
            "deprecated": false,
            "method": "post",
            "path": "/inventory/{productId}",
          },
          "isRequired": true,
          "name": "productId",
          "schema": {
            "component": {
              "kind": "INLINE",
              "name": "productIdSchema",
            },
            "kind": "PRIMITIVE",
            "raw": {
              "type": "string",
            },
            "type": "string",
          },
          "type": "path",
        },
      ]
    `);
  });

  test("transpile debug", async () => {
    const api = resolveSpecPath("generic/api.yml");
    const { parsed } = await bundleOpenapi(api, {
      outFile: Folder.cwd("tmp", "transpile").makeFile(File.of(api).name).absolutePath,
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
  test.each(["pets-modular/pets-api.yml", "pets-simple/pets-api.yml", "pets-modular-complex/petstore-api.yml", "generic/api.yml"] satisfies Array<ExampleSpec>)(
    "transpile %s",
    async (specName) => {
      const api = resolveSpecPath(specName);
      const { parsed } = await bundleOpenapi(api, {
        outFile: Folder.cwd("tmp", "transpile").makeFile(File.of(api).name).absolutePath,
        postProcessor: createSpecProcessor({
          mergeAllOf: true,
          ensureDiscriminatorValues: true,
        }),
      });
      const spec = Transpiler.of(parsed);
      expect(spec.schemas()).toMatchSnapshot("schemas");
      expect(spec.schemasTopoSorted()).toMatchSnapshot("schemas-sorted");
      expect(spec.endpoints()).toMatchSnapshot("endpoints");
    },
  );

  test("should toposort array items correctly for allOf item", () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
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
      }),
    );
    const spec = Transpiler.of(openapi);
    expect(spec.schemasTopoSorted().map((s) => s.getName())).toEqual(["Parent", "B", "A", "List"]);
  });

  test("should toposort array items correctly - union", () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Union: {
          oneOf: [{ $ref: "#/components/schemas/A" }, { $ref: "#/components/schemas/B" }],
          discriminator: {
            propertyName: "kind",
            mapping: {
              A: "#/components/schemas/A",
              B: "#/components/schemas/B",
            },
          },
        },
        A: {
          type: "object",
          properties: {
            kind: { type: "string" },
            propA: { type: "string" },
          },
        },
        B: {
          type: "object",
          properties: {
            propB: { type: "string" },
          },
        },
        List: {
          type: "object",
          properties: {
            unions: {
              type: "array",
              items: { $ref: "#/components/schemas/Union" },
            },
          },
        },
      }),
    );
    const spec = Transpiler.of(openapi);
    expect(spec.schemasTopoSorted().map((s) => s.getName())).toEqual(["B", "A", "Union", "List"]);
  });

  test("should toposort array items correctly - top level array", () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Union: {
          oneOf: [{ $ref: "#/components/schemas/A" }, { $ref: "#/components/schemas/B" }],
          discriminator: {
            propertyName: "kind",
            mapping: {
              A: "#/components/schemas/A",
              B: "#/components/schemas/B",
            },
          },
        },
        Parent: {
          type: "object",
          required: ["kind"],
          properties: {
            parentProp: { type: "string" },
            kind: { type: "string" },
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
          type: "array",
          items: { $ref: "#/components/schemas/Union" },
        },
      }),
    );
    const spec = Transpiler.of(openapi);
    const schemas = spec.schemasTopoSorted();
    expect(schemas.map((s) => s.getName())).toEqual(["Parent", "B", "A", "Union", "List"]);
  });

  test("should toposort array items correctly - multiple inheritance", () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        C: {
          type: "object",
          properties: {
            propC: { type: "string" },
          },
        },
        A: {
          type: "object",
          properties: {
            propA: { $ref: "#/components/schemas/C" },
          },
        },
        B: {
          type: "object",
          properties: {
            propB: { $ref: "#/components/schemas/A" },
          },
        },
      }),
    );
    const spec = Transpiler.of(openapi);
    const schemas = spec.schemasTopoSorted();
    expect(schemas.map((s) => s.getName())).toEqual(["C", "A", "B"]);
  });
});
