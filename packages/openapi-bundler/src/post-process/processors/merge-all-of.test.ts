import { describe, expect, test } from "vitest";
import { BundleMock } from "../../bundle-mock.js";
import { mergeAllOf } from "./merge-all-of.js";

describe("mergeAllOf", () => {
  const {
    createApi,
    withObjectSchema,
    withSchema,
    factory: { schemaRef },
  } = BundleMock.create();

  test("merges required - allOf ", () => {
    const spec = createApi(
      withObjectSchema("A", {
        required: ["a"],
        properties: { a: { type: "string" } },
      }),
      withObjectSchema("B", {
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
      withObjectSchema("Base", {
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
              "type": "object",
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
});
