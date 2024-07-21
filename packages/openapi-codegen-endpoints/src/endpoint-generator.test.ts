/* eslint-disable @typescript-eslint/no-unused-vars */
import { BundleMock, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { generateEndpointDefinitions, generateEndpointDefinitionsFromBundled } from "./endpoint-generator.js";
import { describe, expect, test } from "vitest";
import { resolveSpecPath } from "openapi-example-specs";

describe("generateEndpointDefinitions", () => {
  const { createApi, withSchemas, withRoute } = BundleMock.create();

  test("integration", async () => {
    const spec = resolveSpecPath("pets-modular-complex/petstore-api.yml");
    const endpoints = await generateEndpointDefinitions(spec, { outDir: "tmp/endpoints", apiName: "TestApi" });
    expect(endpoints.sources).toMatchSnapshot("pets-modular-complex/petstore-api.yml");
  });

  test("enspoints", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        ResponseSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        RequestSchema: {
          type: "object",
          properties: {
            help: { type: "string" },
          },
        },
        ErrorSchema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      }),
      withRoute({
        "/pets/{:petId}": {
          get: {
            operationId: "getPet",
            parameters: [{ in: "path", name: "petId", required: true, schema: { type: "string" } }],
            responses: {
              200: {
                content: { "application/json": { schema: { $ref: "#/components/schemas/ResponseSchema" } } },
              },
              201: {
                description: "success",
              },
              401: {
                content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorSchema" } } },
              },
            },
          },
          put: {
            operationId: "updatePet",
            parameters: [{ in: "query", name: "secret", required: true, schema: { type: "string" } }],
            requestBody: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RequestSchema" },
                },
              },
            },
            responses: {
              200: {
                content: { "application/json": { schema: { $ref: "#/components/schemas/ResponseSchema" } } },
              },
            },
          },
        },
        "/pets": {
          post: {
            operationId: "createPet",
            parameters: [
              { in: "cookie", name: "secret", required: true, schema: { type: "string" } },
              { in: "header", name: "other-secret", required: true, schema: { type: "string" } },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RequestSchema" },
                },
              },
            },
            responses: {
              200: {
                content: "application/json",
                schema: { $ref: "#/components/schemas/ResponseSchema" },
              },
            },
          },
        },
      })
    );

    const endpoints = await generateEndpointDefinitionsFromBundled(openapi, { outDir: "tmp/endpoints", apiName: "TestApi" });

    expect(endpoints.sources).toMatchSnapshot();
  });
});
