import { OpenApiBundled } from "../bundle.js";

import { ComponentNode, Schema } from "./transpile-schema.js";
import { Endpoint } from "./transpile-endpoint.js";
import { Resolver } from "../resolver/index.js";
import { SchemaGraph } from "./circular-schmeas.js";

export interface TranspileContext {
  resolver: Resolver;
  schemas: Map<ComponentNode, Schema>;
  visited: Map<ComponentNode, ComponentNode>;
  last: Set<ComponentNode>;
  endpoints: Array<Endpoint>;
  graph: ReturnType<(typeof SchemaGraph)["createFromResolver"]>;

  clean(): TranspileContext;
}

/** Resolving the oa spec just involves parsing and traversing openapi specified elements and components */
export namespace TranspileContext {
  export function create(bundled: OpenApiBundled): TranspileContext {
    const graph = SchemaGraph.createFromBundled(bundled);
    const resolver = Resolver.create(bundled);
    return {
      graph,
      clean() {
        if (this.schemas) {
          this.schemas.forEach((s) => {
            if ("::ref" in s.raw) {
              delete s.raw["::ref"];
            }
          });
        }
        return this;
      },
      resolver,
      visited: new Map(),
      schemas: new Map(),
      last: new Set(),
      endpoints: [],
    };
  }
}
