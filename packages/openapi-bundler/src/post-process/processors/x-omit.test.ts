/* eslint-disable @typescript-eslint/no-unused-vars */
import { beforeAll, describe, expect, test } from "vitest";
import { mergeAllOf } from "./merge-all-of.js";
import { OpenapiBundledMock } from "@dasaplan/openapi-bundler";

import { OpenapiApiDoc } from "./spec-accessor.js";
import { xOmitDeep } from "./x-omit-deep.js";
import { appLog } from "../../logger.js";

describe("x-omit", () => {
  beforeAll(() => {
    appLog.setLogLevel("silly");
  });
  const {
    createApi,
    withSchema,
    factory: { schemaRef, mockXOmit },
  } = OpenapiBundledMock.create();

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
      }),
    );

    const merged = mergeAllOf(spec);
    const accessor = OpenapiApiDoc.accessor(merged);
    expect(accessor.getSchemaByName("A"), "expected schema 'A' to be defined").toBeDefined();
    expect(accessor.getSchemaByName("B"), "expected schema 'b' to be defined").toBeDefined();

    const AB_afterMerge = accessor.getSchemaByName("AB");
    expect(AB_afterMerge.required, "expected 'required' not to be processed").toEqual(["a", "b", "bb"]);
    expect(AB_afterMerge["x-omit"], "expected x-omit to be defined").toBeDefined();
    expect(AB_afterMerge.properties?.a, "expected property 'a' not to be processed").toBeDefined();
    expect(AB_afterMerge.properties?.a, "expected property 'b' not to be processed").toBeDefined();

    // x-omit
    const omitted = xOmitDeep(spec);
    const omittedAccessor = OpenapiApiDoc.accessor(omitted);
    const AB_afterOmit = omittedAccessor.getSchemaByName("AB");
    expect(AB_afterOmit["x-omit"]).toBeUndefined();
    expect(AB_afterOmit.allOf).toBeUndefined();
    expect(AB_afterOmit.required).toEqual(["b"]);
    expect(AB_afterOmit.properties?.a).toBeDefined();
    expect(AB_afterOmit.properties?.b).toBeUndefined();
    expect(merged).toMatchSnapshot();
  });

  test("omits deep", () => {
    const spec = createApi(
      withSchema("A", {
        required: ["a"],
        properties: { a: { type: "string" } },
      }),
      withSchema("B", {
        required: ["b", "bb"],
        properties: { b: { type: "string" }, bb: { type: "string" }, entity: schemaRef("A") },
      }),
      withSchema("AB", {
        allOf: [
          schemaRef("B"),
          mockXOmit({
            required: ["a"],
            properties: { entity: { properties: { a: true } } },
          }),
        ],
      }),
    );

    // x-omit
    const omitted = xOmitDeep(mergeAllOf(spec));
    const omittedAccessor = OpenapiApiDoc.accessor(omitted);
    const AB_afterOmit = omittedAccessor.getSchemaByName("AB");
    expect(AB_afterOmit["x-omit"]).toBeUndefined();
  });

  test("nothing to omit", () => {
    const spec = createApi(
      withSchema("B", {
        allOf: [schemaRef("Omit"), { required: ["b", "bb"], properties: { b: { type: "string" }, bb: { type: "string" } } }],
      }),
      withSchema("Omit", {
        "x-omit": { required: ["c"], properties: { c: true } },
      }),
    );

    const omitted = xOmitDeep(mergeAllOf(spec));
    const accessor = OpenapiApiDoc.accessor(omitted);
    const schema = accessor.getSchemaByName("B");

    expect(schema, "expected schema to be defined").toBeDefined();
    expect(schema.required, "expected 'required' not to be processed").toEqual(["b", "bb"]);
    expect(schema.properties?.b, "expected property 'b' not to be processed").toBeDefined();
    expect(schema.properties?.bb, "expected property 'bb' not to be processed").toBeDefined();

    expect(schema["x-omit"], "expected x-omit toBeUndefined").toBeUndefined();
  });
});
