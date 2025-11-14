/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import { pascalCase } from "pascal-case";
import { _, ApplicationError } from "@dasaplan/ts-sdk";
import { appLog } from "./logger.js";
import { Schema } from "@dasaplan/openapi-bundler";

// is being used to identify usecases
export const IDENTIFIER_API = "api";

export interface ZodGenOptions {
  tsTypeNameSuffix: string;
  includeTsTypes: boolean;
  withUnknownEnum: boolean;
  withUnknownUnion: boolean;
}

export function createConstantDeclaration(c: Schema, options: ZodGenOptions) {
  const name = `${pascalCase(c.getName())}${options.tsTypeNameSuffix ?? ""}`;
  const declaration = `export const ${name}`;
  const value = processSchema(c, options);
  const isLazy = value.includes("z.lazy");
  const isEnum = c.kind === "ENUM";
  const isDiscriminated = c.kind === "UNION" && _.isDefined(c.discriminator);

  if (options.includeTsTypes && (isDiscriminated || isEnum)) {
    // todo: fix type inference for unknown values
    return `${declaration} = ${value} as z.ZodType<${IDENTIFIER_API}.${name}>;`;
  }
  if (isLazy && options.includeTsTypes) {
    return `${declaration}: z.ZodType<${IDENTIFIER_API}.${name}> = ${value};`;
  }
  if (isLazy) {
    return `${declaration}: z.ZodTypeAny = ${value};`;
  }
  return `${declaration} = ${value};`;
}

export function createUnionDeclaration(c: Schema, options: ZodGenOptions) {
  if (c.kind !== "UNION") throw ApplicationError.create(`expected schema to be of kind UNION but received ${c.kind}`);
  const name = `${pascalCase(c.getName())}`;
  const declaration = `export const ${name}`;
  // remove discrminator to create normal unions
  const cloned = _.cloneDeep(c);
  delete cloned.discriminator;
  const value = processSchema(cloned, options);
  return `${declaration} = ${value};`;
}

export function createTypeDeclaration(c: Schema, options: ZodGenOptions) {
  const declaration = `export type ${pascalCase(c.getName())}`;
  const value = Factory.createInferredType(c, options);
  return `${declaration} = ${value};`;
}

export function createModule(name: string, members: string[], options: ZodGenOptions) {
  return `
export namespace ${name} {
    ${members.join("\n")}
}
  `;
}

function processSubSchema(c: Schema | Schema.DiscriminatorProperty, options: ZodGenOptions, params?: { withOptionalEntityRef?: boolean }) {
  switch (c.component.kind) {
    case "INLINE":
      return processSchema(c, options);
    case "COMPONENT": {
      return Factory.createEntityRef(c, options);
    }
  }
}

function isCircular(c: Schema | Schema.DiscriminatorProperty) {
  if (c.isCircular) {
    return true;
  }
  switch (c.kind) {
    case "UNION":
      return c.schemas.some((s) => s.isCircular);
    case "OBJECT":
      return c.parent?.isCircular || c.properties.some((p) => p.propertyValue.isCircular);
    case "ARRAY":
      return c.items.isCircular;
    case "BOX":
    case "PRIMITIVE":
    case "ENUM":
    case "DISCRIMINATOR":
      return c.isCircular;
  }
}
function processSchema(c: Schema | Schema.DiscriminatorProperty, options: ZodGenOptions): string {
  return Factory.withLazy(isCircular(c) ?? false, () => {
    switch (c.kind) {
      case "UNION": {
        if (_.isDefined(c.discriminator)) {
          // transform for zod schema factory
          const mappings = c.discriminator.mappings.map((d) => ({
            discriminatorValue: Factory.stringify(d.discriminatorValue),
            entityRef: Factory.createEntityRef(d, options),
          }));
          return Factory.createDiscriminatedUnion(c.discriminator!.name, mappings, options);
        }
        const subSchemas = c.schemas.map((s) => processSubSchema(s, options));
        return Factory.createUnion(subSchemas, options);
      }
      case "OBJECT": {
        const parent = _.isDefined(c.parent) ? processSubSchema(c.parent, options) : undefined;
        const properties = c.properties.map((property) => {
          const name = property.propertyName;
          const withOptional = Factory.withOptional(property, () => processSubSchema(property.propertyValue, options));
          const withDefault = Factory.withDefault(property, withOptional, options);
          return Factory.createObjectProperty(name, withDefault, options);
        });
        return Factory.createObject(properties, parent, options);
      }
      case "PRIMITIVE": {
        const primitive = Factory.createPrimitive(c, options);
        return Factory.withConstraintsAware(c, primitive, options);
      }
      case "ENUM": {
        return Factory.createEnum(c.enum, options);
      }
      case "ARRAY": {
        const item = processSubSchema(c.items, options);
        const arr = Factory.createArray(item, options);
        return Factory.withConstraintsAware(c, arr, options);
      }
      case "DISCRIMINATOR": {
        return Factory.createDiscriminator(c.enum, options);
      }
      case "BOX": {
        throw new Error("boxed schemas are not supported");
      }
    }
  });
}

