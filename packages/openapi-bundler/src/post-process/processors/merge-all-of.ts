/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars */

import { OpenApiBundled } from "../../bundle.js";
import { oas30 } from "openapi3-ts";

import jsonSchemaMergeAllOff from "json-schema-merge-allof";
import { isRef } from "@redocly/openapi-core";
import { appLog } from "../../logger.js";
import { _, ApplicationError } from "@dasaplan/ts-sdk";
import { cleanObj, SchemaResolverContext } from "../../resolver/index.js";
import { mergeXOmit, XOmitConfig } from "./x-omit-deep.js";

export function mergeAllOf(bundled: OpenApiBundled) {
  const log = appLog.childLog(mergeAllOf);

  const mergedAllOf = _.cloneDeep(bundled);
  const { collected, ctx } = findSchemaObjectsWithAllOf(mergedAllOf);
  log.info(`mergeAllOf. Merging allOf arrays in ${collected.length} schemas`);
  log.debug(`mergeAllOf. Merging in schemas: ${collected.map((s) => s.id).join(", ")}`);

  collected.forEach((s) => {
    try {
      doMerge(s, ctx);
    } catch (e) {
      throw ApplicationError.create(`failed to merge allOf for schema.id ${s.id}`).chainUnknown(e);
    }
  });
  return mergedAllOf;
}

function doMerge({ schema, id }: { id: string; schema: any }, ctx: SchemaResolverContext) {
  const log = appLog.childLog(doMerge);
  const subSchemas: Array<oas30.ReferenceObject | oas30.SchemaObject> = schema.allOf ?? [];
  // include dangling properties {allOf: [], danglingA: {}, danglingB: [], danglingC: null, ... }
  const danglingProperties = { ..._.omit(schema, "allOf") };
  if (!_.isEmpty(danglingProperties)) {
    log.debug(`danglingProperties. fixing dangling properties for schema.id ${id} - moving all properties into allOf array`);
    schema.allOf?.push(danglingProperties);
    cleanObj(schema, ["allOf"]);
  }
  // when we merge allOf array, we do not want to mutate referenced entities
  // omitting clone will mutate "schema"
  const clonedSchemas = _.cloneDeep(subSchemas);
  // omitting clone will mutate cached references
  const resolvedSchemas = _.cloneDeep(resolveSubSchemas(clonedSchemas, ctx));
  if (!_.isEmpty(danglingProperties)) {
    resolvedSchemas.push({ pointer: undefined, resolved: danglingProperties });
  }
  const hasOneOfOrAnyOf = resolvedSchemas.filter((f) => !_.isEmpty(f.resolved.oneOf) || !_.isEmpty(f.resolved.anyOf))?.length > 0;
  if (hasOneOfOrAnyOf) {
    throw ApplicationError.create(`unsupported allOf element. anyOf or oneOf are yet not supported as an allOf subschema: ${JSON.stringify(schema)}`);
  }

  // scenario(real inheritance): a allOf.element holds a ref where the target has a discriminator
  const parentsWithDiscriminator = resolvedSchemas.filter((p) => _.isDefined(p.pointer) && _.isDefined(p.resolved.discriminator));

  // scenario(composition): a allOf.element is a schema
  const resolvedSchemasWithoutDiscriminator = resolvedSchemas.filter((p) => !_.isDefined(p.resolved.discriminator));

  // scenario(composition of a base schema): a allOf.element defines a schema with a discriminator by reference and inlined
  const inlinesWithDiscriminator = resolvedSchemas.filter((p) => !_.isDefined(p.pointer) && _.isDefined(p.resolved.discriminator));
  if (parentsWithDiscriminator.length == 1 && inlinesWithDiscriminator.length > 0) {
    // we may have an allOf expressing inheritance and multiple schemas we need to merge (while keeping inherited schema)
    const mergedWithInlineParent = mergeSubSchemas([...inlinesWithDiscriminator, ...resolvedSchemasWithoutDiscriminator], ctx);
    // build hierarchy
    schema.allOf = [{ $ref: parentsWithDiscriminator[0].pointer }, mergedWithInlineParent.resolved];
    return schema;
  }
  if (resolvedSchemas.length < 1) {
    // something is off: could be a schema with a single allOf or an allOf comprised of multiple discriminators...
    log.warn(`found allOf with single element in schema.id '${id}': ${JSON.stringify(schema)}`);
    return schema;
  }

  if (parentsWithDiscriminator.length == 1 && resolvedSchemasWithoutDiscriminator.length == 1) {
    // we may have an allOf expressing inheritance - most tooling can handle two allOfs
    return schema;
  }

  if (parentsWithDiscriminator.length == 1 && resolvedSchemasWithoutDiscriminator.length > 1) {
    // we may have an allOf expressing inheritance and multiple schemas we need to merge (while keeping inherited schema)
    const merged = mergeSubSchemas(resolvedSchemasWithoutDiscriminator, ctx);
    // build hierarchy
    schema.allOf = [{ $ref: parentsWithDiscriminator[0].pointer }, merged.resolved];
    return schema;
  }

  if (parentsWithDiscriminator.length > 1) {
    // we may have an allOf expressing multiple inheritance we will try to find a common base

    const merged = mergeSubSchemas(resolvedSchemasWithoutDiscriminator, ctx);
    // build hierarchy
    const hierarchy = parentsWithDiscriminator.reduce((acc, curr) => {
      return { allOf: [{ $ref: curr.pointer }, acc] };
    }, merged.resolved);
    delete schema["$ref"];
    Object.assign(schema, hierarchy);
    return schema;
  }

  if (parentsWithDiscriminator.length < 1) {
    // we only have schemas which we can merge together
    const merged = mergeSubSchemas(resolvedSchemasWithoutDiscriminator, ctx);
    Object.assign(schema, merged.resolved);
    delete schema["allOf"];
    delete schema["$ref"];
    return schema;
  }

  throw "Error: should not have been reached";
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

function getJsonSchemaMergeAllOff<T extends oas30.SchemaObject>(
  subschemas: Array<{
    pointer: string | undefined;
    resolved: T;
  }>
): T {
  try {
    return jsonSchemaMergeAllOff<oas30.SchemaObject & { "x-omit"?: XOmitConfig }>(
      { allOf: subschemas.map((s) => s.resolved) },
      {
        resolvers: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          additionalProperties: (values, path, mergeSchemas, options) => {
            return jsonSchemaMergeAllOff.options.resolvers.additionalProperties(values, path, mergeSchemas, options);
          },
          // overwrite title by higher indexed schema: [ {title: a}, {title:b}] => {title:b}
          // default title means take first occurance
          defaultResolver: (values, path, mergeSchemas, options) => {
            if (path?.[0] === "x-omit") {
              const [a, b] = values;
              return mergeXOmit(a, b);
            }

            if (options.resolvers?.title) {
              // use configured resolver
              return options.resolvers.title(values, path, mergeSchemas, options);
            }
            // use fallback resolver
            return jsonSchemaMergeAllOff.options.resolvers.title(values, path, mergeSchemas, options);
          },
        },
      }
    ) as T;
  } catch (e: unknown) {
    throw ApplicationError.create("failed merging allOf sub schemas").chainUnknown(e);
  }
}

