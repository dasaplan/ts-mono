import { describe, expect, test } from "vitest";
import { resolveSpecPath } from "openapi-example-specs";
import { generateRtkQuery } from "./rtk-query.js";
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

  test("works rt", async () => {
    const spec = resolveSpecPath("pets-modular-complex/petstore-api.yml");
    const { outFile } = await bundleOpenapi(spec, { mergeAllOf: true, ensureDiscriminatorValues: true });
    const api = await generateRtkQuery(outFile, { apiName: "Petstore" });
    expect(api).toMatchInlineSnapshot(`
      "// Or from '@reduxjs/toolkit/query' if not using the auto-generated hooks
      import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

      // initialize an empty api service that we'll inject endpoints into later as needed
      export const api = createApi({
        baseQuery: fetchBaseQuery({ baseUrl: '/' }),
        endpoints: () => ({}),
      })
        
        
      const injectedRtkApi = api.injectEndpoints({
          endpoints: build => ({
              listPets: build.query<ListPetsApiResponse, ListPetsApiArg>({
                  query: queryArg => ({ url: \`/pets\` })
              }),
              createPets: build.mutation<CreatePetsApiResponse, CreatePetsApiArg>({
                  query: queryArg => ({ url: \`/pets\`, method: "POST", body: queryArg.pet })
              }),
              showPetById: build.query<ShowPetByIdApiResponse, ShowPetByIdApiArg>({
                  query: queryArg => ({ url: \`/pets/\${queryArg.petId}\` })
              }),
              patchPet: build.mutation<PatchPetApiResponse, PatchPetApiArg>({
                  query: queryArg => ({ url: \`/pets/\${queryArg.petId}\`, method: "PATCH", body: queryArg.pet })
              })
          }),
          overrideExisting: false
      });
      export { injectedRtkApi as enhancedApi };
      export type ListPetsApiResponse = /** status 200 A paged array of pets */ Pets;
      export type ListPetsApiArg = {
          /** The id of the pet to retrieve */
          petId: string;
      };
      export type CreatePetsApiResponse = /** status 201 Null response */ void;
      export type CreatePetsApiArg = {
          pet: Pet;
      };
      export type ShowPetByIdApiResponse = /** status 200 Expected response to a valid request */ Pet;
      export type ShowPetByIdApiArg = {
          /** The id of the pet to retrieve */
          petId: string;
      };
      export type PatchPetApiResponse = /** status 200 Expected response to a valid request */ Pet;
      export type PatchPetApiArg = {
          /** The id of the pet to retrieve */
          petId: string;
          pet: Pet;
      };
      export type SchemaUntitled = {
          untitledProp?: string;
      };
      export type Color = {
          colorId?: string;
          untitled?: SchemaUntitled;
          untitledProp?: string;
      };
      export type TargetGroup = string;
      export type FluffLevel = "A" | "B" | "C";
      export type Ball = {
          id: string;
          price: string;
          kind: string;
          fluffLevel?: FluffLevel;
          targetGroup?: string;
      };
      export type Teddy = {
          fluffLevel?: FluffLevel;
          id: string;
          price: string;
          kind: string;
          targetGroup?: string;
      };
      export type PetToy = ({
          kind: "BALL";
      } & Ball) | ({
          kind: "TEDDY";
      } & Teddy);
      export type Toy = {
          name?: string;
          color?: Color;
          targetGroup?: TargetGroup;
          relates?: PetToy;
          subId?: string;
          id: string;
          price: string;
          kind: string;
          someEnum?: "FOO" | "BAR";
          fluffLevel?: FluffLevel;
      };
      export type Toy2 = {
          id: string;
          price: string;
          kind: string;
          someEnum?: "FOO" | "BAR";
          fluffLevel?: FluffLevel;
          targetGroup?: string;
      };
      export type Pet = {
          id: number;
          toy?: Toy;
          leastFavToy?: Toy2;
          favFluffLevel?: FluffLevel;
          tag?: string;
          name: string;
      };
      export type Pets = Pet[];
      export type HttpErrorCode = number;
      export type TitledSchema = {
          titledProp?: string;
      };
      export type Error = {
          code: HttpErrorCode;
          message: string;
          titledSchema?: TitledSchema;
      };"
    `);
  });
});
