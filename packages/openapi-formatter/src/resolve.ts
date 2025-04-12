/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import swagger from "@apidevtools/swagger-parser";
import { ApplicationError, File } from "@dasaplan/ts-sdk";
import { appLog } from "./logger.js";
import { Oas3Schema, Oas3Definition } from "@redocly/openapi-core";
import { OpenApiBundled } from "@dasaplan/openapi-bundler";

export interface AnySchema extends Oas3Schema, Partial<Oas3Definition> {}
export type ResolvedSpec = Awaited<ReturnType<typeof resolveSpec>>;

export async function resolveSpec(filePath: File) {
  const resolved = await swagger.resolve(filePath.absolutePath);
  const refs = resolved.paths();
  const mapped = refs.map((refFile) => {
    const getFile = () => resolved.get(refFile);
    const updateFile = (obj: object) => resolved.set(refFile, obj);
    const schemas = resolveSchemas(getFile());
    return { refFile, schemas, getFile, updateFile };
  });

  appLog.childLog(resolveSpec).info("done");

  return mapped;
}

export async function resolveOpenapi(doc: OpenApiBundled) {
  const resolved = await swagger.resolve(doc as never);
  const refs = resolved.paths();
  const mapped = refs.map((refFile) => {
    const getFile = () => resolved.get(refFile);
    const updateFile = (obj: object) => resolved.set(refFile, obj);
    const schemas = resolveSchemas(getFile());
    return { refFile, schemas, getFile, updateFile };
  });

  appLog.childLog(resolveSpec).info("done");

  return mapped;
}

export interface Parsed {
  schema: AnySchema;
  path: Array<string>;
}

export function resolveSchemas(obj: unknown, ctx: { basePath: Array<string> } = { basePath: [] }) {
  const log = appLog.childLog(resolveSchemas);
  if (!InferOa.isObj(obj)) {
    return []; // Base case: not an object
  }
  if (InferOa.hasRef(obj)) {
    return [];
  }

  let refs: Parsed[] = [];
  const inferred = InferOa.inferPath(obj, ctx.basePath);
  if (inferred.kind === "SCHEMA" || InferOa.isInlineSchema(obj)) {
    refs.push({
      schema: obj,
      path: ctx.basePath,
    });
  }

  // Recursively explore nested objects
  for (const key in obj) {
    const currentPath = [...ctx.basePath, key];
    const next = (obj as any)[key];
    refs = refs.concat(resolveSchemas(next, { ...ctx, basePath: currentPath }));
  }
  return refs;
}

export namespace InferOa {
  export function inferPath(obj: unknown, path: Array<string>): { kind: "UNKNOWN" | "SCHEMA" | "COMPONENT"; value: unknown } {
    const pathStr = path.join(".");
    if (pathStr.endsWith(".schema")) {
      return { kind: "SCHEMA", value: obj };
    }
    if (pathStr.includes("components.schemas.") && path.length === 3) {
      return { kind: "SCHEMA", value: obj };
    }
    if (pathStr.includes("components.") && path.length === 3) {
      return { kind: "COMPONENT", value: obj };
    }
    return { kind: "UNKNOWN", value: obj };
  }

  export function isInlineSchema<T extends object>(obj: T): obj is T & AnySchema {
    if (!isObj(obj) || hasRef(obj)) {
      return false;
    }
    const keys = Object.keys(obj);

    const hasSchemaDistinctProps = hasProperties(obj) || hasRequired(obj) || isProperty(obj) || hasXOf(obj);
    return hasSchemaDistinctProps || hasSchemaType(obj);
  }

  export function isObj(obj: unknown): obj is object {
    return typeof obj === "object" && obj !== null;
  }

  export function hasRef<T extends object>(obj: T): obj is T & { $ref: string } {
    return "$ref" in obj && typeof obj.$ref === "string";
  }

  export function hasSchemaType<T extends object>(obj: T): obj is T & { type: string } {
    return "type" in obj && typeof obj.type === "string" && ["array", "string", "object", "number", "integer", "boolean"].includes(obj.type);
  }

  export function hasRequired<T extends object>(obj: T): obj is T & { required: Array<string> } {
    return "required" in obj && typeof obj.required === "object" && Array.isArray(obj.required);
  }

  export function hasXOf<T extends object>(obj: T): obj is T & { required: Array<string> } {
    const keys = Object.keys(obj);
    return ["allOf", "oneOf", "anyOf"].some((propKey) => keys.includes(propKey));
  }

  export function hasProperties<T extends object>(obj: T): obj is T & { properties: object } {
    return "properties" in obj && typeof obj.properties === "object";
  }

  export function isProperty<T extends object>(obj: T): obj is T & { properties: object } {
    const keys = Object.keys(obj);
    return [
      "maximum",
      "exclusiveMaximum",
      "minimum",
      "exclusiveMinimum",
      "maxLength",
      "minLength",
      "pattern",
      "maxItems",
      "minItems",
      "uniqueItems",
      "maxProperties",
      "minProperties",
      "enum",
    ].some((propKey) => keys.includes(propKey));
  }
}

function mutResolvePath(file: object, basePath: Array<string>) {
  return basePath.reduce((acc, curr) => {
    if (!(curr in acc)) {
      throw ApplicationError.create(`could not resolve path: ${basePath}`);
    }
    return acc[curr as never];
  }, file);
}

function pathToJsonPath(pathSegments: Array<string>) {
  return pathSegments.map(encodeSegmentToJsonPath).join("/");
}

function encodeSegmentToJsonPath(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
