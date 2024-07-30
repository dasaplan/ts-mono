/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars */

import { OpenApiBundled } from "../../bundle.js";
import { oas30 } from "openapi3-ts";

import jsonSchemaMergeAllOff from "json-schema-merge-allof";
import { _, ApplicationError } from "@dasaplan/ts-sdk";
import { cleanObj, SchemaResolverContext } from "../../resolver/index.js";
import { isRef } from "@redocly/openapi-core";
import { appLog } from "../../logger.js";
import { mergeSubSchemas } from "./merge-all-of.js";

export type XOmitConfig = {
  required: Array<string> | boolean;
  properties: Record<string, boolean> | boolean;
} & {
  [prop in Exclude<keyof oas30.SchemaObject, "required" | "properties">]?: boolean;
};

type WithOmit<T> = T & { "x-omit": Partial<XOmitConfig> };
// todo
export function xOmit(bundled: OpenApiBundled) {
  const log = appLog.childLog(xOmit);

  const omitted = _.cloneDeep(bundled);
  const { collected, ctx } = findSchemaObjectsWithXOmit(omitted);
  log.info(`xOmit. Omitting fields in ${collected.length} schemas`);
  log.debug(`xOmit. Omitting in schemas: ${collected.map((s) => s.id).join(", ")}`);
  collected.forEach((s, idx, all) => {
    try {
      doOmit(s, ctx);
    } catch (e) {
      throw ApplicationError.create(`failed to omit fields for schema.id ${s.id}`).chainUnknown(e);
    }
  });
  return omitted;
}

function doOmit({ schema, id }: { id: string; schema: any }, ctx: SchemaResolverContext) {
  if (_.isEmpty(schema.allOf)) {
    // resolve x-omit in schema: after mergeAllOf it could be the case that there is no allOf anymore
    const omitted = applyOmit({ id, schema, merged: schema });
    delete (omitted as any)["x-omit"];
    Object.assign(cleanObj(schema), omitted);
    return;
  }

  // resolve x-omit in allOf array
  const subSchemas: Array<oas30.ReferenceObject | oas30.SchemaObject> = schema.allOf ?? [];
  const resolvedSchemas = _.cloneDeep(resolveSubSchemas(_.cloneDeep(subSchemas), ctx));

  // merge an omit everything
  const merged = mergeSubSchemas(resolvedSchemas, ctx)?.resolved;
  const omitted = applyOmit({ id, schema, merged });
  delete (omitted as any)["x-omit"];
  Object.assign(cleanObj(schema), omitted);
}

function applyOmit<T>(args: { id: string; schema: T; merged: WithOmit<T> }) {
  const log = appLog.childLog(applyOmit);

  const merged: oas30.SchemaObject = args.merged;
  const omitConfig: XOmitConfig = merged["x-omit"];
  if (_.isNil(omitConfig)) {
    return;
  }
  const omitted: oas30.SchemaObject = _.cloneDeep(merged);

  // omit required
  if (typeof omitConfig.required === "boolean") {
    delete omitted.required;
  } else if (!_.isEmpty(omitConfig.required)) {
    const requiredToRemove = omitConfig.required;
    omitted.required = omitted.required?.filter((e) => !requiredToRemove.includes(e));
    if (merged.required?.length === omitted.required) {
      log.warn(
        `Nothing to omit. The required array of schema.id ${args.id} does not include any defined values to omit. required(omit): ${requiredToRemove.join(
          ","
        )}  `
      );
    }
  }

  // omit properties
  if (typeof omitConfig.properties === "boolean") {
    delete omitted.properties;
  } else if (!_.isEmpty(omitConfig.properties)) {
    const propsToRemove = omitConfig.properties;
    omitted.properties = Object.entries(omitted.properties ?? {}).reduce((acc, [key, val]) => {
      const toRemove = propsToRemove[key];
      if (_.isDefined(toRemove) && toRemove) {
        // filter out entry to remove
        return acc;
      }
      return { ...acc, [key]: val };
    }, {});
  }

  // omit all other fields
  const configWithoutPropsRequired = _.omit(omitConfig, "properties", "required");

  return Object.entries(omitted).reduce((acc, [key, val]) => {
    const toRemove = configWithoutPropsRequired[key as keyof typeof configWithoutPropsRequired];
    if (_.isDefined(toRemove) && toRemove) {
      // filter out entry to remove
      return acc;
    }
    return { ...acc, [key]: val };
  }, _.pick(omitted, "properties", "required"));
}

function resolveSubSchemas(
  subSchemas: Array<oas30.ReferenceObject | oas30.SchemaObject>,
  ctx: SchemaResolverContext
): Array<{
  pointer: string | undefined;
  resolved: oas30.SchemaObject & { $ref?: string };
}> {
  const subs = subSchemas.map((d) => {
    return resolveRefNode(d, ctx, { deleteRef: true });
  });
  const allOfs = subs.flatMap((s) => s.resolved.allOf ?? []);
  if (_.isEmpty(allOfs)) {
    return subs;
  }
  const flatten = resolveSubSchemas(allOfs, ctx);
  return [...flatten, ...subs].map((s) => ({
    pointer: s.pointer,
    resolved: _.omit(s.resolved, "allOf"),
  }));
}

function resolveRefNode(data: { $ref: string } | unknown, ctx: SchemaResolverContext, params?: { deleteRef: boolean }) {
  if (!isRef(data)) {
    return {
      pointer: undefined,
      resolved: ctx.resolver.resolveRefImmutable(data as oas30.SchemaObject, params),
    };
  }
  return {
    pointer: data["$ref"],
    resolved: ctx.resolver.resolveRefImmutable(data, params),
  };
}

function findSchemaObjectsWithXOmit(bundled: OpenApiBundled) {
  const resolver = SchemaResolverContext.create(bundled);
  const collected = resolver.schemas.filter(
    (s) => _.isDefined(s.schema["x-omit"]) || s.schema.allOf?.some((e) => (isRef(e) ? false : _.isDefined(e["x-omit"])))
  );
  return { collected, ctx: resolver };
}

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
