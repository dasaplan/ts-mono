/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols,JSVoidFunctionReturnValueUsed

import oafmt, { OpenAPISortOptions } from "openapi-format";
import { File, _, ApplicationError, Folder } from "@dasaplan/ts-sdk";
import { AnySchema, Parsed, resolveSpec } from "./resolve.js";
import * as path from "node:path";
import { createSpecProcessor } from "./post-process/index.js";
import { appLog } from "./logger.js";
import { PostProcessingOptions } from "./post-process/post-process.js";
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

export interface FormatterOptions extends PostProcessingOptions {
  outFolder: Folder;
}

export async function formatSpec(filePath: File, options: FormatterOptions): Promise<{ outFile: string }> {
  const log = appLog.childLog(formatSpec);
  const resolved = await resolveSpec(filePath);
  const common = findCommonPath(resolved.map((r) => r.refFile));
  log.info(`formatting in: ${common}`);

  const { schemaProcessor, documentProcessor } = createSpecProcessor(options);
  for (const r of resolved) {
    log.info(`start: formatting: ${r.refFile.replace(common, "")}`);

    const file = r.getFile();
    // format openapi document
    if ("openapi" in file) {
      const processed = documentProcessor(file);
      const customSorted = customSort(processed);
      const libSorted = await oafmt.openapiSort(customSorted as never, { sortSet, sortComponentsSet });
      if (typeof libSorted.data === "string") {
        throw ApplicationError.create("could not format spec");
      }
      r.updateFile(customSorted);
    }

    // format openapi schemas
    for (const s of r.schemas) {
      const { schema } = schemaProcessor(s);
      s.update(schema);
    }

    exportSpec(r, common, options.outFolder);
    log.debug(`done formatting: ${r.refFile.replace(common, "")}`);
  }
  return { outFile: options.outFolder.absolutePath };
}

function exportSpec(r: { refFile: string; schemas: Parsed[]; getFile: () => any }, common: string, outFolder: Folder) {
  const file = File.of(r.refFile);
  const commonPath = path.resolve(common);
  let current = file.absolutePath.replace(commonPath, "");
  current = current.startsWith(path.sep) ? current.slice(1) : current;
  const c = Folder.resolve(outFolder.absolutePath).makeFile(current);
  c.writeYml(r.getFile());
}

function findCommonPath(filePaths: Array<string>) {
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
      sorted.paths = Object.fromEntries(sortedPath);
      return sorted;
    }
  }

  return sorted;
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

export module OpenapiFormatImport {
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
