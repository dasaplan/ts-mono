import { describe, expect, test } from "vitest";
import { OpenapiBundledMock } from "../bundled-mock.js";
import { Transpiler } from "./transpiler.js";

describe("transpile-endpoints", () => {
  const { createApi, withRoute } = OpenapiBundledMock.create();
  test("handle global parameters overwritten", () => {
    const api = createApi(
      withRoute({
        "/test": {
          parameters: [{ in: "path", name: "foo", schema: { type: "string" }, required: true }],
          get: {
            operationId: "foo",
            parameters: [{ in: "path", name: "foo", schema: { type: "string" } }],
            responses: { 204: { description: "no content" } },
          },
        },
      }),
    );

    const transpiler = Transpiler.of(api);

    expect(JSON.parse(JSON.stringify(transpiler.endpoints()))).toMatchInlineSnapshot(`
      [
        {
          "alias": "foo",
          "deprecated": false,
          "method": "get",
          "parameters": [
            {
              "isRequired": false,
              "name": "foo",
              "schema": {
                "component": {
                  "kind": "INLINE",
                  "name": "fooSchema",
                },
                "kind": "PRIMITIVE",
                "raw": {
                  "type": "string",
                },
                "type": "string",
              },
              "type": "path",
            },
          ],
          "path": "/test",
          "responses": [],
        },
      ]
    `);
  });

  test("handle global parameters - not overwritten by type", () => {
    const api = createApi(
      withRoute({
        "/test": {
          parameters: [{ in: "path", name: "foo", schema: { type: "string" }, required: true }],
          get: {
            operationId: "fooId",
            parameters: [{ in: "query", name: "foo", schema: { type: "string" } }],
            responses: { 204: { description: "no content" } },
          },
        },
      }),
    );

    const transpiler = Transpiler.of(api);

    expect(JSON.parse(JSON.stringify(transpiler.endpoints()))).toMatchInlineSnapshot(`
      [
        {
          "alias": "fooId",
          "deprecated": false,
          "method": "get",
          "parameters": [
            {
              "isRequired": true,
              "name": "foo",
              "schema": {
                "component": {
                  "kind": "INLINE",
                  "name": "fooSchema",
                },
                "kind": "PRIMITIVE",
                "raw": {
                  "type": "string",
                },
                "type": "string",
              },
              "type": "path",
            },
            {
              "isRequired": false,
              "name": "foo",
              "schema": {
                "component": {
                  "kind": "INLINE",
                  "name": "fooSchema",
                },
                "kind": "PRIMITIVE",
                "raw": {
                  "type": "string",
                },
                "type": "string",
              },
              "type": "query",
            },
          ],
          "path": "/test",
          "responses": [],
        },
      ]
    `);
  });

  test("handle global parameters - not overwritten by type and name", () => {
    const api = createApi(
      withRoute({
        "/test": {
          parameters: [{ in: "path", name: "foo", schema: { type: "string" }, required: true }],
          get: {
            operationId: "foo",
            parameters: [{ in: "query", name: "param-1", schema: { type: "string" } }],
            responses: { 204: { description: "no content" } },
          },
        },
      }),
    );

    const transpiler = Transpiler.of(api);

    expect(JSON.parse(JSON.stringify(transpiler.endpoints()))).toMatchInlineSnapshot(`
      [
        {
          "alias": "foo",
          "deprecated": false,
          "method": "get",
          "parameters": [
            {
              "isRequired": true,
              "name": "foo",
              "schema": {
                "component": {
                  "kind": "INLINE",
                  "name": "fooSchema",
                },
                "kind": "PRIMITIVE",
                "raw": {
                  "type": "string",
                },
                "type": "string",
              },
              "type": "path",
            },
            {
              "isRequired": false,
              "name": "param-1",
              "schema": {
                "component": {
                  "kind": "INLINE",
                  "name": "param-1Schema",
                },
                "kind": "PRIMITIVE",
                "raw": {
                  "type": "string",
                },
                "type": "string",
              },
              "type": "query",
            },
          ],
          "path": "/test",
          "responses": [],
        },
      ]
    `);
  });
});
