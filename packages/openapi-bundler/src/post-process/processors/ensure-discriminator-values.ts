import { OpenApiBundled } from "../../bundle.js";
import { oas30 } from "openapi3-ts";
import { isRef } from "@redocly/openapi-core";
import { appLog } from "../../logger.js";
import { _, ApplicationError } from "@dasaplan/ts-sdk";
import { SchemaResolverContext } from "../../resolver/index.js";

export function ensureDiscriminatorValues(bundled: OpenApiBundled) {
  const oneOfSchemas = findSchemaObjectsWithOneOf(bundled);

  oneOfSchemas.collected.map((collected) => {
    try {
      ensure(collected.schema, oneOfSchemas.ctx);
    } catch (e) {
      throw ApplicationError.create(
        `failed ensuring all oneOf sub schemas have expected discriminator values schema.id ${collected.id}`
      ).chainUnknown(e);
    }
  });
  appLog
    .childLog("ensureDiscriminatorValues")
    .info(
      "ensured discriminator values of %s schemas for all oneOf subschemas based on values defined in discriminator.mapping",
      oneOfSchemas.collected.length
    );
  return bundled;
}

function ensureRequired(
  resolvedParent: oas30.SchemaObject,
  propertyName: string
) {
  if (_.isNil(resolvedParent.required)) {
    resolvedParent.required = [propertyName];
  } else if (!resolvedParent.required.includes(propertyName)) {
    resolvedParent.required.push(propertyName);
  }
}

function ensure(schema: oas30.SchemaObject, ctx: SchemaResolverContext) {
  const discriminator = schema.discriminator;
  if (_.isNil(discriminator)) {
    // no discriminator
    return;
  }
  const { propertyName, mapping } = discriminator;
  if (_.isNil(mapping)) {
    throw `Error: expected discriminator mapping for discriminated oneOf schema ${JSON.stringify(
      schema
    )}`;
  }

  Object.entries(mapping).forEach(([key, value]) => {
    const subSchema = ctx.resolver.resolveRef({ $ref: value });

    const { prop: resolvedDiscriminatorProp, subSchema: resolvedParent } =
      findDiscriminatorProperty(subSchema, propertyName, ctx) ?? {};
    const discriminatorProp = selectDiscriminatorProperty(
      subSchema,
      propertyName,
      ctx
    );

    const discriminatorProperty =
      _.cloneDeep(discriminatorProp.property) ??
      _.cloneDeep(resolvedDiscriminatorProp);
    if (_.isEmpty(discriminatorProperty)) {
      throw `Error: expected discriminator property '${propertyName}' with value ${key} on subschema ${value} for oneOf schema ${JSON.stringify(
        schema
      )}`;
    }
    if (discriminatorProperty.type !== "string") {
      throw `Error: expected discriminator property '${propertyName}' to be of type 'string' but found ${
        discriminatorProperty.type
      } on subschema ${value} for oneOf schema ${JSON.stringify(schema)}`;
    }

    if (!_.isEmpty(resolvedParent)) {
      setDiscriminatorProperty(
        resolvedParent,
        propertyName,
        { type: "string" },
        ctx
      );
    }

    setDiscriminatorProperty(
      subSchema,
      propertyName,
      ensureDiscriminator(discriminatorProperty, key),
      ctx
    );
  });

  return undefined;
}

function deleteEnumFromDiscriminator(
  discriminatorProperty: oas30.SchemaObject
) {
  if (discriminatorProperty.enum) {
    delete discriminatorProperty.enum;
  }
  if (discriminatorProperty["x-extensible-enum"]) {
    delete discriminatorProperty["x-extensible-enum"];
  }
}

function ensureDiscriminator(
  discriminatorProperty: oas30.SchemaObject,
  key: string
) {
  const update = _.cloneDeep(discriminatorProperty);
  deleteEnumFromDiscriminator(update);
  const prev = update["x-const"];
  if (_.isEmpty(prev)) {
    update["x-const"] = key;
    update.example = key;
  } else if (Array.isArray(prev)) {
    if (!prev.includes(key)) {
      prev.push(key);
    }
    update.example = update["default"] ?? prev[0];
  } else if (prev !== key) {
    update["x-const"] = [prev, key];
    update.example = key;
  }
  return update;
}

