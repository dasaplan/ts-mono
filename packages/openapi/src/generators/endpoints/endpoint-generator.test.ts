/* eslint-disable @typescript-eslint/no-unused-vars */
import { BundleMock, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { oas30 } from "openapi3-ts";
import { generateEndpointDefinitions } from "./endpoint-generator.js";
import { describe, expect, test } from "vitest";

describe("generateEndpointDefinitions", () => {
  const { withSchemas, createApi, withRoute } = BundleMock.create();

  test("circular schema", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        ResponseSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
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
                content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" } } } } },
              },
            },
          },
          put: {
            operationId: "updatePet",
            parameters: [{ in: "query", name: "secret", required: true, schema: { type: "string" } }],
            requestBody: {
              content: {
                "application/json": {
                  schema: { type: "object", properties: { help: { type: "string" } } },
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
                  schema: { type: "object", properties: { help: { type: "string" } } },
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

    const endpoints = await generateEndpointDefinitions(openapi, `test/out/zod/circular.ts`);

    expect(endpoints).toMatchInlineSnapshot(`
      [
        "
          
          ",
        "
          
          ",
        "
          
          ",
      ]
    `);
  });
});
