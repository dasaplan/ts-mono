/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import { bundleOpenapi } from "../bundle.js";
import { mergeAllOf } from "./processors/merge-all-of.js";
import { _, Folder } from "@dasaplan/ts-sdk";
import * as path from "node:path";
import jsonSchemaMergeAllOff from "json-schema-merge-allof";
import { ensureDiscriminatorValues } from "./processors/ensure-discriminator-values.js";
import { resolveSpecPath } from "openapi-example-specs";

describe("post process", () => {
  describe("spec", () => {
    describe("ensureDiscriminatorValues", () => {
      test.each([
        "pets-modular/pets-api.yml",
        "pets-simple/pets-api.yml",
        "pets-modular-complex/petstore-api.yml",
        "generic/api.yml",
      ])("%s", async (spec) => {
        const api = resolveSpecPath(spec);
        const { parsed } = await bundleOpenapi(api);
        const mergedAllOf = mergeAllOf(_.cloneDeep(parsed));
        const ensured = ensureDiscriminatorValues(_.cloneDeep(parsed));
        const ensuredMerged = mergeAllOf(
          ensureDiscriminatorValues(_.cloneDeep(ensured))
        );
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
