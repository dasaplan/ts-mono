import { describe, expect, test } from "vitest";
import { BundleMock } from "../../bundle-mock.js";
import { mergeAllOf } from "./merge-all-of.js";
import { OpenapiApiDoc } from "./spec-accessor.js";

describe("mergeAllOf", () => {
  const {
    createApi,
    withSchema,
    factory: { schemaRef, mockSchema },
  } = BundleMock.create();

  test("merges required - allOf ", () => {
    const spec = createApi(
      withSchema("A", {
        required: ["a"],
        properties: { a: { type: "string" } },
      }),
      withSchema("B", {
        required: ["b"],
        properties: { b: { type: "string" } },
      }),
      withSchema("AB", {
        allOf: [schemaRef("A"), schemaRef("B")],
      })
    );
    expect(mergeAllOf(spec)).toMatchInlineSnapshot(`
      {
        "components": {
          "schemas": {
            "A": {
              "properties": {
                "a": {
                  "type": "string",
                },
              },
              "required": [
                "a",
              ],
              "type": "object",
            },
            "AB": {
              "properties": {
                "a": {
                  "type": "string",
                },
                "b": {
                  "type": "string",
                },
              },
              "required": [
                "a",
                "b",
              ],
              "type": "object",
            },
            "B": {
              "properties": {
                "b": {
                  "type": "string",
                },
              },
              "required": [
                "b",
              ],
              "type": "object",
            },
          },
        },
        "info": {
          "title": "",
          "version": "",
        },
        "openapi": "3.0.3",
        "paths": {},
      }
    `);
  });

  test("merges required - oneOf + allOf ", () => {
    const spec = createApi(
      withSchema("Base", {
        required: ["common"],
        properties: { a: { type: "string" }, common: { type: "string" } },
      }),
      withSchema("A", {
        allOf: [
          schemaRef("Base"),
          {
            required: ["a"],
            properties: { a: { type: "string" } },
          },
        ],
      }),
      withSchema("B", {
        allOf: [
          schemaRef("Base"),
          {
            required: ["b"],
            properties: { b: { type: "string" } },
          },
        ],
      }),
      withSchema("AB", {
        oneOf: [schemaRef("A"), schemaRef("B")],
      })
    );

    expect(mergeAllOf(spec)).toMatchInlineSnapshot(`
      {
        "components": {
          "schemas": {
            "A": {
              "properties": {
                "a": {
                  "type": "string",
                },
                "common": {
                  "type": "string",
                },
              },
              "required": [
                "a",
                "common",
              ],
              "type": "object",
            },
            "AB": {
              "oneOf": [
                {
                  "$ref": "#/components/schemas/A",
                },
                {
                  "$ref": "#/components/schemas/B",
                },
              ],
            },
            "B": {
              "properties": {
                "a": {
                  "type": "string",
                },
                "b": {
                  "type": "string",
                },
                "common": {
                  "type": "string",
                },
              },
              "required": [
                "b",
                "common",
              ],
              "type": "object",
            },
            "Base": {
              "properties": {
                "a": {
                  "type": "string",
                },
                "common": {
                  "type": "string",
                },
              },
              "required": [
                "common",
              ],
              "type": "object",
            },
          },
        },
        "info": {
          "title": "",
          "version": "",
        },
        "openapi": "3.0.3",
        "paths": {},
      }
    `);
  });

  test.skip("merges required - multiple inheritance", () => {
    /**
     * When we have multiple inheritance, we may try to infer a common parent.
     * Or we fall back to merge everything
     * */
    const spec = createApi(
      withSchema("Base", {
        required: ["type"],
        properties: { type: { type: "string" } },
        discriminator: { propertyName: "type" },
      }),
      withSchema("A", {
        allOf: [schemaRef("Base")],
        required: ["a"],
        properties: { a: { type: "string" } },
      }),
      withSchema("B", {
        allOf: [schemaRef("Base")],
        required: ["b"],
        properties: { b: { type: "string" } },
      }),
      withSchema("AB", {
        allOf: [schemaRef("A"), schemaRef("B"), mockSchema({ properties: { c: { type: "string" } } })],
      })
    );
    const actual = mergeAllOf(spec);
    const accessor = OpenapiApiDoc.accessor(actual);
    expect(accessor.schemas.length, "expected known number of schemas").toBe(2);
    expect(accessor.getSchemaByName("Base"), "expected schema 'Base' to be defined").toBeDefined();
    expect(accessor.getSchemaByName("A"), "expected schema 'A' to be defined").toBeDefined();
  });
});
