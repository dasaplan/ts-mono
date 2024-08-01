/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars */

import { OpenApiBundled } from "../../bundle.js";
import { oas30 } from "openapi3-ts";

import { _, ApplicationError } from "@dasaplan/ts-sdk";
import { cleanObj, SchemaResolverContext } from "../../resolver/index.js";
import { isRef } from "@redocly/openapi-core";
import { appLog } from "../../logger.js";
import { mergeSubSchemas } from "./merge-all-of.js";

export type XPickConfig = {
  required?: Array<string> | boolean;
  properties?: Record<string, boolean | XPickConfig> | boolean;
} & {
  [prop in Exclude<keyof oas30.SchemaObject, "required" | "properties">]?: boolean;
};

type PickCtx = SchemaResolverContext & { maxRecursionDepths: number };

type WithPick<T> = T & { "x-pick": Partial<XPickConfig> };
export function xPick(bundled: OpenApiBundled) {
  const log = appLog.childLog(xPick);

  const picked = _.cloneDeep(bundled);
  const { collected, ctx } = findSchemaObjectsWithXPick(picked);
  log.info(`xPick. Picking fields in ${collected.length} schemas`);
  log.debug(`xPick. Picking in schemas: ${collected.map((s) => s.id).join(", ")}`);
  collected.forEach((s, idx, all) => {
    try {
      doPick(s, { ...ctx, maxRecursionDepths: 10 });
    } catch (e) {
      throw ApplicationError.create(`failed to pick fields for schema.id ${s.id}`).chainUnknown(e);
    }
  });
  return picked;
}

function doPick({ schema, id }: { id: string; schema: any }, ctx: PickCtx) {
  if (_.isEmpty(schema.allOf)) {
    // resolve x-pick in schema: after mergeAllOf it could be the case that there is no allOf anymore
    const picked = applyPick({ id, schema, merged: schema }, ctx);
    delete (picked as any)["x-pick"];
    Object.assign(cleanObj(schema), picked);
    return;
  }

  // resolve x-pick in allOf array
  const subSchemas: Array<oas30.ReferenceObject | oas30.SchemaObject> = schema.allOf ?? [];
  const resolvedSchemas = _.cloneDeep(resolveSubSchemas(_.cloneDeep(subSchemas), ctx));

  const merged = mergeSubSchemas(resolvedSchemas, ctx)?.resolved;
  const picked = applyPick({ id, schema, merged }, ctx);
  delete (picked as any)["x-pick"];
  Object.assign(cleanObj(schema), picked);
}

function applyPick<T>(args: { id: string; schema: T; merged: WithPick<T> }, ctx: PickCtx) {
  const log = appLog.childLog(applyPick);

  const merged: oas30.SchemaObject = args.merged;
  const pickConfig: XPickConfig = merged["x-pick"];
  if (_.isNil(pickConfig)) {
    return;
  }
  const picked: oas30.SchemaObject = _.cloneDeep(merged);

  // pick required
  if (typeof pickConfig.required === "boolean") {
    // nothing to do - we will take the whole required array
  } else if (!_.isEmpty(pickConfig.required)) {
    const requiredToPick = pickConfig.required;
    picked.required = picked.required?.filter((e) => requiredToPick?.includes(e));
    if (merged.required?.length === picked.required) {
      log.warn(
        `Nothing to pick. The required array of schema.id ${args.id} does not include any defined values to pick. required(pick): ${requiredToPick?.join(
          ","
        )}  `
      );
    }
  }

  // pick properties
  if (typeof pickConfig.properties === "boolean") {
    // nothing to do - we will take the whole
  } else if (!_.isEmpty(pickConfig.properties)) {
    const propsToPick = pickConfig.properties;
    picked.properties = Object.entries(picked.properties ?? {}).reduce((acc, [key, val]) => {
      const toPick = propsToPick[key];
      if (_.isDefined(toPick) && toPick) {
        // filter in entry to pick
        return { ...acc, [key]: val };
      }
      return acc;
    }, {});
  }

  // pick all other fields
  const configWithoutPropsRequired = _.omit(pickConfig, "properties", "required");

  return Object.entries(picked).reduce((acc, [key, val]) => {
    const toPick = configWithoutPropsRequired[key as keyof typeof configWithoutPropsRequired];
    if (_.isDefined(toPick) && toPick) {
      // filter in entry to remove
      return { ...acc, [key]: val };
    }
    return acc;
  }, _.pick(picked, "properties", "required"));
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

function findSchemaObjectsWithXPick(bundled: OpenApiBundled) {
  const resolver = SchemaResolverContext.create(bundled);
  const collected = resolver.schemas.filter(
    (s) => _.isDefined(s.schema["x-pick"]) || s.schema.allOf?.some((e) => (isRef(e) ? false : _.isDefined(e["x-pick"])))
  );
  return { collected, ctx: resolver };
}

export function mergeXPick(a: Partial<XPickConfig>, b: Partial<XPickConfig>) {
  let merged = { ...a, ...b };

  if (typeof a.required === "boolean" || typeof b.required === "boolean") {
    const pickRequiered = typeof a.required === "boolean" ? a.required : typeof b.required === "boolean" ? b.required : false;
    merged = { ...merged, required: pickRequiered };
  } else if (a.required || b.required) {
    merged = { ...merged, required: a?.required ?? b?.required };
  }

  if (typeof a.properties === "boolean" || typeof b.properties === "boolean") {
    const pickProps = typeof a.properties === "boolean" ? a.properties : typeof b.properties === "boolean" ? b.properties : false;
    merged = { ...merged, properties: pickProps };
  } else if (a.properties || b.properties) {
    merged = { ...merged, properties: a?.properties ?? b?.properties };
  }

  return merged;
}
