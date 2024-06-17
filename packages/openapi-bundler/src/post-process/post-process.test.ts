/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import { bundleOpenapi } from "../bundle.js";
import { mergeAllOf } from "./spec/merge-all-of.js";
import { _, Folder } from "@dasaplan/ts-sdk";
import * as path from "node:path";
import jsonSchemaMergeAllOff from "json-schema-merge-allof";
import { ensureDiscriminatorValues } from "./spec/ensure-discriminator-values.js";
import { resolveSpecPath } from "openapi-example-specs";

describe("post process", () => {
  describe("spec", () => {
    describe("ensureDiscriminatorValues", () => {
      test.each([
        resolveSpecPath("pets-modular/pets-api.yml"),
        resolveSpecPath("pets-simple/pets-api.yml"),
        resolveSpecPath("pets-modular-complex/petstore-api.yml"),
        resolveSpecPath("generic/api.yml"),
      ])("%s", async (api) => {
        const { parsed } = await bundleOpenapi(api);
        const mergedAllOf = mergeAllOf(_.cloneDeep(parsed));
        const ensured = ensureDiscriminatorValues(_.cloneDeep(parsed));
        const ensuredMerged = mergeAllOf(
          ensureDiscriminatorValues(_.cloneDeep(ensured))
        );
        Folder.resolve(`test/out`, api).writeYml(
          `bundled-${path.basename(api)}`,
          parsed
        );
        Folder.resolve(`test/out`, api).writeYml(
          `merged-${path.basename(api)}`,
          mergedAllOf
        );
        Folder.resolve(`test/out`, api).writeYml(
          `ensured-${path.basename(api)}`,
          ensured
        );
        Folder.resolve(`test/out`, api).writeYml(
          `ens-mrg-${path.basename(api)}`,
          ensuredMerged
        );
        expect(parsed).toMatchSnapshot(`ensured-${api}`);
        expect(mergedAllOf).toMatchSnapshot(`merged-${api}`);
        expect(ensured).toMatchSnapshot(`bndl-${api}`);
        expect(ensuredMerged).toMatchSnapshot(`ensured-merged-${api}`);
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
              title: ([a, b]: [a: string | undefined, b: string | undefined]) =>
                b ?? a!,
            },
          }
        )
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
});
