/* eslint-disable @typescript-eslint/no-unused-vars */
import { Schema } from "../transpile-schema.js";
import { appLog } from "../../logger.js";
import { _ } from "@dasaplan/ts-sdk";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import * as toposort from "./lib.js";

export namespace Toposort {
  const logger = appLog.childLogger("Toposort");
  type Edge<T> = [T, T];
  export function sortSchemas(schemas: Array<Schema>): Array<Schema> {
    const collectedEdges: Map<string, Set<string>> = new Map();
    const nodes = new Map<string, Schema>();
    schemas.forEach((s) => collectEdges(s, undefined, collectedEdges, nodes));
    const nodeComponents = _.unionBy(
      Array.from(nodes.values()).filter((d) => d.component.kind === "COMPONENT"),
      (d) => d.getId(),
    ).map((d) => d.getId());

    const edges = Array.from(collectedEdges.entries()).reduce(
      (acc, entry: [string, Set<string>]) => {
        const [parent, children] = entry;
        return [...acc, ...Array.from(children).map((c) => [parent, c] satisfies Edge<string>)];
      },
      <Array<Edge<string>>>[],
    );

    try {
      const sorted: Array<string> = toposort.array(nodeComponents, edges);
      return sorted.reverse().map((d) => nodes.get(d)!);
    } catch (e) {
      throw new Error("Error: could not create dependency graph: " + (e as Error).message);
    }
  }

  function collectEdges(child: Schema, parent: Schema | undefined, ctx: Map<string, Set<string>>, nodes: Map<string, Schema>) {
    if (child.component.kind === "COMPONENT" && !nodes.has(child.getId())) {
      nodes.set(child.getId(), child);
    }
    if (_.isDefined(parent) && parent.component.kind === "COMPONENT" && !nodes.has(parent.getId())) {
      nodes.set(parent.getId(), parent);
    }

    function withoutCircles(s: Schema, fn: () => void) {
      if (s.isCircular) return;
      return fn();
    }

    function addEdge(_parent: Schema, _child: Schema) {
      if (!ctx.has(_parent.getId())) {
        ctx.set(_parent.getId(), new Set());
      }
      ctx.get(_parent.getId())?.add(_child.getId());
    }

    // only components which we can identify
    if (child.getId() === parent?.getId()) {
      logger.childLog(collectEdges).warn(`recursion found ${child.getId()} - skip`);
      return;
    }
    if (_.isDefined(parent) && parent.component.kind === "COMPONENT" && child.component.kind === "COMPONENT") {
      addEdge(parent, child);
    }

    switch (child.kind) {
      case "ARRAY":
        withoutCircles(child.items, () =>
          /*
           * root schema of type array has no parent => child
           * else, we are a property and want to create a dependency between the "parent" of the property and the array item => parent
           * */
          collectEdges(child.items, parent ?? child, ctx, nodes),
        );
        return;
      case "UNION":
        child.schemas.forEach((s) => withoutCircles(s, () => collectEdges(s, child, ctx, nodes)));
        return;
      case "OBJECT":
        child.properties
          .map((p) => p.propertyValue)
          .flatMap((d) => (d.kind === "DISCRIMINATOR" ? [] : [d]))
          .forEach((s) => withoutCircles(s, () => collectEdges(s, child, ctx, nodes)));
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
