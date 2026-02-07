/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any */
// noinspection DuplicatedCode

import { NextFunction, Request, Response } from "express";
import z from "zod";
import { ControllerFn, ExpressHandler } from "./ExpressCommon.js";

type ParamsDictionary = z.ZodObject;

type ParsedQs = z.ZodObject;

type RequestValidationForOperation<
    RequestBody extends object | undefined = object,
    PathParams extends object | undefined = object,
    QueryParams extends object | undefined = object,
    Headers extends object | undefined = object,
> = {
    /** header are deserialized to lower-case by express*/
    headers?: Headers | false;
    /** path parameters*/
    params?: PathParams | false;
    /** query parameters*/
    query?: QueryParams | false;
    /** request json body*/
    body?: RequestBody | false;
};

/* express expects a record for params, but when generating schemas, we want to support object to specify the keys explicitly.
 *  this util transforms an object to a record which is fine
 * */
type ToStringRecord<T> = T extends Record<string, unknown> ? { [K in keyof T]: string } : never;

export type Operation<
    Responses extends { [httpStatus: number]: z.ZodType<object> } = { [httpStatus: number]: z.ZodType<object> },
    RequestBody extends z.Schema | undefined = z.Schema,
    PathParams extends ParamsDictionary | undefined = ParamsDictionary,
    QueryParams extends ParsedQs | undefined = ParsedQs,
    Headers extends z.Schema | undefined = z.Schema,
> = {
    requestValidation?: RequestValidationForOperation<RequestBody, PathParams, QueryParams, Headers> | false;
    responseValidation?:
    | {
        /** All http status codes for json responses must be specified. Unmapped status codes will yield a runtime error. */
        responses?: { [httpStatus in keyof Responses]+?: Responses[httpStatus] | false };
    }
    | false;

    requestMiddlewares?: Array<
        ExpressHandler<Request<ToStringRecord<z.infer<PathParams>>, z.infer<Responses[number]>, z.infer<RequestBody>, ToStringRecord<z.infer<QueryParams>>>>
    >;
    controller: ControllerFn<{ [key in keyof Responses]: z.output<Responses[key]> }, z.infer<RequestBody>, z.infer<PathParams>, z.infer<QueryParams>>;
    responseMiddlewares?: Array<
        ExpressHandler<
            Request<ToStringRecord<z.infer<PathParams>>, z.infer<Responses[number]>, z.infer<RequestBody>, ToStringRecord<z.infer<QueryParams>>>,
            Response<Responses[number]>
        >
    >;
};

type OperationConfig<Op extends Operation<any, any, any, any, any>> = { [key in keyof Op]?: Op[key] | false };

type OperationMap<Ops extends { [key in keyof object]: Operation<any, any, any, any, any> } = { [key in keyof object]: Operation<any, any, any, any, any> }> = {
    [operationId in keyof Ops]: Ops[operationId];
};
type ScopedDefaultConfig<OpMap extends OperationMap> = {
    [key in keyof OpMap]?: (OpMap[key] extends Operation<any, any, any, any, any> ? OperationConfig<OpMap[key]> : never) | false;
};
export type ApiConfig<OpMap extends OperationMap = OperationMap> = {
    /** A controller will evaluate in order defaults.globalConfig, defaults.scopedConfig.operationId, operations.operationId.
     * The defined configs are additive unless explicitly provided false for respective config.
     *
     * @example
     * ```ts
     * // defaults apply to all operations and are additive to concrete operation
     * const petsApiConfig = {
     *   defaults: { globalConfig: { requestValidation: { headers: z.record(z.string())} } }
     *   operations: { fetchPets: createPetsOperation(), createPet: createPetOperation() }
     *  };
     *
     * // opt-out header request validation for fetchPets and only use specification in operations.fetchPets
     * const petsApiConfig = {
     *   defaults: {
     *    globalConfig: { requestValidation: { headers: z.record(z.string())} },
     *    scopedConfig: { fetchPets: {  requestValidation: { headers: false }} }
     *    },
     *   operations: { fetchPets: createPetsOperation(), createPet: createPetOperation() }
     *   };
     *
     * // opt-out entire request validation for fetchPets and only use specification in operations.fetchPets
     * const petsApiConfig = {
     *   defaults: {
     *    globalConfig: { requestValidation: { headers: z.record(z.string())} },
     *    scopedConfig: { fetchPets: {  requestValidation: false } }
     *   },
     *   operations: { fetchPets: createPetsOperation(), createPet: createPetOperation() }
     *    };
     *
     * // disable config for specific scope and only use the specification in operations
     * const petsApiConfig = {
     *   defaults: {
     *    globalConfig: { requestValidation: { headers: z.record(z.string())} },
     *    scopedConfig: { fetchPets: false }
     *   },
     *   operations: { fetchPets: createPetsOperation(), createPet: createPetOperation() }
     *    };
     * ```
     * */
    defaults?: { globalConfig?: OperationConfig<Operation<any, any, any, any, any>>; scopedConfig?: ScopedDefaultConfig<OpMap> };
    operations: OpMap;
};

