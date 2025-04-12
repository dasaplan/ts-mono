import { describe, expect, test } from "vitest";
import { resolveSpecPath } from "openapi-example-specs";
import { bundleOpenapi, Transpiler } from "@dasaplan/openapi-bundler";
import { generateRtkQueryDspText } from "./rtk-query-dsp.js";

describe("rtk-query", () => {
  test("works", async () => {
    const spec = resolveSpecPath("pets-modular-complex/petstore-api.yml");
    const { parsed } = await bundleOpenapi(spec, { mergeAllOf: true, ensureDiscriminatorValues: true });
    const api = await generateRtkQueryDspText(Transpiler.of(parsed).endpoints(), {
      tsApiTypesModule: { kind: "NAMESPACE_WITHOUT_IMPORT", namespace: "Api" },
    });
    expect(api).toMatchInlineSnapshot(`
      "// Or from '@reduxjs/toolkit/query' if not using the auto-generated hooks
      import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

      // initialize an empty api service that we'll inject endpoints into later as needed
      export const api = createApi({
        baseQuery: fetchBaseQuery({ baseUrl: '/' }),
        endpoints: () => ({}),
      })
        
        
        export const injectedRtkApi = api.injectEndpoints({
            endpoints: (build) => ({
                  listPets: build.query<Api.Pet[], {"petId": string,"body": undefined}>({
            query: queryArg =>  ({ url: \`/pets\` })
          }),
      createPets: build.mutation<undefined, {"body": Api.Pet}>({
            query: queryArg =>  ({ url:  \`/pets\` , method: "POST" ,  body: queryArg?.body})
          }),
      showPetById: build.query<Api.Pet, {"petId": string,"body": undefined}>({
            query: queryArg =>  ({ url: \`/pets/\${queryArg["petId"]}\` })
          }),
      patchPet: build.mutation<Api.Pet, {"petId": string,"body": Api.Pet}>({
            query: queryArg =>  ({ url:  \`/pets/\${queryArg["petId"]}\` , method: "PATCH" , body: queryArg?.body})
          })
              }),
          overrideExisting: false,
        });"
    `);
  });
});
