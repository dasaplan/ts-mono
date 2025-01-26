/* eslint-disable @typescript-eslint/no-explicit-any */
import {AnySchema} from "../resolve.js";
import oafmt, {OpenAPISortOptions} from "openapi-format";
import {_, ApplicationError} from "@dasaplan/ts-sdk";
import {oas30} from "openapi3-ts";


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

export async function sortOpenapi(processed: AnySchema) {
    const customSorted = customSort(processed);
    const libSorted = await oafmt.openapiSort(customSorted as never, {sortSet, sortComponentsSet});
    if (typeof libSorted.data === "string") {
        throw ApplicationError.create("could not format spec");
    }
    return customSorted;
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