export class RequestValidationError extends Error {
    public static NAME = "RequestValidationError";

    constructor(
        public location: "body" | "params" | "headers" | "query" | "unknown",
        public validationError: z.ZodError | Error,
    ) {
        super(`Request validation failed for ${location}: ${validationError.message}`);
        this.name = RequestValidationError.NAME;
    }

    get pretty() {
        return this.validationError instanceof z.ZodError ? z.treeifyError(this.validationError) : this.validationError.message;
    }
}

export class ResponseValidationError extends Error {
    public static NAME = "ResponseValidationError";

    constructor(
        public location: "body" | "unknown",
        public validationError: z.ZodError | Error,
    ) {
        super(`Response validation failed for ${location}: ${validationError.message}`);
        this.name = ResponseValidationError.NAME;
    }

    get pretty() {
        return this.validationError instanceof z.ZodError ? z.treeifyError(this.validationError) : this.validationError.message;
    }
}

export class MissingResponseSchemaError extends Error {
    public static NAME = "SchemaNotFoundError";

    constructor(public statusCode: number) {
        super(`No response schema defined for status code statusCode: ${statusCode}`);
        this.name = MissingResponseSchemaError.NAME;
    }
}

export function CreateInputValidator<
    RequestBody extends z.Schema = z.Schema,
    PathParams extends ParamsDictionary = ParamsDictionary,
    QueryParams extends ParsedQs = ParsedQs,
    Headers extends z.Schema = z.Schema,
