/* eslint-disable @typescript-eslint/no-unused-vars */
import { beforeAll, describe, expect, test } from "vitest";
import { mergeAllOf } from "./merge-all-of.js";
import { BundleMock } from "@dasaplan/openapi-bundler";

import { OpenapiApiDoc } from "./spec-accessor.js";
import { appLog } from "../../logger.js";
import { xPick } from "./x-pick.js";

describe("x-pick", () => {
  beforeAll(() => {
    appLog.setLogLevel("silly");
  });
  const {
    createApi,
    withSchema,
    factory: { schemaRef, mockXPick },
  } = BundleMock.create();

  test("pick", () => {
    const spec = createApi(
      withSchema("A", {
        required: ["a"],
        properties: { a: { type: "string" } },
      }),
      withSchema("B", {
        allOf: [
          { required: ["b", "bb"], properties: { b: { type: "string" }, bb: { type: "string" } } },
          mockXPick({
            required: ["bb"],
            properties: { bb: true },
          }),
        ],
      }),
      withSchema("AB", {
        allOf: [
          schemaRef("A"),
          schemaRef("B"),
          mockXPick({
            required: ["a"],
            properties: { b: true },
          }),
        ],
      })
    );

    const picked = xPick(mergeAllOf(spec));
    const omittedAccessor = OpenapiApiDoc.accessor(picked);
    const AB_afterPick = omittedAccessor.getSchemaByName("AB");
    expect(AB_afterPick["x-pick"]).toBeUndefined();
    expect(AB_afterPick.allOf).toBeUndefined();
    expect(AB_afterPick.required).toEqual(["a"]);
    expect(AB_afterPick.properties?.a).toBeUndefined();
    expect(AB_afterPick.properties?.b).toBeDefined();
    expect(picked).toMatchSnapshot();
  });

  test("nothing to pick", () => {
    const spec = createApi(
      withSchema("B", {
        allOf: [schemaRef("Pick"), { required: ["b", "bb"], properties: { b: { type: "string" }, bb: { type: "string" } } }],
      }),
      withSchema("Pick", {
        "x-pick": { required: ["c"], properties: { c: true } },
      })
    );

    const picked = xPick(mergeAllOf(spec));
    const accessor = OpenapiApiDoc.accessor(picked);
    const schema = accessor.getSchemaByName("B");

    expect(schema, "expected schema to be defined").toBeDefined();
    expect(schema.required, "expected 'required' not to be processed").toEqual([]);
    expect(schema.properties?.b, "expected property 'b' not to be processed").toBeUndefined();
    expect(schema.properties?.bb, "expected property 'bb' not to be processed").toBeUndefined();
    expect(schema.properties?.c, "expected property 'c' not to be processed").toBeUndefined();

    expect(schema["x-pick"], "expected x-pick toBeUndefined").toBeUndefined();
  });
});
