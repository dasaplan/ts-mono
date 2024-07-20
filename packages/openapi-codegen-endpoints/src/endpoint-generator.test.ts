/* eslint-disable @typescript-eslint/no-unused-vars */
import { BundleMock, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { generateEndpointDefinitions, generateEndpointDefinitionsInMemory } from "./endpoint-generator.js";
import { describe, expect, test } from "vitest";
import { resolveSpecPath } from "openapi-example-specs";

describe("generateEndpointDefinitions", () => {
  const { createApi, withSchemas, withRoute } = BundleMock.create();

  test("integration", async () => {
    const spec = resolveSpecPath("pets-modular-complex/petstore-api.yml");
    const endpoints = await generateEndpointDefinitionsInMemory(spec, { outDir: "tmp/endpoints" });
    expect(endpoints).toMatchSnapshot("pets-modular-complex/petstore-api.yml");
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

    const endpoints = await generateEndpointDefinitions(openapi);

    expect(endpoints).toMatchInlineSnapshot(`
      {
        "createPet": {
          "name": "createPet",
          "operation": "post",
          "parameters": {
            "cookie": {
              "secret": "string",
            },
            "header": {
              "other-secret": "string",
            },
            "path": undefined,
            "query": undefined,
          },
          "path": "/pets",
          "request": {
            "format": "json",
            "payload": "RequestSchema",
            "transform": undefined,
          },
          "response": {
            "200": {
              "format": undefined,
              "payload": undefined,
              "transform": undefined,
            },
          },
        },
        "getPet": {
          "name": "getPet",
          "operation": "get",
          "parameters": {
            "cookie": undefined,
            "header": undefined,
            "path": {
              "petId": "string",
            },
            "query": undefined,
          },
          "path": "/pets/{:petId}",
          "request": {
            "format": undefined,
            "payload": undefined,
            "transform": undefined,
          },
          "response": {
            "401": {
              "format": "json",
              "payload": "ErrorSchema",
              "transform": undefined,
            },
          },
        },
        "updatePet": {
          "name": "updatePet",
          "operation": "put",
          "parameters": {
            "cookie": undefined,
            "header": undefined,
            "path": undefined,
            "query": {
              "secret": "string",
            },
          },
          "path": "/pets/{:petId}",
          "request": {
            "format": "json",
            "payload": "RequestSchema",
            "transform": undefined,
          },
          "response": {
            "200": {
              "format": "json",
              "payload": "ResponseSchema",
              "transform": undefined,
            },
          },
        },
      }
    `);
  });
});
