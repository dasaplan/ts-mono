import { describe, expect, test } from "vitest";
import { OpenapiBundledMock } from "../../bundled-mock.js";
import { mergeAllOf } from "./merge-all-of.js";
import { OpenapiApiDoc } from "./spec-accessor.js";

describe("mergeAllOf", () => {
  const {
    createApi,
    withSchema,
    factory: { schemaRef, mockSchema },
  } = OpenapiBundledMock.create();

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
      }),
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
      }),
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

  test("merges required - multiple inheritance 1", () => {
    /**
     * When we have multiple inheritance, we may try to infer a common parent.
     * Or we fall back to merge everything
     * */
    const spec = createApi(
      withSchema("BaseBase", {
        required: ["id"],
        properties: { id: { type: "string" } },
      }),
      withSchema("Base", {
        allOf: [
          schemaRef("BaseBase"),
          {
            required: ["type"],
            properties: { type: { type: "string" } },
            discriminator: { propertyName: "type" },
          },
        ],
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
      }),
    );
    const actual = mergeAllOf(spec);
    const accessor = OpenapiApiDoc.accessor(actual);
    expect(accessor.getSchemaByName("Base"), "expected schema 'Base' to be defined").toMatchInlineSnapshot(`
      {
        "discriminator": {
          "propertyName": "type",
        },
        "properties": {
          "id": {
            "type": "string",
          },
          "type": {
            "type": "string",
          },
        },
        "required": [
          "id",
          "type",
        ],
        "type": "object",
      }
    `);
  });

  test("merges required - multiple inheritance 1", () => {
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
      }),
    );
    const actual = mergeAllOf(spec);
    const accessor = OpenapiApiDoc.accessor(actual);
    expect(accessor.getSchemaByName("Base"), "expected schema 'Base' to be defined").toMatchInlineSnapshot(`
      {
        "discriminator": {
          "propertyName": "type",
        },
        "properties": {
          "type": {
            "type": "string",
          },
        },
        "required": [
          "type",
        ],
        "type": "object",
      }
    `);
  });

  test("merges required - multiple inheritance", () => {
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
      }),
    );
    const actual = mergeAllOf(spec);
    const accessor = OpenapiApiDoc.accessor(actual);
    expect(accessor.schemas.length, "expected known number of schemas").toBe(4);
    expect(accessor.getSchemaByName("Base"), "expected schema 'Base' to be defined").toBeDefined();
    expect(accessor.getSchemaByName("A"), "expected schema 'A' to be defined").toBeDefined();
    expect(accessor.getSchemaByName("B"), "expected schema 'A' to be defined").toBeDefined();
    expect(accessor.getSchemaByName("AB"), "expected schema 'A' to be defined").toBeDefined();
    expect(actual).toMatchInlineSnapshot(`
      {
        "components": {
          "schemas": {
            "A": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/Base",
                },
                {
                  "properties": {
                    "a": {
                      "type": "string",
                    },
                  },
                  "required": [
                    "a",
                  ],
                },
              ],
            },
            "AB": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/Base",
                },
                {
                  "properties": {
                    "a": {
                      "type": "string",
                    },
                    "b": {
                      "type": "string",
                    },
                    "c": {
                      "type": "string",
                    },
                  },
                  "required": [
                    "a",
                    "b",
                  ],
                  "type": "object",
                },
              ],
            },
            "B": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/Base",
                },
                {
                  "properties": {
                    "b": {
                      "type": "string",
                    },
                  },
                  "required": [
                    "b",
                  ],
                },
              ],
            },
            "Base": {
              "discriminator": {
                "propertyName": "type",
              },
              "properties": {
                "type": {
                  "type": "string",
                },
              },
              "required": [
                "type",
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

  test("merges required - multiple inheritance using forceMerge", () => {
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
      }),
    );
    const actual = mergeAllOf(spec, { forceMerge: true });
    const accessor = OpenapiApiDoc.accessor(actual);
    expect(accessor.schemas.length, "expected known number of schemas").toBe(4);
    expect(accessor.getSchemaByName("Base"), "expected schema 'Base' to be defined").toBeDefined();
    expect(accessor.getSchemaByName("A"), "expected schema 'A' to be defined").toBeDefined();
    expect(accessor.getSchemaByName("B"), "expected schema 'A' to be defined").toBeDefined();
    expect(accessor.getSchemaByName("AB"), "expected schema 'A' to be defined").toBeDefined();
    expect(actual).toMatchInlineSnapshot(`
      {
        "components": {
          "schemas": {
            "A": {
              "discriminator": {
                "propertyName": "type",
              },
              "properties": {
                "a": {
                  "type": "string",
                },
                "type": {
                  "type": "string",
                },
              },
              "required": [
                "a",
                "type",
              ],
              "type": "object",
            },
            "AB": {
              "discriminator": {
                "propertyName": "type",
              },
              "properties": {
                "a": {
                  "type": "string",
                },
                "b": {
                  "type": "string",
                },
                "c": {
                  "type": "string",
                },
                "type": {
                  "type": "string",
                },
              },
              "required": [
                "a",
                "b",
                "type",
              ],
              "type": "object",
            },
            "B": {
              "discriminator": {
                "propertyName": "type",
              },
              "properties": {
                "b": {
                  "type": "string",
                },
                "type": {
                  "type": "string",
                },
              },
              "required": [
                "b",
                "type",
              ],
              "type": "object",
            },
            "Base": {
              "discriminator": {
                "propertyName": "type",
              },
              "properties": {
                "type": {
                  "type": "string",
                },
              },
              "required": [
                "type",
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
