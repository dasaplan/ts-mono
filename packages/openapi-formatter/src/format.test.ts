import {resolveSpecPath} from "openapi-example-specs";
import {describe, test, expect} from "vitest";
import {File, Folder} from "@dasaplan/ts-sdk";
import {formatSpec} from "./format.js";
import jsyml from "js-yaml"

describe("format", () => {
  test("spec", async () => {
    const specPath = resolveSpecPath("pets-modular-complex/petstore-api.yml");
    const file = File.of(specPath);
    const fmt = await formatSpec(file, {outFolder: Folder.of("tmp")});
    expect(fmt).toBeDefined();
  });

  test("enforce quotes on refs with custom schema", async () => {
    const a =
      {
        openapi: "1",
        paths: {
          "/a": {
            content: {
              $ref: "#/components/schemas/A"
            }
          }
        },
        components: {
          schemas: {
            "A": {properties: {a: {type: "string"}, b: {$ref: "#/Test"}}}
          },
          "Test": {properties: {c: {$ref: "./file.yml#/Test"}}}
        }
      };

// Custom type to ensure that all $ref values are quoted
    const RefType = new jsyml.Type("!ref", {
      kind: "scalar",
      resolve: (d:unknown) => {
        return typeof d === "string" && d.includes("#");
      },
      construct: (data:unknown) => data, // Just return the string value
      represent: (data:unknown) => `"${data}"`, // Force double quotes
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
          })
        );
      }
      return obj;
    }

    const fmt = jsyml.dump(transformRefs(a), {
      schema: customSchema
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
  })

  test("bundled", async () => {
    const file = File.of("tmp/bundled-petstore-api.yml");
    const fmt = await formatSpec(file, {outFolder: Folder.of("tmp2")});
    expect(fmt).toBeDefined();
  });
});
