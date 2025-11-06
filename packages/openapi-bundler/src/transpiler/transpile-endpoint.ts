import { oas30 } from "openapi3-ts";
import { _ } from "@dasaplan/ts-sdk";
import { TranspileContext } from "./transpile-context.js";
import { Schema } from "./transpile-schema.js";

export interface Endpoint {
  deprecated: boolean;
  alias: string; // example: getPostComments, operationId
  method: "get" | "post" | "put" | "patch" | "delete";
  description?: string;
  path: string; // example: /posts/:postId/comments/:commentId
  parameters?: Array<Endpoint.Parameter>;
  requestBody?: RequestBody;
  responses: Array<ResponseObj>;
}

export namespace Endpoint {
  export interface Parameter {
    name: string;
    description?: string;
    type: "path" | "query" | "cookie" | "header";
    /** @default type: string */
    schema: Schema;
    isRequired: boolean;
  }
}

export interface TranspileEndpointCtx extends TranspileContext {
  schema(name: string, oaSchema: oas30.SchemaObject | oas30.ReferenceObject): Schema;
}

export namespace TranspileEndpointCtx {
  export function create(resolver: TranspileContext): TranspileEndpointCtx {
    return {
      ...resolver,
      schema(name: string, oaSchema: oas30.SchemaObject | oas30.ReferenceObject): Schema {
        return Schema.transpile(name, oaSchema, resolver);
      },
    };
  }
}
export namespace Endpoint {
  export function transpileAll(ctx: TranspileEndpointCtx): Array<Endpoint> {
    return Object.entries(ctx.resolver.root.paths).flatMap(([path, pathItem]) => {
      const pathItemResolved = ctx.resolver.resolveRef(pathItem);
      if (_.isNil(pathItemResolved)) return [];

      // resolve glob params upfront, so we do not need to resolve them on every route operation
      const globalParameters = pathItemResolved["parameters"];
      const parsedGlobalParameters = _.isDefined(globalParameters) ? parseParameters(globalParameters, ctx) : undefined;

      return (["get", "put", "post", "delete", "patch"] as const)
        .flatMap((operationName) => (_.isDefined(pathItemResolved[operationName]) ? [{ ...pathItemResolved[operationName], method: operationName }] : []))
        .map(({ description, parameters, requestBody, operationId, responses, deprecated, method }) => {
          const parsedOpParameters = parseParameters(parameters, ctx);
          const mergedParameters = mergeParameters(parsedGlobalParameters, parsedOpParameters);
          return {
            alias: operationId ?? "UNKNOWN_REQUIRED_ENDPOINT_NAME",
            deprecated: deprecated ?? false,
            path,
            description,
            method,
            responses: parseResponseBodies(responses, ctx),
            requestBody: parseRequestBody(requestBody, ctx),
            parameters: mergedParameters,
          };
        });
    });
  }
}

const MemeType = {
  TEXT_HTML: "text/html",
  TEXT_PLAIN: "text/plain",
  MULTI_FORM_DATA: "multipart/form-data",
  APP_JSON: "application/json",
  APP_X_FORM: "application/x-www-form-urlencoded",
  APP_OCTET_STREAM: "application/octet-stream",
} as const;
type MemeType = (typeof MemeType)[keyof typeof MemeType];
type RawContentFormat =
  | {
      type: "KNOWN";
      format: MemeType;
    }
  | { type: "UNKNOWN"; format: string };