>(
    requestValidation: RequestValidationForOperation<RequestBody, PathParams, QueryParams, Headers>,
): (
    req: Request<ToStringRecord<z.infer<PathParams>>, unknown, z.infer<RequestBody>, ToStringRecord<z.infer<QueryParams>>>,
    res: Response,
    next: NextFunction,
) => void {
    return (
        req: Request<ToStringRecord<z.infer<PathParams>>, unknown, z.infer<RequestBody>, ToStringRecord<z.infer<QueryParams>>>,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            if (requestValidation.query) {
                const validQuery = requestValidation.query.safeParse(req.query);
                if (!validQuery.success) {
                    return next(new RequestValidationError("query", validQuery.error));
                }
                req.query = validQuery.data as never;
            }
            if (requestValidation.headers) {
                const validHeader = requestValidation.headers.safeParse(req.headers);
                if (!validHeader.success) {
                    return next(new RequestValidationError("headers", validHeader.error));
                }
                req.headers = validHeader.data as never;
            }
            if (requestValidation.params) {
                const validParams = requestValidation.params.safeParse(req.params);
                if (!validParams.success) {
                    return next(new RequestValidationError("params", validParams.error));
                }
                req.params = validParams.data as never;
            }
            if (requestValidation.body) {
                const result = requestValidation.body.safeParse(req.body);
                if (!result.success) {
                    return next(new RequestValidationError("body", result.error));
                }
                req.body = result.data;
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

export function CreateController<TResponses extends Record<number, any>>(
    opController: ControllerFn<any, any, any, any, any>,
    responseValidation: Record<number, z.ZodSchema | false | undefined> | undefined,
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // this is generic. no need for type safety
            const result = await opController(req as never);

            if ("headers" in result && typeof result.headers === "object") {
                Object.entries(result.headers).forEach(([key, value]) => {
                    res.setHeader(key, value);
                });
            }

            if (result.status === 204) {
                // no content
                return res.status(204).send();
            }

            if ("kind" in result && result.kind === "CUSTOM_SENDER") {
                return result.sender(res, next);
            }

            // ********************************
            // zod response schema validation
            // ********************************

            const resultStatus = result.status as number;
            const schema = responseValidation?.[resultStatus];
            if (typeof schema === "undefined") {
                return next(new MissingResponseSchemaError(resultStatus));
            }

            const isResponseValidationDisabled = typeof responseValidation === "undefined" || schema === false;

            if ("error" in result) {
                return next(result.error);
            }

            if ("json" in result) {
                if (isResponseValidationDisabled) {
                    return res.status(resultStatus).json(result.json);
                }

                const response = schema.safeParse(result.json);
                if (response.success) {
                    return res.status(resultStatus).json(response.data);
                }
                return next(new ResponseValidationError("body", response.error));
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

export function withDefaults<T extends Record<string, Operation<any, any, any, any, any>>, Op extends Operation<any, any, any, any, any>>(
    operationId: string,
    operation: Op,
    defaults?: ApiConfig<T>["defaults"],
    generatorConfig?: Pick<Operation<any, any, any, any, any>, "responseValidation" | "requestValidation">,
): Op {
    if (typeof defaults === "undefined" && typeof generatorConfig === "undefined") {
        return operation;
    }

    const globalConfig = defaults?.globalConfig;
    const scopedConfigRaw = defaults?.scopedConfig?.[operationId];
    // scopedConfig can be false (to disable all defaults for this operation), an OperationConfig, or undefined
    const scopedConfig = scopedConfigRaw === false ? undefined : scopedConfigRaw;
    // if scopedConfig is false, then globalConfig is ignored for that operation
    // in this case we only handle the operation level config
    const isConfigDisabledForScope = scopedConfigRaw === false;

    // Helper to merge arrays of middlewares

    function mergeMiddlewares<THandler extends ExpressHandler<any, any, any>>(
        global?: Readonly<Array<THandler>> | false,
        scoped?: Array<THandler> | false,
        operation?: Readonly<Array<THandler>> | false,
    ): Readonly<Array<THandler>> | undefined {
        if (isConfigDisabledForScope) return operation !== false ? operation : undefined;

        if (operation === false) return undefined;
        if (scoped === false) return undefined;

        const result: Array<THandler> = [];
        if (global && Array.isArray(global)) {
            result.push(...global);
        }
        if (scoped && Array.isArray(scoped)) {
            result.push(...scoped);
        }
        if (operation && Array.isArray(operation)) {
            result.push(...operation);
        }
        return result.length > 0 ? (result as Readonly<Array<THandler>>) : undefined;
    }

    function mergeRequestValidation(): RequestValidationForOperation | undefined {
        // explicitly disabled at operation level
        if (operation.requestValidation == false) return undefined;

        if (isConfigDisabledForScope) return operation.requestValidation;
        if (isConfigDisabledForScope) return operation.requestValidation;

        const globalRV = globalConfig?.requestValidation;
        const generatorRV = generatorConfig?.requestValidation;
        const scopedRV = scopedConfig?.requestValidation;
        const opRV = operation.requestValidation;

        function mergeValidationField<Key extends keyof RequestValidationForOperation>(field: Key): RequestValidationForOperation[Key] {
            const operationField = opRV?.[field];
            if (isConfigDisabledForScope || typeof operationField !== "undefined") return operationField;
            if (scopedRV && typeof scopedRV[field] !== "undefined") return scopedRV[field];
            if (generatorRV && typeof generatorRV[field] !== "undefined") return generatorRV[field];
            return globalRV !== false ? globalRV?.[field] : undefined;
        }

        const headers = mergeValidationField("headers");
        const params = mergeValidationField("params");
        const query = mergeValidationField("query");
        const body = mergeValidationField("body");

        if (headers === undefined && params === undefined && query === undefined && body === undefined) {
            return undefined;
        }

        return {
            headers,
            params,
            query,
            body,
        };
    }

    function mergeResponseValidation() {
        const globalRV = globalConfig?.responseValidation;
        const generatorRV = generatorConfig?.responseValidation;
        const scopedRV = scopedConfig?.responseValidation;
        const opRV = operation.responseValidation;

        // explicitly disabled at operation level
        if (opRV === false) return undefined;

        if (typeof scopedRV !== "undefined" && !scopedRV) return opRV;

        if (isConfigDisabledForScope) return opRV;

        const globalResponses = globalRV && typeof globalRV === "object" ? globalRV.responses : undefined;
        const generatorResponses = generatorRV && typeof generatorRV === "object" ? generatorRV.responses : undefined;
        const scopedResponses = scopedRV && typeof scopedRV === "object" ? scopedRV.responses : undefined;
        const opResponses = opRV?.responses;

        // Merge all response status codes
        const merged: { [p: number]: z.Schema | false } = {};
        // Only use global responses if it's not disabled
        if (globalResponses && typeof globalResponses === "object") {
            Object.assign(merged, globalResponses);
        }
        if (generatorResponses && typeof generatorResponses === "object") {
            Object.assign(merged, generatorResponses);
        }
        if (scopedResponses && typeof scopedResponses === "object") {
            Object.assign(merged, scopedResponses);
        }
        if (opResponses && typeof opResponses === "object") {
            Object.assign(merged, opResponses);
        }

        const responses = Object.keys(merged).length > 0 ? merged : undefined;
        if (responses === undefined) {
            return undefined;
        }

        return { responses };
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
    } as Op;
}
