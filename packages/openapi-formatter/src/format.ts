/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols,JSVoidFunctionReturnValueUsed

import oafmt, { OpenAPISortOptions } from "openapi-format";
import { File, _, ApplicationError, Folder } from "@dasaplan/ts-sdk";
import { AnySchema, InferOa, Parsed, ResolvedSpec, resolveOpenapi, resolveSchemas, resolveSpec } from "./resolve.js";
import * as path from "node:path";
import { createSpecProcessor } from "./post-process/index.js";
import { appLog } from "./logger.js";
import { PostProcessingOptions } from "./post-process/post-process.js";
import { oas30 } from "openapi3-ts";
import { OpenApiBundled } from "@dasaplan/openapi-bundler";

const sortSet: OpenAPISortOptions["sortSet"] = {
  sortPathsBy: "path",
  root: ["openapi", "info", "servers", "paths", "components", "tags", "x-tagGroups", "externalDocs"],
  get: ["operationId", "summary", "description", "parameters", "requestBody", "responses"],
  post: ["operationId", "summary", "description", "parameters", "requestBody", "responses"],
  put: ["operationId", "summary", "description", "parameters", "requestBody", "responses"],
  patch: ["operationId", "summary", "description", "parameters", "requestBody", "responses"],
  delete: ["operationId", "summary", "description", "parameters", "requestBody", "responses"],
  parameters: ["name", "in", "description", "required", "schema"],
  requestBody: ["description", "required", "content"],
  responses: ["description", "headers", "content", "links"],
  content: [],
  components: ["parameters", "schemas"],
  schema: ["description", "type", "items", "properties", "format", "example", "default"],
  schemas: ["description", "type", "items", "properties", "format", "example", "default"],
  properties: ["description", "type", "items", "format", "example", "default", "enum"],
};

const sortComponentsSet: OpenAPISortOptions["sortComponentsSet"] = ["schemas", "parameters", "headers", "requestBodies", "responses", "securitySchemes"];
const sortDocumentSet: Array<keyof oas30.OpenAPIObject> = ["openapi", "info", "tags", "servers", "paths", "components", "security", "externalDocs"];

export interface FormatterOptions extends PostProcessingOptions {
  outFolder: Folder;
  sortSpec?: boolean;
}

/*** Format an Openapi specification. If the spec contains external references, they will be resolved and formatted. */
export async function formatSpec(filePath: File, options: FormatterOptions): Promise<{ outFile: string }> {
  const log = appLog.childLog(formatSpec);
  const resolved = await resolveSpec(filePath);
  const { common, formattedSpecs } = await formatResolvedSpec(resolved, options);
  formattedSpecs.forEach((r) => exportSpec(r, common, options.outFolder));
  return { outFile: options.outFolder.absolutePath };
}

/*** Format an Openapi object. If the objects contains external references, they will be resolved and formatted. */
export async function formatOpenapi(spec: oas30.OpenAPIObject, options: Omit<FormatterOptions, "outFolder">): Promise<Array<oas30.OpenAPIObject>> {
  const resolved = await resolveOpenapi(spec);
  const { common, formattedSpecs } = await formatResolvedSpec(resolved, options);
  return formattedSpecs.map((r) => r.getFile() as unknown as oas30.OpenAPIObject);
}

async function formatResolvedSpec(resolved: ResolvedSpec, options: Omit<FormatterOptions, "outFolder">) {
  const log = appLog.childLog(formatSpec);
  const common = findCommonPath(resolved.map((r) => r.refFile));
  const { schemasProcessor, documentProcessor } = createSpecProcessor(options);
  const formattedSpecs = await Promise.all(
    resolved.map(async (r) => {
      const fileWithoutRoot = common === "" ? r.refFile : common;
      log.info(`start: formatting: ${fileWithoutRoot}`);

      // format openapi document
      let mutFile = r.getFile();
      if (!InferOa.isObj(mutFile)) {
        return r;
      }
      if ("openapi" in mutFile) {
        log.debug(`start: formatting document`);
        const processed = documentProcessor(mutFile);
        r.updateFile(processed);

        if (options.sortSpec) {
          const customSorted = customSort(processed);
          const libSorted = await oafmt.openapiSort(customSorted as never, { sortSet, sortComponentsSet });
          if (typeof libSorted.data === "string") {
            throw ApplicationError.create("could not format spec");
          }
          r.updateFile(libSorted.data);
        }
      }

      // format openapi schemas
      log.debug(`start: formatting schemas`);
      mutFile = r.getFile();
      const schemas = resolveSchemas(mutFile);
      schemasProcessor(schemas);
      r.updateFile(mutFile);

      log.debug(`done formatting: ${fileWithoutRoot}`);
      return r;
    }),
  );
  return { common, formattedSpecs };
}

