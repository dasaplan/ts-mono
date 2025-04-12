import { _ } from "@dasaplan/ts-sdk";
import { appLog } from "../logger.js";
import { AnySchema, Parsed } from "../resolve.js";
import { cleanObj } from "@dasaplan/openapi-bundler";

export interface PostProcessingOptions {
  fixTitles?: boolean;
  fixDescription?: boolean;
  fixDanglingAllOfProps?: boolean;
  deleteExamples?: boolean;
}

export function createSpecProcessor(_options?: PostProcessingOptions) {
  const documentProcessor: Array<(spec: AnySchema) => AnySchema> = [];
  const schemaProcessor: Array<(spec: Parsed) => Parsed> = [];

  const options = {
    ...defaultPostProcessingOptions(),
    ..._options,
  };

  if (options.fixTitles) documentProcessor.push(fixSchemaTitles);
  if (options.fixDescription) schemaProcessor.push(fixDescription);
  if (options.deleteExamples) schemaProcessor.push(deleteExamples);

  // needs to be last because it destroys structure
  if (options.fixDanglingAllOfProps) schemaProcessor.push(fixDanglingPropsForAllOf);
  if (documentProcessor.length < 1 && schemaProcessor.length < 1) {
    return {
      schemasProcessor: (spec: Array<Parsed>) => spec,
      documentProcessor: (spec: AnySchema) => spec,
    };
  }

  return {
    schemasProcessor: (specs: Array<Parsed>) => schemaProcessor.reduce((allSpecs, processor) => allSpecs.map(processor), specs),
    documentProcessor: (spec: AnySchema) => documentProcessor.reduce((acc, curr) => curr(acc), spec),
  };
}

export function defaultPostProcessingOptions(): PostProcessingOptions {
  return {
    fixTitles: true,
    fixDanglingAllOfProps: true,
    fixDescription: false,
    deleteExamples: false,
  };
}

function deleteExamples(parsed: Parsed): Parsed {
  if (parsed.schema.example) {
    delete parsed.schema.example;
  }
  return parsed;
}

function fixDescription(parsed: Parsed): Parsed {
  const log = appLog.childLog(fixDescription);
  const spec = parsed.schema;

  const description = OaSchemaObject.findMember("description", spec);
  if (description) {
    return parsed;
  }
  const lastKey = parsed.path.at(-1);
  if (!lastKey || lastKey === "schema") {
    return parsed;
  }
  const pathRef = parsed.path.join(".");
  log.info(`fixing schema.description: ${lastKey}, path: ${pathRef}, `);
  OaSchemaObject.setMember("description", lastKey, spec);
  return parsed;
}

function collectDanglingPropsForAllOf(spec: AnySchema) {
  const ignoreList: Array<keyof AnySchema> = ["description", "discriminator", "allOf"];
  const dangling = Object.entries(spec).reduce((acc, [key, val]) => {
    if (ignoreList.includes(key as keyof AnySchema)) {
      return acc;
    }
    return [...acc, [key, val as unknown]];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, [] as any);
  return {
    ignoreList,
    dangling: Object.fromEntries(dangling),
    hasDangling: dangling.length > 0,
  };
}

function fixDanglingPropsForAllOf(parsed: Parsed): Parsed {
  const log = appLog.childLog(fixDanglingPropsForAllOf);
  const spec = parsed.schema;
  if (!(spec.allOf || spec.oneOf || spec.anyOf)) {
    return parsed;
  }
  const danglingPropCollectResult = collectDanglingPropsForAllOf(spec);
  const pathRef = parsed.path.join(".");
  if (!danglingPropCollectResult.hasDangling) {
    log.debug(`ok. no dangling props in allOf array found: ${pathRef}`);
    return parsed;
  }
  if (spec.allOf && _.isDefined(spec.allOf)) {
    log.info(`fixing danglingProps: [${Object.keys(danglingPropCollectResult.dangling).join(", ")}], path: ${pathRef}`);
    spec.allOf.push(danglingPropCollectResult.dangling);
    cleanObj(spec, danglingPropCollectResult.ignoreList);
  }
  return parsed;
}

function fixSchemaTitles(spec: AnySchema): AnySchema {
  const log = appLog.childLog(fixSchemaTitles);

  if (_.isNil(spec.components?.schemas)) {
    log.info(`done, no schemas found.`);

    return spec;
  }

  let count = 0;
  const entries = Object.entries(spec.components.schemas).map(([key, schema]) => {
    if ("$ref" in schema) {
      return [key, schema];
    }

    const title = OaSchemaObject.findMember("title", schema);
    if (!title || title !== key) {
      count++;
      log.info(`fixing schema.title: ${title} -> ${key}}, path: components.schemas.${key}`);
      OaSchemaObject.setMember("title", key, schema);
      return [key, schema];
    }

    return [key, schema];
  });

  log.info(`fixed titles for ${count} schemas`);
  spec.components.schemas = Object.fromEntries(entries);
  return spec;
}

export namespace OaSchemaObject {
  export function findMember(member: keyof AnySchema, schema: AnySchema) {
    if (schema[member]) {
      return schema[member];
    }
    if (schema.allOf) {
      return schema.allOf.toReversed().find((a): a is AnySchema => a?.[member as never])?.[member];
    }
    return undefined;
  }

  export function setMember(memberName: keyof AnySchema, memberValue: unknown, schema: AnySchema) {
    if (!schema.allOf) {
      schema[memberName] = memberValue;
      return undefined;
    }
    // handle allOf
    const reversed = schema.allOf.toReversed();
    const subSchema = reversed.find((a): a is AnySchema => a?.[memberName as never]);
    if (subSchema) {
      subSchema[memberName] = memberValue;
      return undefined;
    }
    // last allOf is an inline schema => add to it
    if (reversed.at(0) && !reversed.at(0)?.$ref) {
      reversed[0][memberName as never] = memberValue as never;
      return;
    }
    return schema.allOf.push({ [memberName]: memberValue });
  }
}
