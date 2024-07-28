/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars */

import { OpenApiBundled } from "../../bundle.js";
import { oas30 } from "openapi3-ts";

import jsonSchemaMergeAllOff from "json-schema-merge-allof";
import { _, ApplicationError } from "@dasaplan/ts-sdk";
import { SchemaResolverContext } from "../../resolver/index.js";

export type XOmitConfig = {
  required: Array<string> | boolean;
  properties: Record<string, boolean> | boolean;
} & {
  [prop in Exclude<keyof oas30.SchemaObject, "required" | "properties">]?: boolean;
};

export function mergeXOmit(a: Partial<XOmitConfig>, b: Partial<XOmitConfig>) {
  let merged = { ...a, ...b };

  if (typeof a.required === "boolean" || typeof b.required === "boolean") {
    const omitRequired = typeof a.required === "boolean" ? a.required : typeof b.required === "boolean" ? b.required : false;
    merged = { ...merged, required: omitRequired };
  } else if (a.required || b.required) {
    merged = { ...merged, required: [...(a?.required ?? []), ...(b?.required ?? [])] };
  }

  if (typeof a.properties === "boolean" || typeof b.properties === "boolean") {
    const omitProps = typeof a.properties === "boolean" ? a.properties : typeof b.properties === "boolean" ? b.properties : false;
    merged = { ...merged, properties: omitProps };
  } else if (a.properties || b.properties) {
    merged = { ...merged, properties: { ...(a?.properties ?? {}), ...(b?.properties ?? {}) } };
  }

  return merged;
}

// todo
export function xOmit(bundled: OpenApiBundled) {
  const mergedAllOf = _.cloneDeep(bundled);
  const { collected, ctx } = findSchemaObjectsWithAllOf(mergedAllOf);
  collected.forEach((s, idx, all) => {
    try {
      //
    } catch (e) {
      throw ApplicationError.create(`failed to merge allOf for schema.id ${s.id}`).chainUnknown(e);
    }
  });
  return mergedAllOf;
}

function getJsonSchemaMergeAllOff(
  subschemas: Array<{
    pointer: string | undefined;
    resolved: oas30.SchemaObject;
  }>
) {
  try {
    return jsonSchemaMergeAllOff(
      { allOf: subschemas.map((s) => s.resolved) },
      {
        resolvers: {
          // overwrite title by higher indexed schema: [ {title: a}, {title:b}] => {title:b}
          // default title means take first occurance
          defaultResolver: jsonSchemaMergeAllOff.options.resolvers.title,
        },
      }
    );
  } catch (e: unknown) {
    throw ApplicationError.create("failed merging allOf sub schemas").chainUnknown(e);
  }
}

function findSchemaObjectsWithAllOf(bundled: OpenApiBundled) {
  const resolver = SchemaResolverContext.create(bundled);
  const collected = resolver.schemas.filter((s) => _.isDefined(s.schema.allOf));
  return { collected, ctx: resolver };
}
