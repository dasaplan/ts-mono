/* eslint-disable @typescript-eslint/no-unused-vars */
import { BundleMock, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { generateEndpointDefinitions } from "./endpoint-generator.js";
import { describe, expect, test } from "vitest";
import { generateEndpointInterfacesAsText } from "./endpoint-interfaces.js";

describe("generateEndpointDefinitions", () => {
  const { createApi, withSchemas, withRoute } = BundleMock.create();

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

    const endpoints = await generateEndpointInterfacesAsText(openapi, { apiName: "TestApi" });

    expect(endpoints).toMatchInlineSnapshot(`
      "export module TestApi {
                      export type Path = "/pets/{:petId}" | "/pets"
                      export interface OperationToPath {
                          getPet: "/pets/{:petId}";
      updatePet: "/pets/{:petId}";
      createPet: "/pets";
                      }
                      export interface GetPet<ErrorSchema extends EndpointDefinition.DtoTypes> extends EndpointDefinition<
                      {"401": ErrorSchema},
                      undefined,
                      {"path": {"petId": string},"query": undefined,"header": undefined,"cookie": undefined}
                  > {
              name: "getPet";
              operation: "get";
              path: "/pets/{:petId}"
          }
          
      export interface UpdatePet<ResponseSchema extends EndpointDefinition.DtoTypes, RequestSchema extends EndpointDefinition.DtoTypes> extends EndpointDefinition<
                      {"200": ResponseSchema},
                      RequestSchema,
                      {"path": undefined,"query": {"secret": string},"header": undefined,"cookie": undefined}
                  > {
              name: "updatePet";
              operation: "put";
              path: "/pets/{:petId}"
          }
          
      export interface CreatePet<RequestSchema extends EndpointDefinition.DtoTypes> extends EndpointDefinition<
                      {"200": undefined},
                      RequestSchema,
                      {"path": undefined,"query": undefined,"header": {"other-secret": string},"cookie": {"secret": string}}
                  > {
              name: "createPet";
              operation: "post";
              path: "/pets"
          }
          
                  }"
    `);
  });
});
