/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars */

import { OpenApiBundled } from "../../bundle.js";
import { oas30 } from "openapi3-ts";

import { _, ApplicationError } from "@dasaplan/ts-sdk";
import { cleanObj, SchemaResolverContext, WithOptionalRef } from "../../resolver/index.js";
import { isRef } from "@redocly/openapi-core";
import { appLog } from "../../logger.js";
import { tryMergeSchemas } from "./merge-all-of.js";

export type XOmitConfig = {
  required?: Array<string> | boolean;
  properties?: Record<string, boolean | XOmitConfig> | boolean;
} & {
  [prop in Exclude<keyof oas30.SchemaObject, "required" | "properties">]?: boolean;
};

type OmitCtx = SchemaResolverContext & { maxRecursionDepths: number };

export function xOmitDeep(bundled: OpenApiBundled) {
  const log = appLog.childLog(xOmitDeep);

  const omitted = _.cloneDeep(bundled);
  const { collected, ctx } = findSchemaObjectsWithXOmit(omitted);
  log.info(`xOmit. Omitting fields in ${collected.length} schemas`);
  log.debug(`xOmit. Omitting in schemas: ${collected.map((s) => s.id).join(", ")}`);
  collected.forEach((s, idx, all) => {
    try {
      doOmitDeep(s, { ...ctx, maxRecursionDepths: 10 });
    } catch (e) {
      throw ApplicationError.create(`failed to omit fields for schema.id ${s.id}`).chainUnknown(e);
    }
  });
  return omitted;
}

function doOmitDeep({ schema, id }: { id: string; schema: any }, ctx: OmitCtx) {
  if (_.isEmpty(schema.allOf)) {
    // resolve x-omit in schema: after mergeAllOf it could be the case that there is no allOf anymore
    const omitted = applyOmit({ id, merged: schema }, ctx);
    delete (omitted as any)["x-omit"];
    Object.assign(cleanObj(schema), omitted);
    return;
  }

  // resolve x-omit in allOf array
  const subSchemas: Array<oas30.ReferenceObject | oas30.SchemaObject> = schema.allOf ?? [];
  const resolvedSchemas = _.cloneDeep(resolveSubSchemas(_.cloneDeep(subSchemas), ctx));
  resolvedSchemas.reverse();

  // we need to incrementally merge schemas and apply x-omit because we have cases where we use x-omit to remove incompatible subschemas.
  // e.g. merging A and B only works if we omit A.a
  //  => A{a: {type: object}, b: {type: number}}, B{a: {type: array}}
  //  => B{a: {type: array}, b: {type: number}}
  let merged: oas30.SchemaObject | undefined = undefined;
  while (resolvedSchemas.length > 0) {
    const next = resolvedSchemas.pop();
    if (_.isNil(merged) && _.isDefined(next)) {
      merged = next.resolved;
      continue;
    }
    if (_.isNil(merged) || _.isNil(next)) {
      continue;
    }

    if (_.isNil(next.resolved["x-omit"])) {
      merged = tryMergeSchemas([merged, next.resolved]);
      continue;
    }

    merged = applyOmit({ id, merged: { ...merged, ...next.resolved } }, ctx);
  }

  // merge an omit everything
  delete (merged as any)["x-omit"];
  Object.assign(cleanObj(schema), merged);
}

function applyOmit<T>(args: { id: string; merged: WithOptionalRef<oas30.SchemaObject> }, ctx: OmitCtx) {
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
    omitted.required = omitted.required?.filter((e) => !requiredToRemove?.includes(e));
    if (merged.required?.length === omitted.required) {
      log.warn(
        `Nothing to omit. The required array of schema.id ${args.id} does not include any defined values to omit. required(omit): ${requiredToRemove?.join(
          ",",
        )}  `,
      );
    }
  }

  // omit properties
  if (typeof omitConfig.properties === "boolean") {
    if (omitConfig.properties) {
      delete omitted.properties;
    }
  } else if (!_.isEmpty(omitConfig.properties)) {
    const propsToRemove = omitConfig.properties;
    omitted.properties = Object.entries(omitted.properties ?? {}).reduce((acc, [key, val]) => {
      const toRemove = propsToRemove[key];
      if (_.isNil(toRemove)) {
        return acc;
      }

      if (typeof toRemove === "boolean") {
        // filter out entry to remove
        delete (acc as never)[key];
        return acc;
      }

      if (toRemove.properties) {
        if (!isRef(val)) {
          throw ApplicationError.create(
            `You tried to deeply omit a property from "${args.id}".${key}. Deeply omit expects a reference to an object but ${key} is ${JSON.stringify(
              val,
            )}. The omit config was: ${JSON.stringify(omitConfig)}`,
          );
        }
        // nested omit => recurse !could endless loop...failure case? / iterative?
        const res = ctx.resolver.resolveRefImmutable<oas30.SchemaObject>(val, { deleteRef: false });
        const resolved = _.cloneDeep(res);

        // recursion!
        ApplicationError.assert(
          ctx.maxRecursionDepths > 0,
          `reached maximum recursion depths for deep omit. The omit config was: ${JSON.stringify(omitConfig)}`,
        );
        doOmitDeep({ id: val.$ref, schema: { ...resolved, "x-omit": resolved } }, ctx);
        return { ...acc, [key]: resolved };
      }

      return acc;
    }, _.cloneDeep(omitted.properties));
  }

  // omit all other fields
  const configWithoutPropsRequired = _.omit(omitConfig, "properties", "required");

  return Object.entries(omitted).reduce(
    (acc, [key, val]) => {
      const toRemove = configWithoutPropsRequired[key as keyof typeof configWithoutPropsRequired];
      if (_.isDefined(toRemove) && toRemove) {
        // filter out entry to remove
        return acc;
      }
      return { ...acc, [key]: val };
    },
    _.pick(omitted, "properties", "required"),
  );
}

function resolveSubSchemas(
  subSchemas: Array<oas30.ReferenceObject | oas30.SchemaObject>,
  ctx: SchemaResolverContext,
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
    (s) => _.isDefined(s.schema["x-omit"]) || s.schema.allOf?.some((e) => (isRef(e) ? false : _.isDefined(e["x-omit"]))),
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