namespace Factory {
  const valueConstraints = [
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
  ] as const;
  type Constraints<K extends keyof Schema["raw"] & (typeof valueConstraints)[number] = keyof Schema["raw"] & (typeof valueConstraints)[number]> = Pick<
    Schema["raw"],
    K
  >;
  type Test = keyof Schema["raw"];
  const t: Test = "enum";
  export function withLazy(condition: boolean, fn: () => string): string {
    return condition ? `z.lazy(() => ${fn()})` : fn();
  }
  export function createInferredType(c: Schema | Schema.DiscriminatorProperty, options: ZodGenOptions) {
    return `z.infer<typeof Schemas.${createEntityRef(c, options)}>`;
  }

  export function createEntityRef(c: Schema | Schema.DiscriminatorProperty, options: ZodGenOptions) {
    return `${pascalCase(c.getName())}`;
  }

  export function withOptional(property: Schema.Property, fn: () => string): string {
    return property.required ? fn() : `${fn()}.optional()`;
  }

  export function withDefault<T>(_property: Schema.Property, value: string, options: ZodGenOptions): string {
    const property = _property.propertyValue;
    const hasDefault = property.kind === "PRIMITIVE" || property.kind === "ENUM" || property.kind === "DISCRIMINATOR";
    if (!hasDefault) {
      return value;
    }

    const defaultValue = property.defaultValue;
    switch (typeof defaultValue) {
      case "string":
        return `${value}.default('${defaultValue}')`;
      case "symbol":
      case "number":
      case "bigint":
      case "boolean":
        return `${value}.default(${defaultValue})`;
      case "undefined":
      case "object":
      case "function":
        return value;
    }
  }

  export function createUnion(subSchemas: string[], options: ZodGenOptions): string {
    return `z.union([${subSchemas.join(", ")}])`;
  }

  export function createDiscriminatedUnion(
    discriminatorProperty: string,
    mappings: Array<{ discriminatorValue: string; entityRef: string }>,
    options: ZodGenOptions,
  ): string {
    if (!options.withUnknownUnion) {
      return `z.discriminatedUnion("${discriminatorProperty}", [${mappings.map((m) => m.entityRef).join(", ")}])`;
    }

    const matchProperties = mappings.map((p) => createObjectProperty(p.discriminatorValue, p.entityRef, options));
    // add unknown schema

    matchProperties.push(`onDefault: z.object({ ${discriminatorProperty}: z.string().transform((s) => \`unknown:\${s}\` as const) }).passthrough()`);
    return `zc.ZodUnionMatch.matcher("${discriminatorProperty}", ${createObjectTs(matchProperties, options)})`;
  }

  export function createObjectProperty(name: string, value: string, options: ZodGenOptions): string {
    return `${name}: ${value}`;
  }

  export function createObject(properties: string[], parent: string | undefined, options: ZodGenOptions): string {
    const obj = `z.object(${createObjectTs(properties, options)})`;
    return _.isDefined(parent) ? `${parent}.merge(${obj})` : obj;
  }

  export function createObjectTs(properties: string[], options: ZodGenOptions): string {
    return `{${properties.join(", ")}}`;
  }

  export function createPrimitive(c: Schema.Primitive, options: ZodGenOptions): string {
    switch (c.type) {
      case "integer":
        return `z.number().int()`;
      case "number":
        return numberFormatAware(c, `z.number()`, options);
      case "string":
        return stringFormatAware(c, `z.string()`, options);
      case "boolean":
        return `z.boolean()`;
    }
  }