function findDiscriminatorProperty(
  subSchema: oas30.SchemaObject,
  propertyName: string,
  ctx: SchemaResolverContext
):
  | { prop: oas30.SchemaObject | undefined; subSchema: oas30.SchemaObject }
  | undefined {
  const property = subSchema.properties?.[propertyName];
  if (!_.isEmpty(property)) {
    return isRef(property)
      ? { prop: ctx.resolver.resolveRef(property), subSchema }
      : { prop: property, subSchema };
  }
  if (!_.isEmpty(subSchema.allOf)) {
    const resolved =
      subSchema.allOf?.map((s) => ctx.resolver.resolveRef(s)) ?? [];
    return resolved
      .map((s) => findDiscriminatorProperty(s, propertyName, ctx))
      .filter(_.isDefined)[0];
  }
  if (!_.isEmpty(subSchema.oneOf)) {
    const resolved =
      subSchema.oneOf?.map((s) => ctx.resolver.resolveRef(s)) ?? [];
    return resolved
      .map((s) => findDiscriminatorProperty(s, propertyName, ctx))
      .filter(_.isDefined)[0];
  }
  return undefined;
}

function selectDiscriminatorProperty(
  subSchema: oas30.SchemaObject,
  propertyName: string,
  ctx: SchemaResolverContext,
  params: { resolveRefs: boolean } = { resolveRefs: true }
): {
  src: "properties" | "allOf" | "oneOf";
  property: oas30.SchemaObject | undefined;
} {
  if (!_.isEmpty(subSchema.properties)) {
    return { src: "properties", property: selectProperty(subSchema) };
  }
  if (!_.isEmpty(subSchema.allOf)) {
    return {
      src: "allOf",
      property: selectPropertyFrom(subSchema.allOf?.toReversed()),
    };
  }
  if (!_.isEmpty(subSchema.oneOf)) {
    return { src: "oneOf", property: selectPropertyFrom(subSchema.oneOf) };
  }

  function selectPropertyFrom(
    subschemas: Array<oas30.SchemaObject | oas30.ReferenceObject> | undefined
  ) {
    const isSchema = (
      a: oas30.SchemaObject | oas30.ReferenceObject
    ): a is oas30.SchemaObject => !isRef(a);
    const resolved: Array<oas30.SchemaObject> | undefined = params.resolveRefs
      ? subschemas?.map((s) => ctx.resolver.resolveRef(s)) ?? []
      : subschemas?.filter(isSchema);
    const resolvedWithDiscriminator = resolved?.find(
      (r) => !_.isEmpty(r.properties?.[propertyName])
    );
    return selectProperty(resolvedWithDiscriminator);
  }

  function selectProperty(
    resolvedWithDiscriminator: oas30.SchemaObject | undefined
  ) {
    const property = resolvedWithDiscriminator?.properties?.[propertyName];
    if (isRef(property)) {
      return params.resolveRefs ? ctx.resolver.resolveRef(property) : undefined;
    }
    return property;
  }

  throw `Error: Expected oneOf subschema to have either 'properties', 'allOf', or 'oneOf' where the discriminator.propertyName ${propertyName} is defined: ${JSON.stringify(
    subSchema
  )}`;
}

function setDiscriminatorProperty(
  subSchema: oas30.SchemaObject,
  propertyName: string,
  value: oas30.SchemaObject,
  ctx: SchemaResolverContext
): void {
  const prop = selectDiscriminatorProperty(subSchema, propertyName, ctx, {
    resolveRefs: false,
  });
  // new discriminator
  switch (prop.src) {
    case "properties":
      ensureRequired(subSchema, propertyName);
      subSchema.properties![propertyName] = value;
      return;
    case "allOf": {
      const sub = subSchema.allOf?.find(
        (f): f is oas30.SchemaObject => !isRef(f)
      );
      if (_.isDefined(sub)) {
        if ("allOf" in sub || "oneOf" in sub || "anyOf" in sub) {
          setDiscriminatorProperty(sub, propertyName, value, ctx);
        }
        if (_.isNil(sub.properties)) {
          sub.properties = { [propertyName]: value };
        }
        sub.properties[propertyName] = value;
        ensureRequired(sub, propertyName);
      } else {
        // all elements are refs. this may yield more than two allOf elements...
        subSchema.allOf?.push({
          required: [propertyName],
          properties: { [propertyName]: value },
        });
      }
      return;
    }
    case "oneOf":
      // we need to set discriminator on every oneOf subschema (recursive, if we allow nested)
      subSchema.oneOf?.forEach((o) => {
        const prop = ctx.resolver.resolveRef(o);
        setDiscriminatorProperty(prop, propertyName, value, ctx);
      });
      break;
  }
}

function findSchemaObjectsWithOneOf(bundled: OpenApiBundled) {
  const transpiler = SchemaResolverContext.create(bundled);
  const collected = transpiler.schemas.filter(
    (s) => !_.isEmpty(s.schema.oneOf)
  );
  return { collected, ctx: transpiler };
}
