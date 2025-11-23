import { describe, expect, test, vi } from "vitest";
import { ControllerFn } from "../../templates/ExpressCommon.js";
import { ApiConfig, Operation, withDefaults } from "../../templates/ExpressTsCommon.js";

describe("withDefaults", () => {
  // Helper function to create mock controllers and middlewares
  const createMockController = (name: string): ControllerFn => {
    const controller = vi.fn(() => ({ status: 200, json: { result: name } }));
    controller.mockName(name);
    return controller;
  };

  describe("response validation function", () => {
    test("should use response validation function from operation level", () => {
      const controller = createMockController("controller");
      const validationFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        responseValidation: validationFn,
      };

      const result = withDefaults("testOp", operation, undefined);

      expect(result.responseValidation).toBe(validationFn);
    });

    test("should combine global and operation validation functions with AND logic", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => true);
      const opFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        responseValidation: opFn,
      };

      const defaults = {
        globalConfig: {
          responseValidation: globalFn,
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.responseValidation).toBe("function");
      expect(result.responseValidation).not.toBe(globalFn);
      expect(result.responseValidation).not.toBe(opFn);

      // Test the combined function
      if (typeof result.responseValidation === "function") {
        const isValid = result.responseValidation(200, { data: "test" });
        expect(isValid).toBe(true);
        expect(globalFn).toHaveBeenCalledWith(200, { data: "test" });
        expect(opFn).toHaveBeenCalledWith(200, { data: "test" });
      }
    });

    test("should combine scoped and operation validation functions", () => {
      const controller = createMockController("controller");
      const scopedFn = vi.fn(() => true);
      const opFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        responseValidation: opFn,
      };

      const defaults: ApiConfig["defaults"] = {
        scopedConfig: {
          testOp: {
            responseValidation: scopedFn,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      if (typeof result.responseValidation === "function") {
        const isValid = result.responseValidation(200, { data: "test" });
        expect(isValid).toBe(true);
        expect(scopedFn).toHaveBeenCalledWith(200, { data: "test" });
        expect(opFn).toHaveBeenCalledWith(200, { data: "test" });
      }
    });

    test("should combine global, scoped, and operation validation functions", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => true);
      const scopedFn = vi.fn(() => true);
      const opFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        responseValidation: opFn,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          responseValidation: globalFn,
        },
        scopedConfig: {
          testOp: {
            responseValidation: scopedFn,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      if (typeof result.responseValidation === "function") {
        const isValid = result.responseValidation(200, { data: "test" });
        expect(isValid).toBe(true);
        expect(globalFn).toHaveBeenCalledWith(200, { data: "test" });
        expect(scopedFn).toHaveBeenCalledWith(200, { data: "test" });
        expect(opFn).toHaveBeenCalledWith(200, { data: "test" });
      }
    });

    test("should return false when any validation function returns false", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => true);
      const scopedFn = vi.fn(() => false); // This one fails - stops execution after this
      const opFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        responseValidation: opFn,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          responseValidation: globalFn,
        },
        scopedConfig: {
          testOp: {
            responseValidation: scopedFn,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.responseValidation).toBe("function");
      if (typeof result.responseValidation === "function") {
        const isValid = result.responseValidation(200, { data: "test" });
        expect(isValid).toBe(false);
        // Functions are called until one returns false (short-circuit with &&=)
        expect(globalFn).toHaveBeenCalledTimes(1);
        expect(scopedFn).toHaveBeenCalledTimes(1);
        // opFn is not called because scopedFn returned false (short-circuit)
        expect(opFn).toHaveBeenCalledTimes(0);
        expect(globalFn).toHaveBeenCalledWith(200, { data: "test" });
        expect(scopedFn).toHaveBeenCalledWith(200, { data: "test" });
      }
    });

    test("should short-circuit after first false return", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => false); // This one fails - stops execution
      const scopedFn = vi.fn(() => true);
      const opFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        responseValidation: opFn,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          responseValidation: globalFn,
        },
        scopedConfig: {
          testOp: {
            responseValidation: scopedFn,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.responseValidation).toBe("function");
      if (typeof result.responseValidation === "function") {
        const isValid = result.responseValidation(500, { error: "Server Error" });
        expect(isValid).toBe(false);
        // Only globalFn is called because it returns false (short-circuit)
        expect(globalFn).toHaveBeenCalledTimes(1);
        expect(scopedFn).toHaveBeenCalledTimes(0);
        expect(opFn).toHaveBeenCalledTimes(0);
        expect(globalFn).toHaveBeenCalledWith(500, { error: "Server Error" });
      }
    });

    test("should handle only global validation function", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
      };

      const defaults = {
        globalConfig: {
          responseValidation: globalFn,
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.responseValidation).toBe("function");
      if (typeof result.responseValidation === "function") {
        const isValid = result.responseValidation(200, { data: "test" });
        expect(isValid).toBe(true);
        expect(globalFn).toHaveBeenCalledWith(200, { data: "test" });
      }
    });

    test("should handle only scoped validation function", () => {
      const controller = createMockController("controller");
      const scopedFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
      };

      const defaults: ApiConfig["defaults"] = {
        scopedConfig: {
          testOp: {
            responseValidation: scopedFn,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.responseValidation).toBe("function");
      if (typeof result.responseValidation === "function") {
        const isValid = result.responseValidation(200, { data: "test" });
        expect(isValid).toBe(true);
        expect(scopedFn).toHaveBeenCalledWith(200, { data: "test" });
      }
    });

    test("should opt-out scoped validation function with false", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          responseValidation: globalFn,
        },
        scopedConfig: {
          testOp: {
            responseValidation: false,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      // Should return operation's responseValidation (undefined in this case)
      expect(result.responseValidation).toBeUndefined();
    });

    test("should use operation validation function when scoped is false", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => true);
      const opFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        responseValidation: opFn,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          responseValidation: globalFn,
        },
        scopedConfig: {
          testOp: {
            responseValidation: false,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(result.responseValidation).toBe(opFn);
    });

    test("should handle validation function with undefined payload", () => {
      const controller = createMockController("controller");
      const validationFn = vi.fn((status, payload) => {
        // Should handle undefined payload
        return status === 204 && payload === undefined;
      });

      const operation: Operation = {
        controller,
        responseValidation: validationFn,
      };

      const result = withDefaults("testOp", operation, undefined);

      if (typeof result.responseValidation === "function") {
        const isValid = result.responseValidation(204);
        expect(isValid).toBe(true);
        expect(validationFn).toHaveBeenCalledTimes(1);
        // Check that the function was called with status 204 and the second argument is undefined
        const [status, payload] = validationFn.mock.calls[0];
        expect(status).toBe(204);
        expect(payload).toBeUndefined();
      }
    });

    test("should pass through different status codes correctly", () => {
      const controller = createMockController("controller");
      const validationFn = vi.fn((status) => status >= 200 && status < 300);

      const operation: Operation = {
        controller,
        responseValidation: validationFn,
      };

      const result = withDefaults("testOp", operation, undefined);

      if (typeof result.responseValidation === "function") {
        expect(result.responseValidation(200, {})).toBe(true);
        expect(result.responseValidation(201, {})).toBe(true);
        expect(result.responseValidation(400, {})).toBe(false);
        expect(result.responseValidation(500, {})).toBe(false);

        expect(validationFn).toHaveBeenCalledTimes(4);
      }
    });
  });

  describe("request validation function", () => {
    test("should use request validation function from operation level", () => {
      const controller = createMockController("controller");
      const validationFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        requestValidation: validationFn,
      };

      const result = withDefaults("testOp", operation, undefined);

      expect(result.requestValidation).toBe(validationFn);
    });

    test("should combine global and operation validation functions with AND logic", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => true);
      const opFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        requestValidation: opFn,
      };

      const defaults = {
        globalConfig: {
          requestValidation: globalFn,
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.requestValidation).toBe("function");
      expect(result.requestValidation).not.toBe(globalFn);
      expect(result.requestValidation).not.toBe(opFn);

      // Test the combined function
      if (typeof result.requestValidation === "function") {
        const isValid = result.requestValidation({ data: "test" }, { id: "123" }, { "x-api-key": "secret" });
        expect(isValid).toBe(true);
        expect(globalFn).toHaveBeenCalledWith({ data: "test" }, { id: "123" }, { "x-api-key": "secret" });
        expect(opFn).toHaveBeenCalledWith({ data: "test" }, { id: "123" }, { "x-api-key": "secret" });
      }
    });

    test("should combine scoped and operation validation functions", () => {
      const controller = createMockController("controller");
      const scopedFn = vi.fn(() => true);
      const opFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        requestValidation: opFn,
      };

      const defaults: ApiConfig["defaults"] = {
        scopedConfig: {
          testOp: {
            requestValidation: scopedFn,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      if (typeof result.requestValidation === "function") {
        const isValid = result.requestValidation({ name: "test" }, { page: "1" }, { authorization: "Bearer token" });
        expect(isValid).toBe(true);
        expect(scopedFn).toHaveBeenCalledWith({ name: "test" }, { page: "1" }, { authorization: "Bearer token" });
        expect(opFn).toHaveBeenCalledWith({ name: "test" }, { page: "1" }, { authorization: "Bearer token" });
      }
    });

    test("should combine global, scoped, and operation validation functions", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => true);
      const scopedFn = vi.fn(() => true);
      const opFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        requestValidation: opFn,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestValidation: globalFn,
        },
        scopedConfig: {
          testOp: {
            requestValidation: scopedFn,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      if (typeof result.requestValidation === "function") {
        const isValid = result.requestValidation({ foo: "bar" }, { id: "456" }, { "x-header": "value" });
        expect(isValid).toBe(true);
        expect(globalFn).toHaveBeenCalledWith({ foo: "bar" }, { id: "456" }, { "x-header": "value" });
        expect(scopedFn).toHaveBeenCalledWith({ foo: "bar" }, { id: "456" }, { "x-header": "value" });
        expect(opFn).toHaveBeenCalledWith({ foo: "bar" }, { id: "456" }, { "x-header": "value" });
      }
    });

    test("should return false when any validation function returns false", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => true);
      const scopedFn = vi.fn(() => false); // This one fails - stops execution after this
      const opFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        requestValidation: opFn,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestValidation: globalFn,
        },
        scopedConfig: {
          testOp: {
            requestValidation: scopedFn,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.requestValidation).toBe("function");
      if (typeof result.requestValidation === "function") {
        const isValid = result.requestValidation({ invalid: "data" }, {}, {});
        expect(isValid).toBe(false);
        // Functions are called until one returns false (short-circuit with &&=)
        expect(globalFn).toHaveBeenCalledTimes(1);
        expect(scopedFn).toHaveBeenCalledTimes(1);
        // opFn is not called because scopedFn returned false (short-circuit)
        expect(opFn).toHaveBeenCalledTimes(0);
        expect(globalFn).toHaveBeenCalledWith({ invalid: "data" }, {}, {});
        expect(scopedFn).toHaveBeenCalledWith({ invalid: "data" }, {}, {});
      }
    });

    test("should short-circuit after first false return", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => false); // This one fails - stops execution
      const scopedFn = vi.fn(() => true);
      const opFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        requestValidation: opFn,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestValidation: globalFn,
        },
        scopedConfig: {
          testOp: {
            requestValidation: scopedFn,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.requestValidation).toBe("function");
      if (typeof result.requestValidation === "function") {
        const isValid = result.requestValidation({ body: "data" }, { param: "value" }, { header: "val" });
        expect(isValid).toBe(false);
        // Only globalFn is called because it returns false (short-circuit)
        expect(globalFn).toHaveBeenCalledTimes(1);
        expect(scopedFn).toHaveBeenCalledTimes(0);
        expect(opFn).toHaveBeenCalledTimes(0);
        expect(globalFn).toHaveBeenCalledWith({ body: "data" }, { param: "value" }, { header: "val" });
      }
    });

    test("should handle only global validation function", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
      };

      const defaults = {
        globalConfig: {
          requestValidation: globalFn,
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.requestValidation).toBe("function");
      if (typeof result.requestValidation === "function") {
        const isValid = result.requestValidation({ test: "data" }, { id: "1" }, { auth: "token" });
        expect(isValid).toBe(true);
        expect(globalFn).toHaveBeenCalledWith({ test: "data" }, { id: "1" }, { auth: "token" });
      }
    });

    test("should handle only scoped validation function", () => {
      const controller = createMockController("controller");
      const scopedFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
      };

      const defaults: ApiConfig["defaults"] = {
        scopedConfig: {
          testOp: {
            requestValidation: scopedFn,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      expect(typeof result.requestValidation).toBe("function");
      if (typeof result.requestValidation === "function") {
        const isValid = result.requestValidation({ payload: "value" }, {}, {});
        expect(isValid).toBe(true);
        expect(scopedFn).toHaveBeenCalledWith({ payload: "value" }, {}, {});
      }
    });

    test("should create combined function when scoped validation is false", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestValidation: globalFn,
        },
        scopedConfig: {
          testOp: {
            requestValidation: false,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      // When scoped is false, it's treated as "not a function" and the system still creates
      // a combined function that evaluates the global function (since operation has none)
      expect(typeof result.requestValidation).toBe("function");
      if (typeof result.requestValidation === "function") {
        const isValid = result.requestValidation({ test: "data" }, {}, {});
        expect(isValid).toBe(true);
        expect(globalFn).toHaveBeenCalledWith({ test: "data" }, {}, {});
      }
    });

    test("should create combined function when scoped is false but operation has validation", () => {
      const controller = createMockController("controller");
      const globalFn = vi.fn(() => true);
      const opFn = vi.fn(() => true);

      const operation: Operation = {
        controller,
        requestValidation: opFn,
      };

      const defaults: ApiConfig["defaults"] = {
        globalConfig: {
          requestValidation: globalFn,
        },
        scopedConfig: {
          testOp: {
            requestValidation: false,
          },
        },
      };

      const result = withDefaults("testOp", operation, defaults);

      // When scoped is false, it creates a combined function since both global and op are functions
      expect(typeof result.requestValidation).toBe("function");
      if (typeof result.requestValidation === "function") {
        const isValid = result.requestValidation({ test: "data" }, {}, {});
        expect(isValid).toBe(true);
        expect(globalFn).toHaveBeenCalledWith({ test: "data" }, {}, {});
        expect(opFn).toHaveBeenCalledWith({ test: "data" }, {}, {});
      }
    });

    test("should handle validation function with undefined parameters", () => {
      const controller = createMockController("controller");
      const validationFn = vi.fn((body, params, headers) => {
        // Should handle undefined parameters
        return body === undefined && params === undefined && headers === undefined;
      });

      const operation: Operation = {
        controller,
        requestValidation: validationFn,
      };

      const result = withDefaults("testOp", operation, undefined);

      if (typeof result.requestValidation === "function") {
        const isValid = result.requestValidation();
        expect(isValid).toBe(true);
        expect(validationFn).toHaveBeenCalledTimes(1);
        // Check that the function was called with undefined arguments
        const [body, params, headers] = validationFn.mock.calls[0];
        expect(body).toBeUndefined();
        expect(params).toBeUndefined();
        expect(headers).toBeUndefined();
      }
    });

    test("should handle validation function with partial parameters", () => {
      const controller = createMockController("controller");
      const validationFn = vi.fn((body, params, headers) => {
        return body?.name === "test" && params === undefined && headers === undefined;
      });

      const operation: Operation = {
        controller,
        requestValidation: validationFn,
      };

      const result = withDefaults("testOp", operation, undefined);

      if (typeof result.requestValidation === "function") {
        const isValid = result.requestValidation({ name: "test" });
        expect(isValid).toBe(true);
        expect(validationFn).toHaveBeenCalledTimes(1);
        const [body, params, headers] = validationFn.mock.calls[0];
        expect(body).toEqual({ name: "test" });
        expect(params).toBeUndefined();
        expect(headers).toBeUndefined();
      }
    });

    test("should pass through all parameters correctly", () => {
      const controller = createMockController("controller");
      const validationFn = vi.fn((body, params, headers) => {
        return body?.data === "test" && params?.id === "123" && headers?.auth === "token";
      });

      const operation: Operation = {
        controller,
        requestValidation: validationFn,
      };

      const result = withDefaults("testOp", operation, undefined);

      if (typeof result.requestValidation === "function") {
        expect(result.requestValidation({ data: "test" }, { id: "123" }, { auth: "token" })).toBe(true);
        expect(result.requestValidation({ data: "wrong" }, { id: "123" }, { auth: "token" })).toBe(false);
        expect(result.requestValidation({ data: "test" }, { id: "wrong" }, { auth: "token" })).toBe(false);
        expect(result.requestValidation({ data: "test" }, { id: "123" }, { auth: "wrong" })).toBe(false);

        expect(validationFn).toHaveBeenCalledTimes(4);
      }
    });

    test("should handle validation with only body parameter", () => {
      const controller = createMockController("controller");
      const validationFn = vi.fn((body) => {
        return body?.required === true;
      });

      const operation: Operation = {
        controller,
        requestValidation: validationFn,
      };

      const result = withDefaults("testOp", operation, undefined);

      if (typeof result.requestValidation === "function") {
        expect(result.requestValidation({ required: true })).toBe(true);
        expect(result.requestValidation({ required: false })).toBe(false);
        expect(validationFn).toHaveBeenCalledTimes(2);
      }
    });

    test("should handle validation with only params parameter", () => {
      const controller = createMockController("controller");
      const validationFn = vi.fn((body, params) => {
        return params?.id !== undefined;
      });

      const operation: Operation = {
        controller,
        requestValidation: validationFn,
      };

      const result = withDefaults("testOp", operation, undefined);

      if (typeof result.requestValidation === "function") {
        expect(result.requestValidation(undefined, { id: "123" })).toBe(true);
        expect(result.requestValidation(undefined, {})).toBe(false);
        expect(validationFn).toHaveBeenCalledTimes(2);
      }
    });

    test("should handle validation with only headers parameter", () => {
      const controller = createMockController("controller");
      const validationFn = vi.fn((body, params, headers) => {
        return headers?.["x-api-key"] !== undefined;
      });

      const operation: Operation = {
        controller,
        requestValidation: validationFn,
      };

      const result = withDefaults("testOp", operation, undefined);

      if (typeof result.requestValidation === "function") {
        expect(result.requestValidation(undefined, undefined, { "x-api-key": "secret" })).toBe(true);
        expect(result.requestValidation(undefined, undefined, {})).toBe(false);
        expect(validationFn).toHaveBeenCalledTimes(2);
      }
    });
  });
});
