/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi } from "vitest";
import z from "zod";
import { ControllerFn, ExpressHandler } from "../../templates/ExpressCommon.js";
import { ApiConfig, Operation, withDefaults } from "../../templates/ExpressZodCommon.js";

describe("withDefaults", () => {
  // Helper function to create mock controllers and middlewares
  const createMockController = (name: string): ControllerFn<any, any, any, any> => {
    const controller = vi.fn(() => ({ status: 200, json: { result: name } }));
    controller.mockName(name);
    return controller as any;
  };

  const createMockMiddleware = (name: string): ExpressHandler => {
    const middleware = vi.fn();
    middleware.mockName(name);
    return middleware;
  };

  describe("basic behavior", () => {
    test("should return operation as-is when no defaults provided", () => {
      const controller = createMockController("testController");
      const operation: Operation = {
        controller,
      };

      const result = withDefaults("testOp", operation, undefined);

      expect(result.controller).toBe(controller);
      expect(result.requestMiddlewares).toBeUndefined();
      expect(result.responseMiddlewares).toBeUndefined();
      expect(result.requestValidation).toBeUndefined();
      expect(result.responseValidation).toBeUndefined();
    });

    test("should return operation with all fields when fully specified", () => {
      const controller = createMockController("testController");
      const reqMiddleware = createMockMiddleware("reqMw");
      const resMiddleware = createMockMiddleware("resMw");
      const headersSchema = z.object({ authorization: z.string() });
      const paramsSchema = z.object({ id: z.string() });
      const bodySchema = z.object({ name: z.string() });
      const responseSchema = z.object({ success: z.boolean() });

      const operation: Operation = {
        controller,
        requestMiddlewares: [reqMiddleware],
        responseMiddlewares: [resMiddleware],
        requestValidation: {
          headers: headersSchema,
          params: paramsSchema,
          body: bodySchema,
        },
        responseValidation: {
          responses: {
            200: responseSchema,
          },
        },
      };

      const result = withDefaults("testOp", operation, undefined);

      expect(result.controller).toBe(controller);
      expect(result.requestMiddlewares).toEqual([reqMiddleware]);
      expect(result.responseMiddlewares).toEqual([resMiddleware]);

      expect(result.requestValidation?.headers).toBe(headersSchema);
      expect(result.requestValidation?.params).toBe(paramsSchema);
      expect(result.requestValidation?.body).toBe(bodySchema);
      expect(typeof result.responseValidation === "object" && result.responseValidation?.responses?.[200]).toBe(responseSchema);
    });
  });

  describe("global config merging", () => {
    test("should apply global request middlewares", () => {
      const globalMw = createMockMiddleware("globalMw");
      const opMw = createMockMiddleware("opMw");
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        requestMiddlewares: [opMw],
      };

      const defaults = {
        globalConfig: {
          requestMiddlewares: [globalMw],
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(result.requestMiddlewares).toHaveLength(2);
      expect(result.requestMiddlewares?.[0]).toBe(globalMw);
      expect(result.requestMiddlewares?.[1]).toBe(opMw);
    });

    test("should apply global response middlewares", () => {
      const globalMw = createMockMiddleware("globalMw");
      const opMw = createMockMiddleware("opMw");
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        responseMiddlewares: [opMw],
      };

      const defaults = {
        globalConfig: {
          responseMiddlewares: [globalMw],
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(result.responseMiddlewares).toHaveLength(2);
      expect(result.responseMiddlewares?.[0]).toBe(globalMw);
      expect(result.responseMiddlewares?.[1]).toBe(opMw);
    });

    test("should apply global request validation", () => {
      const globalHeaders = z.object({ "x-api-key": z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
      };

      const defaults = {
        globalConfig: {
          requestValidation: {
            headers: globalHeaders,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(result.requestValidation?.headers).toBe(globalHeaders);
    });

    test("should apply global response validation", () => {
      const globalResponse = z.object({ error: z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
      };

      const defaults = {
        globalConfig: {
          responseValidation: {
            responses: {
              400: globalResponse,
            },
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.responseValidation === "object" && result.responseValidation?.responses?.[400]).toBe(globalResponse);
    });
  });

  describe("scoped config merging", () => {
    test("should apply scoped request middlewares", () => {
      const globalMw = createMockMiddleware("globalMw");
      const scopedMw = createMockMiddleware("scopedMw");
      const opMw = createMockMiddleware("opMw");
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        requestMiddlewares: [opMw],
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestMiddlewares: [globalMw],
        },
        scopedConfig: {
          testOp: {
            requestMiddlewares: [scopedMw],
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(result.requestMiddlewares).toHaveLength(3);
      expect(result.requestMiddlewares?.[0]).toBe(globalMw);
      expect(result.requestMiddlewares?.[1]).toBe(scopedMw);
      expect(result.requestMiddlewares?.[2]).toBe(opMw);
    });

    test("should apply scoped response validation", () => {
      const globalResponse = z.object({ error: z.string() });
      const scopedResponse = z.object({ data: z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          responseValidation: {
            responses: {
              400: globalResponse,
            },
          },
        },
        scopedConfig: {
          testOp: {
            responseValidation: {
              responses: {
                200: scopedResponse,
              },
            },
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.responseValidation === "object" && result.responseValidation?.responses?.[400]).toBe(globalResponse);
      expect(typeof result.responseValidation === "object" && result.responseValidation?.responses?.[200]).toBe(scopedResponse);
    });
  });

  describe("opt-out behavior with false", () => {
    test("should opt-out request middlewares with false at scoped level", () => {
      const globalMw = createMockMiddleware("globalMw");
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestMiddlewares: [globalMw],
        },
        scopedConfig: {
          testOp: {
            requestMiddlewares: false,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(result.requestMiddlewares).toBeUndefined();
    });

    test("should opt-out entire scoped config with false", () => {
      const globalMw = createMockMiddleware("globalMw");
      const globalHeaders = z.object({ "x-api-key": z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestMiddlewares: [globalMw],
          requestValidation: {
            headers: globalHeaders,
          },
        },
        scopedConfig: {
          testOp: false,
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      // When scopedConfig is false, global config should be ignored
      expect(result.requestMiddlewares).toBeUndefined();
      expect(result.requestValidation).toBeUndefined();
    });

    test("should opt-out request validation headers with false", () => {
      const globalHeaders = z.object({ "x-api-key": z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        requestValidation: {
          headers: false,
        },
      };

      const defaults = {
        globalConfig: {
          requestValidation: {
            headers: globalHeaders,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(result.requestValidation?.headers).toBe(false);
    });

    test("should opt-out response validation with false at scoped level", () => {
      const globalResponse = z.object({ error: z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          responseValidation: {
            responses: {
              400: globalResponse,
            },
          },
        },
        scopedConfig: {
          testOp: {
            responseValidation: false,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(result.responseValidation).toBeUndefined();
    });
  });

  describe("precedence order", () => {
    test("operation config should override scoped and global config", () => {
      const globalMw = createMockMiddleware("globalMw");
      const scopedMw = createMockMiddleware("scopedMw");
      const opMw = createMockMiddleware("opMw");
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        requestMiddlewares: [opMw],
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestMiddlewares: [globalMw],
        },
        scopedConfig: {
          testOp: {
            requestMiddlewares: [scopedMw],
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      // All should be merged in order: global, scoped, operation
      expect(result.requestMiddlewares).toHaveLength(3);
      expect(result.requestMiddlewares?.[0]).toBe(globalMw);
      expect(result.requestMiddlewares?.[1]).toBe(scopedMw);
      expect(result.requestMiddlewares?.[2]).toBe(opMw);
    });

    test("operation validation should take precedence over scoped and global", () => {
      const globalHeaders = z.object({ "x-global": z.string() });
      const scopedHeaders = z.object({ "x-scoped": z.string() });
      const opHeaders = z.object({ "x-operation": z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        requestValidation: {
          headers: opHeaders,
        },
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestValidation: {
            headers: globalHeaders,
          },
        },
        scopedConfig: {
          testOp: {
            requestValidation: {
              headers: scopedHeaders,
            },
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      // Operation headers should take precedence
      expect(result.requestValidation?.headers).toBe(opHeaders);
    });

    test("scoped validation should take precedence over global when operation has none", () => {
      const globalHeaders = z.object({ "x-global": z.string() });
      const scopedHeaders = z.object({ "x-scoped": z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestValidation: {
            headers: globalHeaders,
          },
        },
        scopedConfig: {
          testOp: {
            requestValidation: {
              headers: scopedHeaders,
            },
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      // Scoped headers should take precedence over global
      expect(result.requestValidation?.headers).toBe(scopedHeaders);
    });
  });

  describe("response validation merging", () => {
    test("should merge response schemas from all levels", () => {
      const global200 = z.object({ success: z.boolean() });
      const scoped400 = z.object({ error: z.string() });
      const op500 = z.object({ critical: z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        responseValidation: {
          responses: {
            500: op500,
          },
        },
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          responseValidation: {
            responses: {
              200: global200,
            },
          },
        },
        scopedConfig: {
          testOp: {
            responseValidation: {
              responses: {
                400: scoped400,
              },
            },
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.responseValidation === "object" && result.responseValidation?.responses?.[200]).toBe(global200);
      expect(typeof result.responseValidation === "object" && result.responseValidation?.responses?.[400]).toBe(scoped400);
      expect(typeof result.responseValidation === "object" && result.responseValidation?.responses?.[500]).toBe(op500);
    });

    test("should allow disabling specific status code validation with false", () => {
      const global200 = z.object({ success: z.boolean() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        responseValidation: {
          responses: {
            200: false,
          },
        },
      };

      const defaults = {
        globalConfig: {
          responseValidation: {
            responses: {
              200: global200,
            },
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.responseValidation === "object" && result.responseValidation?.responses?.[200]).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("should handle operation with only controller", () => {
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
      };

      const result = withDefaults("testOp", operation, {});

      expect(result.controller).toBe(controller);
      expect(result.requestMiddlewares).toBeUndefined();
      expect(result.responseMiddlewares).toBeUndefined();
      expect(result.requestValidation).toBeUndefined();
      expect(result.responseValidation).toBeUndefined();
    });

    test("should handle empty defaults object", () => {
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
      };

      const result = withDefaults("testOp", operation, {});

      expect(result.controller).toBe(controller);
    });

    test("should handle empty arrays for middlewares", () => {
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        requestMiddlewares: [],
        responseMiddlewares: [],
      };

      const defaults = {
        globalConfig: {
          requestMiddlewares: [],
          responseMiddlewares: [],
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(result.requestMiddlewares).toBeUndefined();
      expect(result.responseMiddlewares).toBeUndefined();
    });

    test("should handle mixed validation fields", () => {
      const globalHeaders = z.object({ "x-global": z.string() });
      const scopedParams = z.object({ id: z.string() });
      const opBody = z.object({ data: z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        requestValidation: {
          body: opBody,
        },
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestValidation: {
            headers: globalHeaders,
          },
        },
        scopedConfig: {
          testOp: {
            requestValidation: {
              params: scopedParams,
            },
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(result.requestValidation?.headers).toBe(globalHeaders);
      expect(result.requestValidation?.params).toBe(scopedParams);
      expect(result.requestValidation?.body).toBe(opBody);
    });

    test("should handle undefined requestValidation in operation when defaults exist", () => {
      const globalHeaders = z.object({ "x-global": z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        requestValidation: undefined,
      };

      const defaults = {
        globalConfig: {
          requestValidation: {
            headers: globalHeaders,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(result.requestValidation?.headers).toBe(globalHeaders);
    });
  });

  describe("generator config", () => {
    test("should apply generator config when provided", () => {
      const generatorHeaders = z.object({ "x-generated": z.string() });
      const generatorBody = z.object({ generatedField: z.string() });
      const generatorResponse = z.object({ generatedResult: z.boolean() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
      };

      const generatorConfig = {
        requestValidation: {
          headers: generatorHeaders,
          body: generatorBody,
        },
        responseValidation: {
          responses: {
            200: generatorResponse,
          },
        },
      };

      const result = withDefaults("testOp", operation, undefined, generatorConfig);
      expect(result.requestValidation?.headers).toBe(generatorHeaders);
      expect(result.requestValidation?.body).toBe(generatorBody);
      expect(result.responseValidation?.responses?.[200]).toBe(generatorResponse);
    });

    test("generator config should override global config", () => {
      const globalHeaders = z.object({ "x-global": z.string() });
      const generatorHeaders = z.object({ "x-generated": z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
      };

      const defaults = {
        globalConfig: {
          requestValidation: {
            headers: globalHeaders,
          },
        },
      };

      const generatorConfig = {
        requestValidation: {
          headers: generatorHeaders,
        },
      };

      const result = withDefaults("testOp", operation, defaults, generatorConfig);

      expect(result.requestValidation?.headers).toBe(generatorHeaders);
    });

    test("scoped config should override generator config", () => {
      const globalHeaders = z.object({ "x-global": z.string() });
      const generatorHeaders = z.object({ "x-generated": z.string() });
      const scopedHeaders = z.object({ "x-scoped": z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestValidation: {
            headers: globalHeaders,
          },
        },
        scopedConfig: {
          testOp: {
            requestValidation: {
              headers: scopedHeaders,
            },
          },
        },
      };

      const generatorConfig = {
        requestValidation: {
          headers: generatorHeaders,
        },
      };

      const result = withDefaults("testOp", operation, defaults, generatorConfig);

      expect(result.requestValidation?.headers).toBe(scopedHeaders);
    });

    test("operation config should override all including generator config", () => {
      const globalHeaders = z.object({ "x-global": z.string() });
      const generatorHeaders = z.object({ "x-generated": z.string() });
      const scopedHeaders = z.object({ "x-scoped": z.string() });
      const opHeaders = z.object({ "x-operation": z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        requestValidation: {
          headers: opHeaders,
        },
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestValidation: {
            headers: globalHeaders,
          },
        },
        scopedConfig: {
          testOp: {
            requestValidation: {
              headers: scopedHeaders,
            },
          },
        },
      };

      const generatorConfig = {
        requestValidation: {
          headers: generatorHeaders,
        },
      };

      const result = withDefaults("testOp", operation, defaults, generatorConfig);

      expect(result.requestValidation?.headers).toBe(opHeaders);
    });

    test("should merge different fields from different levels with generator config", () => {
      const globalHeaders = z.object({ "x-global": z.string() });
      const generatorParams = z.object({ id: z.string() });
      const scopedQuery = z.object({ filter: z.string() });
      const opBody = z.object({ data: z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        requestValidation: {
          body: opBody,
        },
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestValidation: {
            headers: globalHeaders,
          },
        },
        scopedConfig: {
          testOp: {
            requestValidation: {
              query: scopedQuery,
            },
          },
        },
      };

      const generatorConfig = {
        requestValidation: {
          params: generatorParams,
        },
      };

      const result = withDefaults("testOp", operation, defaults, generatorConfig);

      expect(result.requestValidation?.headers).toBe(globalHeaders);
      expect(result.requestValidation?.params).toBe(generatorParams);
      expect(result.requestValidation?.query).toBe(scopedQuery);
      expect(result.requestValidation?.body).toBe(opBody);
    });

    test("should opt-out generator config with false at scoped level", () => {
      const generatorHeaders = z.object({ "x-generated": z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
      };

      const defaults: ApiConfig["defaults"] = {
        scopedConfig: {
          testOp: {
            requestValidation: {
              headers: false,
            },
          },
        },
      };

      const generatorConfig = {
        requestValidation: {
          headers: generatorHeaders,
        },
      };

      const result = withDefaults("testOp", operation, defaults, generatorConfig);

      expect(result.requestValidation?.headers).toBe(false);
    });

    test("should merge response schemas from all levels including generator config", () => {
      const global200 = z.object({ success: z.boolean() });
      const generator201 = z.object({ created: z.string() });
      const scoped400 = z.object({ error: z.string() });
      const op500 = z.object({ critical: z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        responseValidation: {
          responses: {
            500: op500,
          },
        },
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          responseValidation: {
            responses: {
              200: global200,
            },
          },
        },
        scopedConfig: {
          testOp: {
            responseValidation: {
              responses: {
                400: scoped400,
              },
            },
          },
        },
      };

      const generatorConfig = {
        responseValidation: {
          responses: {
            201: generator201,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults, generatorConfig);

      expect(typeof result.responseValidation === "object" && result.responseValidation?.responses?.[200]).toBe(global200);
      expect(typeof result.responseValidation === "object" && result.responseValidation?.responses?.[201]).toBe(generator201);
      expect(typeof result.responseValidation === "object" && result.responseValidation?.responses?.[400]).toBe(scoped400);
      expect(typeof result.responseValidation === "object" && result.responseValidation?.responses?.[500]).toBe(op500);
    });

    test("precedence order: operation > scoped > generator > global", () => {
      const globalHeaders = z.object({ "x-global": z.string() });
      const globalParams = z.object({ globalParam: z.string() });
      const generatorHeaders = z.object({ "x-generated": z.string() });
      const generatorQuery = z.object({ generatorQuery: z.string() });
      const generatedBody = z.object({ generatedBody: z.string() });
      const scopedHeaders = z.object({ "x-scoped": z.string() });
      const scopedBody = z.object({ scopedBody: z.string() });
      const opHeaders = z.object({ "x-operation": z.string() });
      const controller = createMockController("controller");

      const operation: Operation = {
        controller,
        requestValidation: {
          headers: opHeaders,
        },
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestValidation: {
            headers: globalHeaders,
            params: globalParams,
          },
        },
        scopedConfig: {
          testOp: {
            requestValidation: {
              headers: scopedHeaders,
              body: scopedBody,
            },
          },
        },
      };

      const generatorConfig = {
        requestValidation: {
          headers: generatorHeaders,
          query: generatorQuery,
          body: generatedBody,
        },
      };

      const result = withDefaults("testOp", operation, defaults, generatorConfig);

      // operation wins for headers
      expect(result.requestValidation?.headers).toBe(opHeaders);
      // scoped wins for body (no generator)
      expect(result.requestValidation?.body).toBe(scopedBody);
      // generator wins for query (no operation or scoped)
      expect(result.requestValidation?.query).toBe(generatorQuery);
      // global wins for params (no operation, scoped, or generator)
      expect(result.requestValidation?.params).toBe(globalParams);
    });
  });
});
