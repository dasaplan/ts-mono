/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, test } from "vitest";
import { mergeAllOf } from "./merge-all-of.js";
import { BundleMock } from "@dasaplan/openapi-bundler";

import { OpenapiApiDoc } from "./spec-accessor.js";

describe("x-omit", () => {
  const {
    createApi,
    withSchema,
    factory: { schemaRef, mockXOmit },
  } = BundleMock.create();

  test("omits", () => {
    const spec = createApi(
      withSchema("A", {
        required: ["a"],
        properties: { a: { type: "string" } },
      }),
      withSchema("B", {
        allOf: [
          { required: ["b", "bb"], properties: { b: { type: "string" }, bb: { type: "string" } } },
          mockXOmit({
            required: ["bb"],
            properties: { bb: true },
          }),
        ],
      }),
      withSchema("AB", {
        allOf: [
          schemaRef("A"),
          schemaRef("B"),
          mockXOmit({
            required: ["a"],
            properties: { b: true },
          }),
        ],
      })
    );

    const merged = mergeAllOf(spec);
    expect(merged).toMatchSnapshot();
    const accessor = OpenapiApiDoc.accessor(merged);
    expect(accessor.getSchemaByName("A"), "expected schema 'A' to be defined").toBeDefined();
    expect(accessor.getSchemaByName("B"), "expected schema 'b' to be defined").toBeDefined();

    const AB_afterMerge = accessor.getSchemaByName("AB");
    expect(AB_afterMerge.required, "expected 'required' not to be processed").toEqual(["a", "b", "bb"]);
    expect(AB_afterMerge["x-omit"], "expected x-omit to be defined").toBeDefined();
    expect(AB_afterMerge.properties?.a, "expected property 'a' not to be processed").toBeDefined();
    expect(AB_afterMerge.properties?.a, "expected property 'b' not to be processed").toBeDefined();

    // x-omit
    // todo
    // expect(AbfterMerge["x-omit"]).toBeUndefined();
    // expect(AbfterMerge.allOf).toBeUndefined();
    // expect(AbfterMerge.required).toEqual(["b"]);
    // expect(AbfterMerge.properties?.a).toBeDefined();
    // expect(AbfterMerge.properties?.b).toBeUndefined();
    // expect(merged).toMatchSnapshot();
  });
});