export function mergeSubSchemas(
  _resolvedSchemas: Array<{
    pointer: string | undefined;
    resolved: oas30.SchemaObject;
  }>,
  ctx: SchemaResolverContext
) {
  const subschemas = _resolvedSchemas.map((d) => ({
    pointer: d.pointer,
    resolved: ctx.resolver.resolveRefImmutable(d.resolved, { deleteRef: true }),
  }));

  const merged = getJsonSchemaMergeAllOff(subschemas.reverse());
  // clean references in properties
  Object.values(merged.properties ?? {}).forEach((propValue) => {
    if (!isRef(propValue) || _.isEmpty(_.omit(propValue, "$ref"))) {
      // property is either a ref or an object => that is fine
      return;
    }
    // we have both a ref and an object. We try to keep the ref, if the content is identical
    const schema = {
      pointer: undefined,
      resolved: _.cloneDeep(_.omit(propValue, "$ref")),
    };
    const referenced = resolveRefNode(propValue, ctx, { deleteRef: false });
    if (_.isEqual(schema.resolved, referenced.resolved)) {
      cleanObj(propValue, []);
      Object.assign(propValue, { $ref: referenced.pointer });
      return;
    }
    Object.assign(propValue, getJsonSchemaMergeAllOff([schema, referenced]));
    delete (propValue as never)["$ref"];
  });
  return {
    pointer: undefined,
    resolved: merged,
  };
}

function findSchemaObjectsWithAllOf(bundled: OpenApiBundled) {
  const resolver = SchemaResolverContext.create(bundled);
  const collected = resolver.schemas.filter((s) => _.isDefined(s.schema.allOf));
  return { collected, ctx: resolver };
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
