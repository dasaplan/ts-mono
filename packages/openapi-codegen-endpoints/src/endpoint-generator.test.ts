/* eslint-disable @typescript-eslint/no-unused-vars */
import { OpenApiBundled } from "@dasaplan/openapi-bundler";
import { oas30 } from "openapi3-ts";
import { generateEndpointDefinitions } from "./endpoint-generator.js";
import { describe, expect, test } from "vitest";

describe("generateEndpointDefinitions", () => {
  test("enspoints", async () => {
    const openapi: OpenApiBundled = createApi(
      (oa) =>
        withSchemas(oa, {
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
      (oa) =>
        withRoute(oa, {
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
      [
        {
          "name": "getPet",
          "operation": "get",
          "parameters": {
            "cookie": undefined,
            "header": undefined,
            "path": {
              "petId": {
                "type": "string",
              },
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
              "payload": {
                "$ref": "#/components/schemas/ErrorSchema",
              },
              "transform": undefined,
            },
          },
        },
        {
          "name": "updatePet",
          "operation": "put",
          "parameters": {
            "cookie": undefined,
            "header": undefined,
            "path": undefined,
            "query": {
              "secret": {
                "type": "string",
              },
            },
          },
          "path": "/pets/{:petId}",
          "request": {
            "format": "json",
            "payload": {
              "$ref": "#/components/schemas/RequestSchema",
            },
            "transform": undefined,
          },
          "response": {
            "200": {
              "format": "json",
              "payload": {
                "$ref": "#/components/schemas/ResponseSchema",
              },
              "transform": undefined,
            },
          },
        },
        {
          "name": "createPet",
          "operation": "post",
          "parameters": {
            "cookie": {
              "secret": {
                "type": "string",
              },
            },
            "header": {
              "other-secret": {
                "type": "string",
              },
            },
            "path": undefined,
            "query": undefined,
          },
          "path": "/pets",
          "request": {
            "format": "json",
            "payload": {
              "$ref": "#/components/schemas/RequestSchema",
            },
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
      ]
    `);
  });
});

function createApi(...mods: Array<(oa: OpenApiBundled) => OpenApiBundled>): OpenApiBundled {
  const api: OpenApiBundled = {
    openapi: "3.0.3",
    info: { version: "", title: "" },
    paths: {},
    components: {
      schemas: {},
    },
  };
  return mods.reduce((acc, curr) => curr(acc), api);
}

function withSchemas(oa: OpenApiBundled, schemas: NonNullable<oas30.ComponentsObject["schemas"]>): OpenApiBundled {
  return {
    ...oa,
    components: {
      ...oa.components,
      schemas: {
        ...(oa.components?.schemas ?? {}),
        ...schemas,
      },
    },
  };
}
function withRoute(oa: OpenApiBundled, routes: NonNullable<oas30.PathsObject>): OpenApiBundled {
  return {
    ...oa,
    paths: {
      ...oa.paths,
      ...routes,
    },
  };
}
