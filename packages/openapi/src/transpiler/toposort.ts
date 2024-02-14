/* eslint-disable @typescript-eslint/no-unused-vars */
import { Schema } from "./transpile-schema.js";
import { log } from "../logger.js";
import { _ } from "@dasaplan/node-sdk";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import toposort from "toposort";

export module Toposort {
  export function sortSchemas(schemas: Array<Schema>): Array<Schema> {
    const collectedEdges: Map<string, Set<string>> = new Map();
    const nodes = new Map<string, Schema>();
    schemas.forEach((s) => collectEdges(s, undefined, collectedEdges, nodes));
    const nodeComponents = _.unionBy(
      Array.from(nodes.values()).filter((d) => d.component.kind === "COMPONENT"),
      (d) => d.getName()
    ).map((d) => d.getName());
    const edges = Array.from(collectedEdges.entries()).reduce((acc, entry) => {
      const [parent, children] = entry as unknown as [Schema, Set<Schema>];
      return [...acc, ...Array.from(children).map((c) => [parent, c])];
    }, <Array<Array<Schema>>>[]);
    try {
      const sorted: Array<string> = toposort.array(nodeComponents, edges);
      return sorted.reverse().map((d) => nodes.get(d)!);
    } catch (e) {
      throw new Error("Error: could not create dependency graph: " + (e as Error).message);
    }
  }

  function collectEdges(child: Schema, parent: Schema | undefined, ctx: Map<string, Set<string>>, nodes: Map<string, Schema>) {
    if (child.component.kind === "COMPONENT" && !nodes.has(child.getName())) {
      nodes.set(child.getName(), child);
    }
    if (_.isDefined(parent) && parent.component.kind === "COMPONENT" && !nodes.has(parent.getName())) {
      nodes.set(parent.getName(), parent);
    }
    function withoutCircles(s: Schema, fn: () => void) {
      if (s.isCircular) return;
      return fn();
    }
    function addEdge(_parent: Schema, _child: Schema) {
      if (!ctx.has(_parent.getName())) {
        ctx.set(_parent.getName(), new Set());
      }
      ctx.get(_parent.getName())?.add(_child.getName());
    }
    // only components which we can identify
    if (child.getName() === parent?.getName()) {
      log.warn(`recursion found ${child.getName()} - skip`);
      return;
    }
    if (_.isDefined(parent) && parent.component.kind === "COMPONENT" && child.component.kind === "COMPONENT") {
      addEdge(parent, child);
    }

    switch (child.kind) {
      case "ARRAY":
        withoutCircles(child.items, () => collectEdges(child.items, child, ctx, nodes));
        return;
      case "UNION":
        child.schemas.forEach((s) => withoutCircles(s, () => collectEdges(s, child, ctx, nodes)));
        return;
      case "OBJECT":
        child.properties.flatMap((d) => (d.kind === "DISCRIMINATOR" ? [] : [d])).forEach((s) => withoutCircles(s, () => collectEdges(s, child, ctx, nodes)));
        if (_.isDefined(child.parent)) {
          addEdge(child, child.parent);
          collectEdges(child.parent, undefined, ctx, nodes);
        }
        return;
      case "PRIMITIVE":
      case "ENUM":
      case "BOX":
        return;
    }
  }
}