  export function createEnum(values: string[], options: ZodGenOptions): string {
    const renderedEnum = `z.enum([${values.map(stringify).join(",")}])`;
    if (!options.withUnknownEnum) {
      return renderedEnum;
    }
    function withUnknownVariant(value: string) {
      return `${value}.or(z.string().transform((s) => \`unknown:\${s}\` as const))`;
    }
    return withUnknownVariant(renderedEnum);
  }

  export function createArray(item: string, options: ZodGenOptions): string {
    return `z.array(${item})`;
  }

  export function createDiscriminator(values: string[], options: ZodGenOptions): string {
    if (values.length <= 1) {
      return literal(values[0]);
    }
    return `z.enum([${values.map(stringify).join(",")}])`;
  }

  export function literal(value: string) {
    return `z.literal(${stringify(value)})`;
  }

  export function withConstraintsAware(schema: Schema, value: string, options: ZodGenOptions) {
    const constraints: Constraints = schema.raw;
    const isExclusiveMin = constraints.exclusiveMinimum;
    const isExclusiveMax = constraints.exclusiveMaximum;
    return Object.entries(_.omit(constraints, "exclusiveMinimum", "exclusiveMaximum")).reduce((acc, param) => {
      const [curr, val] = param as [keyof Omit<Constraints, "exclusiveMinimum" | "exclusiveMaximum">, number];
      switch (curr) {
        case "maximum": {
          return isExclusiveMax ? `${value}.refine((n) => n < ${val}, { message: "Value must be less than ${val}" })` : `${value}.max(${val})`;
        }
        case "minimum": {
          return isExclusiveMin ? `${value}.refine((n) => n > ${val}, { message: "Value must be greater than ${val}" })` : `${value}.min(${val})`;
        }
        case "pattern":
          return `${value}.regex(/${val}/)`;
        case "maxLength":
        case "maxItems":
          return `${value}.max(${val})`;
        case "minLength":
        case "minItems":
          return `${value}.min(${val})`;
        case "uniqueItems":
        case "maxProperties":
        case "minProperties":
          // not supported
          appLog.log.warn(`unsupported constraint ${curr} will be ignored`);
          break;
      }
      return acc;
    }, value);
  }

  export function stringFormatAware(c: Schema.Primitive.PrimitiveAlphaNumeric, numberValue: string, options: ZodGenOptions): string {
    switch (c.format) {
      case "int64":
        // todo: feat: support bigint for string + int64 format
        return numberValue;
      case "int32":
      case "float":
      case "double":
      case "byte":
      case "binary":
      case "password":
        // no known requirements
        return numberValue;
      case "date":
        // todo: feat: handle date validation and parsing but be aware parsing a date string may be ambiguous when time information are included due to the js-Date object may include server time which may result in a diffrent day
        // todo: feat: include option to validate iso date
        // todo: feat: express date format for typescript on type level
        // Requirement: Date String MUST be parseable by js Date
        // Requirement: Date String MUST not include time information. When parsing date, time information MUST be stripped away.
        return numberValue;
      case "date-time":
        // Requirement: DateTime String MUST be parseable by js Date
        // Requirement: DateTime String MUST include timezone information
        // in js a number can be unambiguously parsed with the date object. Decimals may be ignored
        return numberValue;
      case undefined:
      default:
        // no known requirements for  vendor prefixed formats
        return numberValue;
    }
  }

  export function numberFormatAware(c: Schema.Primitive.PrimitiveAlphaNumeric, numberValue: string, options: ZodGenOptions): string {
    switch (c.format) {
      case "int64":
      case "int32":
        // we can ensure integer at runtime
        return `${numberValue}.int()`;
      case "float":
      case "double":
        // its just number
        return numberValue;
      case "byte":
      case "binary":
      case "password":
        // no known requirements
        return numberValue;
      case "date":
      case "date-time":
        // in js a number can be unambiguously parsed with the date object. Decimals may be ignored
        return numberValue;
      case undefined:
      default:
        // no known requirements for  vendor prefixed formats
        return numberValue;
    }
  }

  export function stringify(value: string | number) {
    return `'${value}'`;
  }
}
