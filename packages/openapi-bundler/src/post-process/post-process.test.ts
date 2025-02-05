/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import { bundleOpenapi, bundleParseOpenapi } from "../bundle.js";
import { mergeAllOf } from "./processors/merge-all-of.js";
import { _, Folder } from "@dasaplan/ts-sdk";
import * as path from "node:path";
import jsonSchemaMergeAllOff from "json-schema-merge-allof";
import { ensureDiscriminatorValues } from "./processors/ensure-discriminator-values.js";
import { ExampleSpec, resolveSpecPath } from "openapi-example-specs";
import { describe, test, expect } from "vitest";
import { OpenapiBundledMock } from "../bundled-mock.js";
import { createSpecProcessor } from "./post-process.js";
import { OpenapiApiDoc } from "./processors/spec-accessor.js";
import accessor = OpenapiApiDoc.accessor;

describe("post process", () => {
  describe("spec", () => {
    describe("ensureDiscriminatorValues", () => {
      test.each([
        "pets-modular/pets-api.yml",
        "pets-simple/pets-api.yml",
        "pets-modular-complex/petstore-api.yml",
        "generic/api.yml",
      ] satisfies Array<ExampleSpec>)("%s", async (spec) => {
        const api = resolveSpecPath(spec);
        const { parsed } = await bundleOpenapi(api, {
          mergeAllOf: false,
          ensureDiscriminatorValues: false,
        });

        const mergedAllOf = mergeAllOf(_.cloneDeep(parsed));
        const ensured = ensureDiscriminatorValues(_.cloneDeep(parsed));
        const ensuredMerged = mergeAllOf(ensureDiscriminatorValues(_.cloneDeep(ensured)));

        const testOut = Folder.resolve(`test/out/discriminator-values`, spec);
        testOut.writeYml(`bundled-${path.basename(spec)}`, parsed);
        testOut.writeYml(`merged-${path.basename(spec)}`, mergedAllOf);
        testOut.writeYml(`ensured-${path.basename(spec)}`, ensured);
        testOut.writeYml(`ens-mrg-${path.basename(spec)}`, ensuredMerged);
        expect(parsed).toMatchSnapshot(`ensured-${spec}`);
        expect(mergedAllOf).toMatchSnapshot(`merged-${spec}`);
        expect(ensured).toMatchSnapshot(`bndl-${spec}`);
        expect(ensuredMerged).toMatchSnapshot(`ensured-merged-${spec}`);
      });
    });

    test("lib", () => {
      const cache = { a: { minLength: 1 } };
      expect(
        jsonSchemaMergeAllOff(
          {
            allOf: [
              {
                title: "a",
                properties: {
                  a: { type: "string" },
                },
              },
              {
                title: "b",
                properties: {
                  a: { $ref: "#/a" },
                },
              },
            ],
          },
          {
            resolvers: {
              title: ([a, b]: [a: string | undefined, b: string | undefined]) => b ?? a!,
            },
          },
        ),
      ).toEqual({
        properties: {
          a: {
            $ref: "#/a",
            type: "string",
          },
        },
        title: "b",
      });
    });
  });

  test("resolve conflicting schemas with x-omit", async () => {
    const {
      createApi,
      withSchema,
      factory: { schemaRef, mockSchema, mockXOmit, mockXPick },
    } = OpenapiBundledMock.create();

    const spec = createApi(
      withSchema("A", {
        properties: { a: { type: "object" }, aaa: { type: "string" } },
      }),
      withSchema("B", {
        properties: { a: { type: "array" }, b: { type: "object" } },
      }),
      withSchema("AB", {
        allOf: [
          schemaRef("A"),
          mockXOmit({
            properties: {
              a: true,
            },
          }),
          schemaRef("B"),
          mockSchema({ properties: { c: { type: "string" } } }),
        ],
      }),
    );

    const processor = createSpecProcessor();
    const actual = processor?.(spec);
    expect(accessor(actual!).getSchemaByName("AB")).toMatchInlineSnapshot(`
      {
        "properties": {
          "a": {
            "type": "array",
          },
          "aaa": {
            "type": "string",
          },
          "b": {
            "type": "object",
          },
          "c": {
            "type": "string",
          },
        },
        "type": "object",
      }
    `);
  });

  test("resolve conflicting schemas with x-pick", async () => {
    const {
      createApi,
      withSchema,
      factory: { schemaRef, mockSchema, mockXOmit, mockXPick },
    } = OpenapiBundledMock.create();

    const spec = createApi(
      withSchema("A", {
        properties: { a: { type: "object" }, aaa: { type: "string" } },
      }),
      withSchema("B", {
        properties: { a: { type: "array" }, b: { type: "object" } },
      }),
      withSchema("AB", {
        allOf: [
          schemaRef("A"),
          mockXPick({
            properties: {
              aaa: true,
            },
          }),
          schemaRef("B"),
          mockSchema({ properties: { c: { type: "string" } } }),
        ],
      }),
    );

    const processor = createSpecProcessor();
    const actual = processor?.(spec);
    expect(accessor(actual!).getSchemaByName("AB")).toMatchInlineSnapshot(`
      {
        "properties": {
          "a": {
            "type": "array",
          },
          "aaa": {
            "type": "string",
          },
          "b": {
            "type": "object",
          },
          "c": {
            "type": "string",
          },
        },
        "type": "object",
      }
    `);
  });

  test("allOf in properties should be resolved", async () => {
    const {
      createApi,
      withSchema,

      factory: { schemaRef, mockSchema, mockXOmit, mockXPick },
    } = OpenapiBundledMock.create();

    const spec = createApi(
      withSchema("A", {
        properties: { a: { type: "object" }, aaa: { type: "string" } },
      }),
      withSchema("B", {
        properties: { a: { allOf: [schemaRef("A")], description: "test" }, b: { allOf: [schemaRef("A")], title: "ab" } },
      }),
    );

    const processor = createSpecProcessor();
    const actual = processor?.(spec);
    expect(accessor(actual!).getSchemaByName("B")).toMatchInlineSnapshot(`
      {
        "properties": {
          "a": {
            "description": "test",
            "properties": {
              "a": {
                "type": "object",
              },
              "aaa": {
                "type": "string",
              },
            },
            "type": "object",
          },
          "b": {
            "properties": {
              "a": {
                "type": "object",
              },
              "aaa": {
                "type": "string",
              },
            },
            "title": "ab",
            "type": "object",
          },
        },
        "type": "object",
      }
    `);
  });

  test("all schemas also in parameters are processed", async () => {
    const {
      createApi,
      withSchema,
      withRoute,
      factory: { schemaRef, mockSchema, mockXOmit, mockXPick },
    } = OpenapiBundledMock.create();

    const spec = createApi(
      withRoute({
        "/a": {
          get: {
            parameters: [{ in: "query", name: "param-1", schema: mockSchema({ type: "string" }) }],
            responses: { 200: { content: { "application/json": { schema: mockSchema({ properties: { bb: { type: "string" } } }) } } } },
            requestBody: { content: { "application/json": { schema: mockSchema({ properties: { a: { type: "string" } } }) } } },
          },
          post: {
            parameters: [{ in: "query", name: "param-2", schema: mockSchema({ type: "string" }) }],
            responses: { 200: { content: { "application/json": { schema: mockSchema({ properties: { cc: { type: "string" } } }) } } } },
            requestBody: { content: { "application/json": { schema: mockSchema({ properties: { dd: { type: "string" } } }) } } },
          },
        },
        "/f": {
          get: {
            parameters: [{ in: "query", name: "param-3", schema: mockSchema({ type: "string" }) }],
            responses: { 200: { content: { "application/json": { schema: mockSchema({ properties: { rr: { type: "string" } } }) } } } },
            requestBody: { content: { "application/json": { schema: mockSchema({ properties: { gg: { type: "string" } } }) } } },
          },
        },
        "/r": {
          get: {
            parameters: [{ in: "query", name: "param-3", schema: schemaRef("A") }],
            responses: { 200: { content: { "application/json": { schema: schemaRef("A") } } } },
            requestBody: { content: { "application/json": { schema: schemaRef("A") } } },
          },
        },
      }),
      withSchema("A", mockSchema({ properties: { fr: { type: "number" } } })),
    );

    const processor = createSpecProcessor();
    const actual = processor?.(spec);
    expect(actual).toMatchInlineSnapshot(`
      {
        "components": {
          "schemas": {
            "A": {
              "properties": {
                "fr": {
                  "type": "number",
                },
              },
              "type": "object",
            },
          },
        },
        "info": {
          "title": "",
          "version": "",
        },
        "openapi": "3.0.3",
        "paths": {
          "/a": {
            "get": {
              "parameters": [
                {
                  "in": "query",
                  "name": "param-1",
                  "schema": {
                    "type": "string",
                  },
                },
              ],
              "requestBody": {
                "content": {
                  "application/json": {
                    "schema": {
                      "properties": {
                        "a": {
                          "type": "string",
                        },
                      },
                      "type": "object",
                    },
                  },
                },
              },
              "responses": {
                "200": {
                  "content": {
                    "application/json": {
                      "schema": {
                        "properties": {
                          "bb": {
                            "type": "string",
                          },
                        },
                        "type": "object",
                      },
                    },
                  },
                },
              },
            },
            "post": {
              "parameters": [
                {
                  "in": "query",
                  "name": "param-2",
                  "schema": {
                    "type": "string",
                  },
                },
              ],
              "requestBody": {
                "content": {
                  "application/json": {
                    "schema": {
                      "properties": {
                        "dd": {
                          "type": "string",
                        },
                      },
                      "type": "object",
                    },
                  },
                },
              },
              "responses": {
                "200": {
                  "content": {
                    "application/json": {
                      "schema": {
                        "properties": {
                          "cc": {
                            "type": "string",
                          },
                        },
                        "type": "object",
                      },
                    },
                  },
                },
              },
            },
          },
          "/f": {
            "get": {
              "parameters": [
                {
                  "in": "query",
                  "name": "param-3",
                  "schema": {
                    "type": "string",
                  },
                },
              ],
              "requestBody": {
                "content": {
                  "application/json": {
                    "schema": {
                      "properties": {
                        "gg": {
                          "type": "string",
                        },
                      },
                      "type": "object",
                    },
                  },
                },
              },
              "responses": {
                "200": {
                  "content": {
                    "application/json": {
                      "schema": {
                        "properties": {
                          "rr": {
                            "type": "string",
                          },
                        },
                        "type": "object",
                      },
                    },
                  },
                },
              },
            },
          },
          "/r": {
            "get": {
              "parameters": [
                {
                  "in": "query",
                  "name": "param-3",
                  "schema": {
                    "$ref": "#/components/schemas/A",
                  },
                },
              ],
              "requestBody": {
                "content": {
                  "application/json": {
                    "schema": {
                      "$ref": "#/components/schemas/A",
                    },
                  },
                },
              },
              "responses": {
                "200": {
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/A",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }
    `);
  });
});
