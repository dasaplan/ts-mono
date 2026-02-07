import { NextFunction, Request, Response } from "express";
import { ControllerFn, ExpressHandler } from "./ExpressCommon.js";

export interface ResponseValidationFn<Response = unknown> {
  (httpStatus: number, payload?: Response): boolean;
}

export interface RequestValidationFn<RequestBody = unknown> {
  (body?: RequestBody, params?: Record<string, unknown>, headers?: Record<string, unknown>): boolean;
}

export type Operation = {
  requestValidation?: RequestValidationFn;
  responseValidation?: ResponseValidationFn;
  requestMiddlewares?: Array<ExpressHandler>;
  controller: ControllerFn;
  responseMiddlewares?: Array<ExpressHandler>;
};

type OperationConfig<Op extends Operation> = { [key in keyof Op]?: Op[key] | false };
type OperationMap<Ops extends { [key in keyof object]: Operation } = { [key in keyof object]: Operation }> = {
  [operationId in keyof Ops]: Operation;
};
type ScopedDefaultConfig<OpMap extends OperationMap> = {
  [key in keyof OpMap]?: (OpMap[key] extends Operation ? OperationConfig<OpMap[key]> : never) | false;
};

export type ApiConfig<OpMap extends OperationMap = OperationMap> = {
  /** A controller will evaluate in order defaults.globalConfig, defaults.scopedConfig.operationId, operations.operationId.
   * The defined configs are additive unless explicitly provided false for respective config.
   *
   * Validation functions will be evaluated in order global to operation.
   * Execution will short-circuit and stop execution if any function returns false.
   *
   * @example
   * ```ts
   * // defaults apply to all operations and are additive to concrete operation
   * const petsApiConfig = {
   *   defaults: { globalConfig: { requestValidation: (body, params, headers) => !!headers?.authorization } }
   *   operations: { fetchPets: createPetsOperation(), createPet: createPetOperation() }
   *  };
   *
   * // opt-out request validation for fetchPets and only use specification in operations.fetchPets
   * const petsApiConfig = {
   *   defaults: {
   *    globalConfig: { requestValidation: (body, params, headers) => !!headers?.authorization },
   *    scopedConfig: { fetchPets: { requestValidation: false } }
   *    },
   *   operations: { fetchPets: createPetsOperation(), createPet: createPetOperation() }
   *   };
   *
   * // disable config for specific scope and only use the specification in operations
   * const petsApiConfig = {
   *   defaults: {
   *    globalConfig: { requestValidation: (body, params, headers) => !!headers?.authorization },
   *    scopedConfig: { fetchPets: false }
   *   },
   *   operations: { fetchPets: createPetsOperation(), createPet: createPetOperation() }
   *    };
   * ```
   * */
  defaults?: { globalConfig?: OperationConfig<Operation>; scopedConfig?: ScopedDefaultConfig<OpMap> };
  operations: OpMap;
};

export class RequestValidationError extends Error {
  public static NAME = "RequestValidationError";

  constructor(
    public location: "body" | "params" | "headers" | "unknown",
    public validationError: Error,
  ) {
    super(`Request validation failed for ${location}: ${validationError.message}`);
    this.name = RequestValidationError.NAME;
  }

  get pretty() {
    return this.validationError.message;
  }
}

export class ResponseValidationError extends Error {
  public static NAME = "ResponseValidationError";

  constructor(
    public location: "body" | "unknown",
    public validationError: Error,
  ) {
    super(`Response validation failed for ${location}: ${validationError.message}`);
    this.name = ResponseValidationError.NAME;
  }

  get pretty() {
    return this.validationError.message;
  }
}

export class MissingResponseSchemaError extends Error {
  public static NAME = "SchemaNotFoundError";

  constructor(public statusCode: number) {
    super(`No response schema defined for status code statusCode: ${statusCode}`);
    this.name = MissingResponseSchemaError.NAME;
  }
}

export function CreateInputValidator<T extends RequestValidationFn>(requestValidation: T): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const isValid = requestValidation(req.body, req.params, req.headers);
      if (!isValid) {
        return next(new RequestValidationError("unknown", new Error(`Provided validation function returned ${isValid}`)));
      }
      return next();
    } catch (error) {
      if (error instanceof Error) {
        return next(new RequestValidationError("unknown", error));
      }
      return next(error);
    }
  };
}

