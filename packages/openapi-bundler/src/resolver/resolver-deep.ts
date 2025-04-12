/* eslint-disable no-inner-declarations,@typescript-eslint/no-explicit-any */
import { oas30 } from "openapi3-ts";
import { OpenApiBundled } from "../bundle.js";
import { Resolver } from "./resolver.js";
import { SchemaGraph } from "../transpiler/circular-schmeas.js";
import _ from "lodash";

export function cleanObj<T extends Record<string, any>>(obj: T, except: Array<keyof T> = []) {
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    if (except.includes(prop)) {
      return;
    }
    delete obj[prop];
  });
  return obj;
}

export type Node = oas30.SchemaObject | undefined | { [key: string]: Node };

export interface SchemaResolverContext {
  resolver: Resolver;
  graph: SchemaGraph;
  schemas: Array<{ id: string; schema: oas30.SchemaObject }>;
}

export namespace SchemaResolverContext {
  export function create(bundled: OpenApiBundled): SchemaResolverContext {
    const resolver = Resolver.create(bundled);
    const graph = SchemaGraph.createFromBundled(bundled);

    return {
      resolver,
      graph,
      schemas: graph.allNodeIds.flatMap((id) => {
        const schema: oas30.SchemaObject = resolver.resolveRef({ $ref: id } as oas30.SchemaObject | oas30.ReferenceObject);
        if (_.isEmpty(schema.properties)) {
          return [{ id, schema }];
        }
        const propSchemas = Object.entries(schema.properties).map(([key, value]) => ({ id: `${id}.${key}`, schema: value as oas30.SchemaObject }));
        return [{ id, schema }, ...propSchemas];
      }),
    };
  }
}