interface Content {
  format?: "json" | "form-data" | "form-url" | "binary" | "text";
  schema?: Schema;
  rawFormat: RawContentFormat;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequestBody extends Content {}

interface ResponseObj extends Content {
  status?: number;
  description?: string;
}

function parseParameters(parameters: Array<oas30.ParameterObject | oas30.ReferenceObject> | undefined, ctx: TranspileEndpointCtx): Endpoint["parameters"] {
  return (
    parameters?.flatMap((p) => {
      const resolved = ctx.resolver.resolveRef(p);
      if (_.isNil(resolved) || _.isNil(resolved.schema)) return [];
      return [
        {
          type: resolved.in,
          schema: ctx.schema(`${resolved.name}Schema`, resolved.schema),
          name: resolved.name,
          description: resolved.description,
          isRequired: resolved.required ?? false,
        },
      ];
    }) ?? []
  );
}

function parseRequestBody(requestBody: oas30.RequestBodyObject | oas30.ReferenceObject | undefined, ctx: TranspileEndpointCtx): Endpoint["requestBody"] {
  const requestResolved = ctx.resolver.resolveRefOptional(requestBody);
  if (_.isNil(requestResolved)) return;
  const jsonContent = parseJsonFromContent(requestResolved.content, ctx);
  if (_.isNil(jsonContent)) return;
  return jsonContent satisfies Endpoint["requestBody"];
}

function parseResponseBodies(responses: oas30.ResponsesObject | undefined, ctx: TranspileEndpointCtx): Endpoint["responses"] {
  if (_.isNil(responses)) return [];
  return Object.entries(_.omit(responses, "default"))
    .flatMap(([status, responseObj]) => {
      const responseResolved = ctx.resolver.resolveRef(responseObj);
      if (_.isNil(responseResolved)) return;
      const contents = parseContent(responseResolved.content, ctx);
      return (
        contents?.map(
          (content) =>
            ({
              ...content,
              status: _.isDefined(status) ? Number.parseInt(status) : undefined,
              description: responseResolved.description,
            }) satisfies Endpoint["responses"][number],
        ) ?? []
      );
    })
    .filter(_.isDefined);
}

function parseContent(contentMap: oas30.ContentObject | undefined, ctx: TranspileEndpointCtx): Array<Content> | undefined {
  if (_.isNil(contentMap)) return;
  return Object.entries(contentMap).map(([mediaType, mediaTypeObj]) => {
    // const format = Object.values(MemeType).find((d) => d === mediaType);
    const schema = ctx.resolver.resolveRefOptional(mediaTypeObj.schema);
    const contentType = parseContentType(mediaType);
    const format = contentType.type === "KNOWN" ? mapFormat(contentType.format) : undefined;
    if (_.isNil(schema)) {
      return { format, rawFormat: contentType, schema: undefined };
    }
    return {
      format,
      rawFormat: contentType,
      schema: ctx.schema(`${mediaType}Schema`, schema),
    };
  });
}

function parseJsonFromContent(contentMap: oas30.ContentObject | undefined, ctx: TranspileEndpointCtx): (Content & { format: "json" }) | undefined {
  const requestContents = parseContent(contentMap, ctx);
  return requestContents?.find((d): d is Content & { format: "json" } => d.format === "json");
}

function parseContentType(mediaType: string): RawContentFormat {
  const format = Object.values(MemeType).find((d) => d === mediaType);
  if (_.isNil(format)) {
    return { type: "UNKNOWN", format: mediaType };
  }
  return { type: "KNOWN", format };
}

function mapFormat(_format: MemeType): RequestBody["format"] {
  switch (_format) {
    case "text/html":
    case "text/plain":
      return "text";
    case "application/json":
      return "json";
    case "multipart/form-data":
      return "form-data";
    case "application/x-www-form-urlencoded":
      return "form-url";
    case "application/octet-stream":
      return "binary";
  }
}

/**
 * Merges global (path-level) and operation-level parameters.
 * Operation-level parameters override global parameters based on name and location (in).
 */
function mergeParameters(
  globalParams: Array<Endpoint.Parameter> | undefined,
  operationParams: Array<Endpoint.Parameter> | undefined,
): Array<Endpoint.Parameter> | undefined {
  if (_.isNil(globalParams) && _.isNil(operationParams)) return undefined;
  if (_.isNil(globalParams)) return operationParams;
  if (_.isNil(operationParams)) return globalParams;

  // Filter global parameters, excluding those that are overridden by operation parameters
  const filteredGlobalParams = globalParams.filter((globalResolved) => {
    // Check if this global parameter is overridden by any operation parameter
    const isOverridden = operationParams.some((opParam) => opParam.name === globalResolved.name && opParam.type === globalResolved.type);
    return !isOverridden;
  });

  // Combine filtered global parameters with operation parameters
  return [...filteredGlobalParams, ...operationParams];
}
