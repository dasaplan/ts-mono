import { _ } from "@dasaplan/ts-sdk";
import { appLog } from "../logger.js";
import { AnySchema, Parsed } from "../resolve.js";
import { cleanObj } from "@dasaplan/openapi-bundler";

export interface PostProcessingOptions {
  fixTitles?: boolean;
  fisDescription?: boolean;
  fixDanglingAllOfProps?: boolean;
}

export function createSpecProcessor(_options?: PostProcessingOptions) {
  const documentProcessor: Array<(spec: AnySchema) => AnySchema> = [];
  const schemaProcessor: Array<(spec: Parsed) => Parsed> = [];

  const options = {
    ...defaultPostProcessingOptions(),
    ..._options,
  };

  if (options.fixTitles) documentProcessor.push(fixSchemaTitles);
  if (options.fixDanglingAllOfProps) schemaProcessor.push(fixDanglingPropsForAllOf);
  if (options.fisDescription) schemaProcessor.push(fixDescription);

  if (documentProcessor.length < 1) {
    return {
      schemaProcessor: (spec: Parsed) => spec,
      documentProcessor: (spec: AnySchema) => spec,
    };
  }

  return {
    schemaProcessor: (spec: Parsed) => schemaProcessor.reduce((acc, curr) => curr(acc), spec),
    documentProcessor: (spec: AnySchema) => documentProcessor.reduce((acc, curr) => curr(acc), spec),
  };
}

export function defaultPostProcessingOptions(): PostProcessingOptions {
  return {
    fixTitles: true,
    fixDanglingAllOfProps: true,
    fisDescription: true,
  };
}

function fixDescription(parsed: Parsed): Parsed {
  const log = appLog.childLog(fixDescription);
  const spec = parsed.schema;
  const description = spec.description ?? spec.allOf?.find((a) => a.description)?.description;
  if (description) {
    return parsed;
  }
  const lastKey = parsed.path.at(-1);
  if (!lastKey || lastKey === "schema") {
    return parsed;
  }
  const pathRef = parsed.path.join(".");
  log.info(`[FIX_DESCRIPTION] path: ${pathRef}, description: ${lastKey}`);
  spec.description = lastKey;

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
    log.info(`[FIX_DANGLING_PROPS] danglingProps: [${Object.keys(danglingPropCollectResult.dangling).join(", ")}], path: ${pathRef}`);
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

    const title = getTitle(schema);
    if (!title || title !== key) {
      count++;
      log.info(`[FIX_TITLE] schema.title: ${schema.title} -> ${key}`);
      schema.title = key;
      return [key, schema];
    }

    return [key, schema];
  });

  log.info(`fixed titles for ${count} schemas`);
  spec.components.schemas = Object.fromEntries(entries);
  return spec;
}

function getTitle(schema: AnySchema) {
  if (schema.title) {
    return schema.title;
  }
  if (schema.allOf) {
    return schema.allOf.find((a) => a?.title)?.title;
  }
  return undefined;
}
