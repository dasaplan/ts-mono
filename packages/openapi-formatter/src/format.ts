/* eslint-disable @typescript-eslint/no-explicit-any */
import oafmt, { OpenAPISortOptions } from "openapi-format";
import { File, _, ApplicationError } from "@dasaplan/ts-sdk";
import { an } from "vitest/dist/reporters-BECoY4-b.js";

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

type OaDocument = Parameters<typeof oafmt.openapiSort>[0];

export async function formatSpec(filePath: File, outFile: File): Promise<{ outFile: string }> {
  const spec = await oafmt.parseFile(filePath.absolutePath);
  const customSorted = customSort(spec as never);
  const libSorted = await oafmt.openapiSort(customSorted, { sortSet, sortComponentsSet });
  if (typeof libSorted === "string") {
    throw ApplicationError.create("could not format spec");
  }
  return Promise.resolve({ outFile: outFile.writeYml(customSorted) });
}

function customSort(mutableDoc: OaDocument): OaDocument {
  // sort operation object first alphabetically then by priority
  if (_.isDefined(mutableDoc.paths)) {
    const sortedPath = Object.entries(mutableDoc.paths).map(([route, operation]) => {
      if (_.isNil(operation)) {
        return [route, operation];
      }
      const sortedEntry = OpenapiFormatImport.sortByAlphabet(operation);
      const sortedOperation = OpenapiFormatImport.prioritySort(sortedEntry, ["get", "post", "put", "patch", "delete"]);
      return [route, sortedOperation];
    });

    if (!_.isEmpty(sortedPath)) {
      mutableDoc.paths = Object.fromEntries(sortedPath);
      return mutableDoc;
    }
  }

  // sort components alphabetically
  if (_.isDefined(mutableDoc.components)) {
    Object.entries(mutableDoc.components).forEach(([key, comp]) => {
      if (_.isDefined(comp)) {
        const sortedObj = OpenapiFormatImport.sortByAlphabet(comp);
        if (!_.isEmpty(sortedObj)) {
          (mutableDoc.components as any)[key] = sortedObj;
          return;
        }
      }
    });
  }

  // sort schema properties alphabetically
  if (_.isDefined(mutableDoc.components?.schemas)) {
    Object.entries(mutableDoc.components?.schemas).forEach(([key, schema]) => {
      if (_.isDefined(schema)) {
        const sortedObj = OpenapiFormatImport.sortByAlphabet(schema);
        if (!_.isEmpty(sortedObj)) {
          mutableDoc.components!.schemas![key] = sortedObj;
          return;
        }
      }
    });
  }

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