function exportSpec(r: { refFile: string; schemas: Parsed[]; getFile: () => any }, common: string, outFolder: Folder) {
  const log = appLog.childLog(exportSpec);
  const file = File.of(r.refFile);
  if (common === "") {
    file.writeYml(r.getFile());
    return;
  }
  const commonPath = path.resolve(common);
  let current = file.absolutePath.replace(commonPath, "");
  current = current.startsWith(path.sep) ? current.slice(1) : current;
  const c = Folder.resolve(outFolder.absolutePath).makeFile(current);
  c.writeYml(r.getFile());
  log.debug(`done: exporting ${c.absolutePath}`);
}

function findCommonPath(filePaths: Array<string>) {
  if (filePaths.length === 1) {
    // if we only have one file, the common path is the parent where the file lives in
    return Folder.of(filePaths[0]).absolutePath;
  }
  let commonPath = "";
  const [first, ...rest] = filePaths;
  const segments = first.split("/");
  for (const segment of segments) {
    const next = commonPath === "" ? segment : `${commonPath}/${segment}`;
    const isCommon = rest.every((f) => f.startsWith(next));
    if (isCommon) {
      commonPath = next;
      continue;
    }
    break;
  }
  return commonPath;
}

function customSort(mutableDoc: AnySchema): AnySchema {
  const sorted = recSortAlphabetically(mutableDoc);
  if (_.isNil(sorted)) {
    throw ApplicationError.create("internal error: could not format spec. spec returned undefined after formatting");
  }
  // sort operation object first alphabetically then by priority
  if (_.isDefined(sorted.paths)) {
    const sortedPath = Object.entries(sorted.paths).map(([route, operation]) => {
      if (_.isNil(operation)) {
        return [route, operation];
      }
      const sortedOperation = OpenapiFormatImport.prioritySort(operation, ["get", "post", "put", "patch", "delete"]);
      return [route, sortedOperation];
    });
    if (!_.isEmpty(sortedPath)) {
      mutableDoc.paths = Object.fromEntries(sortedPath);
    }
  }
  return OpenapiFormatImport.prioritySort(sorted, sortDocumentSet);
}

function recSortAlphabetically(mutableDoc: AnySchema | undefined): AnySchema | undefined {
  // sort components alphabetically
  if (_.isNil(mutableDoc) || typeof mutableDoc !== "object") {
    return;
  }

  Object.entries(mutableDoc).forEach(([key, comp]) => {
    if (typeof comp !== "object" || comp === null) {
      return;
    }

    if (["required", "parameters", "enum", "tags", "x-extensible-enum"].includes(key) && Array.isArray(comp)) {
      // should be safe to sort
      (mutableDoc as any)[key] = comp.sort();
      return;
    }

    if (Array.isArray(comp)) {
      // we do not want to sort by accident and maybe break semantics
      // recurse e.g. allOf arrays
      comp.forEach(recSortAlphabetically);
      return;
    }

    // recurse
    recSortAlphabetically(comp);

    const sortedObj = OpenapiFormatImport.sortByAlphabet(comp);
    if (!_.isEmpty(sortedObj)) {
      (mutableDoc as any)[key] = sortedObj;
      return;
    }
  });

  return mutableDoc;
}

export namespace OpenapiFormatImport {
  export function sortByAlphabet(obj: object) {
    const entries = Object.entries(obj);
    // Sort the entries alphabetically
    entries.sort((a, b) => {
      if (!a[0]) return -1;
      if (!b[0]) return 1;
      if (a[0] < b[0]) return -1;
      if (a[0] > b[0]) return 1;
      return 0;
    });
    return Object.fromEntries(entries);
  }

  /**
   * Priority sort function
   * @param jsonProp
   * @param sortPriority
   * @param options
   * @returns {*}
   */
  export function prioritySort(jsonProp: object, sortPriority: Array<any>) {
    return sortObjectByKeyNameList(jsonProp, propComparator(sortPriority));
  }

  /**
   * Sort Object by Key or list of names
   * @param object
   * @param sortWith
   * @returns {*}
   */
  function sortObjectByKeyNameList(object: object, sortWith: (a: number, b: number) => number | any) {
    let keys, sortFn;

    if (typeof sortWith === "function") {
      sortFn = sortWith;
    } else {
      keys = sortWith;
    }

    const objectKeys = Object.keys(object);
    return (keys || []).concat(objectKeys.sort(sortFn as never) as never).reduce((total, key) => {
      if (objectKeys.indexOf(key) !== -1) {
        total[key] = object[key];
      }
      return total;
    }, {});
  }

  /**
   * Compare function - Sort with Priority logic, keep order for non-priority items
   * @param priorityArr
   * @returns {(function(*=, *=): (number|number))|*}
   */
  function propComparator(priorityArr: Array<any>) {
    return (a: number, b: number) => {
      if (a === b) {
        return 0;
      }
      if (!Array.isArray(priorityArr)) {
        return 0;
      }
      const ia = priorityArr.indexOf(a);
      const ib = priorityArr.indexOf(b);
      if (ia !== -1) {
        return ib !== -1 ? ia - ib : -1;
      }
      return ib !== -1 || a > b ? 1 : a < b ? -1 : 0;
    };
  }
}
