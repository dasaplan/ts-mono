import { describe, test, expect } from "vitest";
import { findCommonPath, formatOpenapi } from "./format.js";
import jsyml from "js-yaml";
import { OpenapiBundledMock } from "@dasaplan/openapi-bundler";

describe("format", () => {
  test("sort spec", async () => {
    const {
      createApi,
      withSchemas,
      withRoute,
      factory: { mockSchema },
    } = OpenapiBundledMock.create();

    const api = createApi(
      withRoute({
        "/d": {},
        "/b": {},
        "/a": {},
      }),
      withSchemas({
        C: mockSchema({ allOf: [{ $ref: "#/A" }, mockSchema({ properties: { d: { type: "string" } } })] }),
        B: mockSchema({ properties: { b: mockSchema({ type: "string" }) } }),
        A: mockSchema({ properties: { ab: mockSchema({ type: "number" }), aa: mockSchema({ type: "string" }) } }),
      }),
    );

    const fmt = await formatOpenapi(api as never, {
      deleteExamples: false,
      fixDescription: false,
      fixTitles: false,
      fixDanglingAllOfProps: false,
      sortSpec: true,
    });
    expect(JSON.stringify(fmt[0], undefined, 2)).toMatchInlineSnapshot(
      `
      "{
        "openapi": "3.0.3",
        "info": {
          "title": "",
          "version": ""
        },
        "paths": {
          "/a": {},
          "/b": {},
          "/d": {}
        },
        "components": {
          "schemas": {
            "A": {
              "type": "object",
              "properties": {
                "aa": {
                  "type": "string"
                },
                "ab": {
                  "type": "number"
                }
              }
            },
            "B": {
              "type": "object",
              "properties": {
                "b": {
                  "type": "string"
                }
              }
            },
            "C": {
              "allOf": [
                {
                  "$ref": "#/A"
                },
                {
                  "type": "object",
                  "properties": {
                    "d": {
                      "type": "string"
                    }
                  }
                }
              ]
            }
          }
        }
      }"
    `,
    );
  });

  test("deleteExamples", async () => {
    const {
      createApi,
      withSchemas,
      factory: { mockSchema },
    } = OpenapiBundledMock.create();

    const api = createApi(
      withSchemas({
        A: mockSchema({ example: "test" }),
        B: mockSchema({ example: "b", properties: { a: mockSchema({ example: "aa", type: "string" }) } }),
        C: mockSchema({ allOf: [{ $ref: "#/A" }, mockSchema({ example: "ca" }), mockSchema({ example: "cb" })] }),
      }),
    );

    const fmt = await formatOpenapi(api as never, {
      deleteExamples: true,
      fixDescription: false,
      fixTitles: false,
      fixDanglingAllOfProps: false,
      sortSpec: false,
    });
    expect(fmt).toMatchInlineSnapshot(`
      [
        {
          "components": {
            "schemas": {
              "A": {
                "type": "object",
              },
              "B": {
                "properties": {
                  "a": {
                    "type": "string",
                  },
                },
                "type": "object",
              },
              "C": {
                "allOf": [
                  {
                    "$ref": "#/A",
                  },
                  {
                    "type": "object",
                  },
                  {
                    "type": "object",
                  },
                ],
              },
            },
          },
          "info": {
            "title": "",
            "version": "",
          },
          "openapi": "3.0.3",
          "paths": {},
        },
      ]
    `);
  });

  test("enforce quotes on refs with custom schema", async () => {
    const a = {
      openapi: "1",
      paths: {
        "/a": {
          content: {
            $ref: "#/components/schemas/A",
          },
        },
      },
      components: {
        schemas: {
          A: { properties: { a: { type: "string" }, b: { $ref: "#/Test" } } },
        },
        Test: { properties: { c: { $ref: "./file.yml#/Test" } } },
      },
    };

    // Custom type to ensure that all $ref values are quoted
    const RefType = new jsyml.Type("!ref", {
      kind: "scalar",
      resolve: (d: unknown) => {
        return typeof d === "string" && d.includes("#");
      },
      construct: (data: unknown) => data, // Just return the string value
      represent: (data: unknown) => `"${data}"`, // Force double quotes
    });
    const customSchema = jsyml.DEFAULT_SCHEMA.extend({ implicit: [RefType] });

    function transformRefs(obj: object): unknown {
      if (Array.isArray(obj)) {
        return obj.map(transformRefs);
      } else if (obj !== null && typeof obj === "object") {
        return Object.fromEntries(
          Object.entries(obj).map(([key, value]) => {
            if (key === "$ref" && typeof value === "string") {
              return [key, value]; // Apply the custom type
            }
            return [key, transformRefs(value)];
          }),
        );
      }
      return obj;
    }

    const fmt = jsyml.dump(transformRefs(a), {
      schema: customSchema,
    });
    expect(fmt).toMatchInlineSnapshot(`
      "openapi: '1'
      paths:
        /a:
          content:
            $ref: '#/components/schemas/A'
      components:
        schemas:
          A:
            properties:
              a:
                type: string
              b:
                $ref: '#/Test'
        Test:
          properties:
            c:
              $ref: './file.yml#/Test'
      "
    `);
  });

  test("findCommonPath", () => {
    const files = [
      "/home/runner/work/ts-mono/ts-mono/packages/openapi-specs/specs/pets-modular-complex/petstore-api.yml",
      "/home/runner/work/ts-mono/ts-mono/packages/openapi-specs/specs/pets-modular-complex/routes/pets.yml",
      "/home/runner/work/ts-mono/ts-mono/packages/openapi-specs/specs/pets-modular-complex/routes/pet.yml",
    ];

    const common = findCommonPath(files);

    expect(common).toEqual("/home/runner/work/ts-mono/ts-mono/packages/openapi-specs/specs/pets-modular-complex");
  });
});
