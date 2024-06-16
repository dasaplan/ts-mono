/* eslint-disable no-inner-declarations,@typescript-eslint/no-explicit-any */
import { oas30 } from "openapi3-ts";
import { OpenApiBundled } from "../bundle.js";
import { Resolver } from "./resolver.js";
import { SchemaGraph } from "../transpiler/circular-schmeas.js";

export function cleanObj<T extends Record<string, any>>(obj: T, except: Array<keyof T>) {
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
  schemas: Array<{id: string, schema: oas30.SchemaObject}>;
}

export module SchemaResolverContext {
  export function create(bundled: OpenApiBundled): SchemaResolverContext {
    const resolver = Resolver.create(bundled);
    const graph = SchemaGraph.createFromBundled(bundled);

    return { resolver, graph, schemas: graph.allNodeIds.map((id) => ({id, schema: resolver.resolveRef({ $ref: id })})) };
  }
}