export function CreateController<Req extends Request, Res extends Response, Next extends NextFunction>(
  opController: Operation["controller"],
  responseValidation: ResponseValidationFn | undefined,
) {
  return async (req: Req, res: Res, next: Next) => {
    try {
      const result = await opController(req);
      if (typeof result === "undefined") {
        // no content
        return res.status(204).send();
      }

      if ("headers" in result && typeof result.headers === "object") {
        Object.entries(result.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }

      if ("kind" in result && result.kind === "CUSTOM_SENDER") {
        return result.sender(res, next);
      }

      if (typeof responseValidation === "function") {
        try {
          const responseBody = "json" in result ? result.json : undefined;
          const isValid = responseValidation(result.status, responseBody);
          if (isValid) {
            if (responseBody) {
              return res.status(result.status).json(responseBody);
            }
            return res.status(result.status).send();
          }
          return next(new ResponseValidationError("unknown", new Error(`Response validation failed: ${result.status}`)));
        } catch (error) {
          if (error instanceof Error) {
            return next(new ResponseValidationError("unknown", error));
          }
          return next(error);
        }
      }

      return next();
    } catch (error: unknown) {
      if (error instanceof Error) {
        return next(new ResponseValidationError("unknown", error));
      }
      return next(error);
    }
  };
}

export function withDefaults<T extends Record<string, Operation>>(operationId: string, operation: Operation, defaults?: ApiConfig<T>["defaults"]): Operation {
  if (typeof defaults === "undefined") {
    return operation;
  }

  const globalConfig = defaults.globalConfig;
  const scopedConfigRaw = defaults.scopedConfig?.[operationId];
  // scopedConfig can be false (to disable all defaults for this operation), an OperationConfig, or undefined
  const scopedConfig = scopedConfigRaw === false ? undefined : scopedConfigRaw;
  // if scopedConfig is false, then globalConfig is ignored for that operation
  // in this case we only handle the operation level config
  const isConfigDisabledForScope = scopedConfigRaw === false;

  // Helper to merge arrays of middlewares
  function mergeMiddlewares(
    global?: Array<ExpressHandler> | false,
    scoped?: Array<ExpressHandler> | false,
    operation?: Array<ExpressHandler> | false,
  ): Array<ExpressHandler> | undefined {
    if (isConfigDisabledForScope) return operation !== false ? operation : undefined;

    if (operation === false) return undefined;
    if (scoped === false) return undefined;

    const result: Array<ExpressHandler> = [];
    if (global && Array.isArray(global)) {
      result.push(...global);
    }
    if (scoped && Array.isArray(scoped)) {
      result.push(...scoped);
    }
    if (operation && Array.isArray(operation)) {
      result.push(...operation);
    }
    return result.length > 0 ? result : undefined;
  }

  function mergeRequestValidation(): RequestValidationFn | undefined {
    if (isConfigDisabledForScope) return operation.requestValidation;

    const globalRV = globalConfig?.requestValidation;
    const scopedRV = scopedConfig?.requestValidation;
    const opRV = operation.requestValidation;

    return ((body, params, headers) => {
      let isValid = true;
      if (typeof globalRV === "function") {
        isValid &&= globalRV(body, params, headers);
      }
      if (typeof scopedRV === "function") {
        isValid &&= scopedRV(body, params, headers);
      }
      if (typeof opRV === "function") {
        isValid &&= opRV(body, params, headers);
      }
      return isValid;
    }) satisfies RequestValidationFn;
  }

  function mergeResponseValidation() {
    const globalRV = globalConfig?.responseValidation;
    const scopedRV = scopedConfig?.responseValidation;
    const opRV = operation.responseValidation;

    if (typeof scopedRV !== "undefined" && !scopedRV) return opRV;

    if (isConfigDisabledForScope) return opRV;

    return (httpStatus: number, payload?: unknown) => {
      let isValid = true;
      if (typeof globalRV === "function") {
        isValid &&= globalRV(httpStatus, payload);
      }
      if (typeof scopedRV === "function") {
        isValid &&= scopedRV(httpStatus, payload);
      }
      if (typeof opRV === "function") {
        isValid &&= opRV(httpStatus, payload);
      }
      return isValid;
    };
  }

  function mergeRequestMiddlewares() {
    if (isConfigDisabledForScope) return operation.requestMiddlewares;

    const globalRM = globalConfig?.requestMiddlewares;
    const scopedRM = scopedConfig?.requestMiddlewares;
    const opRM = operation.requestMiddlewares;

    return mergeMiddlewares(globalRM, scopedRM, opRM);
  }

  // Merge response middlewares
  function mergeResponseMiddlewares() {
    if (isConfigDisabledForScope) return operation.responseMiddlewares;

    const globalRM = globalConfig?.responseMiddlewares;
    const scopedRM = scopedConfig?.responseMiddlewares;
    const opRM = operation.responseMiddlewares;

    return mergeMiddlewares(globalRM, scopedRM, opRM);
  }

  return {
    controller: operation.controller,
    requestMiddlewares: mergeRequestMiddlewares(),
    requestValidation: mergeRequestValidation(),
    responseMiddlewares: mergeResponseMiddlewares(),
    responseValidation: mergeResponseValidation(),
  };
}
