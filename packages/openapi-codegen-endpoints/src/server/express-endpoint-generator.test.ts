import { OpenapiBundledMock, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { generateExpressApi, generateExpressZodApiFromBundled } from "../endpoint-generator.js";
import { describe, expect, test } from "vitest";
import { resolveSpecPath } from "openapi-example-specs";

describe.each(["zod" /*, "ts"*/] as const)("generate express %s", (generator) => {
  const { createApi, withSchemas, withRoute } = OpenapiBundledMock.create();

  test("integration", async () => {
    const spec = resolveSpecPath("fullmetal/openapi.yml");
    const endpoints = await generateExpressApi(spec, { outDir: `tmp/${generator}/express/fullmetal`, apiName: "FullmetalApi", generator });
    expect(endpoints.sources).toMatchSnapshot("fullmetal/openapi.yml");
  });

  test("express endpoints", async () => {
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
        "/pets/{petId}": {
          parameters: [{ in: "path", name: "petId", required: true, schema: { type: "string" } }],
          get: {
            operationId: "getPet",
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
            parameters: [
              { in: "query", name: "secret", required: true, schema: { type: "string" } },
              { in: "path", name: "secret", required: false, schema: { type: "string" } },
              { in: "header", name: "secret", required: false, schema: { type: "string" } },
              { in: "cookie", name: "secret", required: false, schema: { type: "string" } },
              { in: "query", name: "secret2", required: false, schema: { type: "string" } },
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
      }),
    );

    const endpoints = await generateExpressZodApiFromBundled(openapi, { outDir: `tmp/${generator}/express-api`, apiName: "TestApi", generator });

    expect(endpoints.sources).toMatchSnapshot("express");
  });
});

test("integration", async () => {
  const spec = resolveSpecPath("fullmetal/openapi.yml");
  const endpoints = await generateExpressApi(spec, { outDir: `tmp/zod/express/fullmetal`, apiName: "FullmetalApi", generator: "zod" });
  expect(endpoints.sources).toMatchSnapshot("fullmetal/openapi.yml");
});
