/* eslint-disable @typescript-eslint/no-unused-vars */
import { OpenApiBundled } from "../bundle.js";
import { Schema } from "./transpile-schema.js";
import { oas30 } from "openapi3-ts";
import { _ } from "@dasaplan/ts-sdk";
import { OaComponent, Resolver } from "../resolver/index.js";
import { WithOptionalRef } from "../resolver/resolver.js";

interface Node {
  id: string;
  children: Set<Node["id"]>;
}

interface Context {
  resolver: Resolver;
  visited: Set<OaComponent>;
  circles: Set<oas30.ReferenceObject["$ref"]>;
  nodes: Map<Node["id"], Node>;
  path: Array<OaComponent>;
}

function isCmp(cmp: ReturnType<Resolver["resolveRefOptional"]>): cmp is Exclude<ReturnType<Resolver["resolveRefOptional"]>, undefined> {
  return _.isDefined(cmp) && (!_.isEmpty(cmp?.$ref) || !_.isEmpty(cmp?.["::ref"]));
}

function getRef(cmp: ReturnType<Resolver["resolveRefOptional"]>): string {
  if (_.isNil(cmp) || (_.isEmpty(cmp.$ref) && _.isEmpty(cmp["::ref"]))) {
    throw new Error("expected component to include ref");
  }
  return cmp.$ref ?? (cmp["::ref"] as string);
}

function findCircles(child: WithOptionalRef<oas30.SchemaObject> | oas30.ReferenceObject | undefined, parent: oas30.SchemaObject | undefined, ctx: Context) {
  function changePath(cmd: "ADD" | "POP", _s: OaComponent | undefined) {
    if (!isCmp(_s)) {
      return;
    }
    switch (cmd) {
      case "ADD":
        return ctx.path.push(_s);
      case "POP":
        return ctx.path.pop();
    }
  }
  function withPath(child: oas30.SchemaObject | oas30.ReferenceObject, fn: () => void) {
    changePath("ADD", child);
    fn();
    changePath("POP", child);
  }

  const schema = ctx.resolver.resolveRefOptional(child);
  if (_.isNil(schema)) {
    return;
  }
  if (isCmp(schema) && ctx.path.includes(schema)) {
    const ref = getRef(schema);
    ctx.circles.add(ref);
    return;
  }
  withPath(schema, () => {
    addEdge(parent, child, ctx);

    if (ctx.visited.has(schema)) {
      return;
    }
    ctx.visited.add(schema);

    if (Schema.isUnion(schema)) {
      schema.oneOf.forEach((u) => withPath(u, () => findCircles(u, schema, ctx)));
    }
    if (Schema.isExtendedOaObject(schema)) {
      schema.allOf.forEach((u) => withPath(u, () => findCircles(u, schema, ctx)));
    }
    if (Schema.isOaObject(schema)) {
      Object.values(schema.properties ?? {}).forEach((u) => withPath(u, () => findCircles(u, schema, ctx)));
    }
    if (Schema.isOaArray(schema)) {
      withPath(schema, () => findCircles(schema.items, parent ?? schema, ctx));
    }
  });
}

export type SchemaGraph = ReturnType<(typeof SchemaGraph)["createFromBundled"]>;
export module SchemaGraph {
  export function createFromBundled(bundled: OpenApiBundled) {
    const resolver = Resolver.create(_.cloneDeep(bundled));
    return createSchemaGraph(resolver);
  }
  export function createFromResolver(resolver: Resolver) {
    return createSchemaGraph(resolver);
  }
}

export function createSchemaGraph(resolver: Resolver) {
  const context: Context = {
    resolver,
    visited: new Set<OaComponent>(),
    circles: new Set<string>(),
    nodes: new Map<Node["id"], Node>(),
    path: [],
  };

  Object.entries(resolver.root.components?.schemas ?? {}).forEach(([key, cmp]) => {
    const ref = `#/components/schemas/${key}`;
    const schema = { ...(cmp as oas30.SchemaObject), $ref: ref, "::ref": ref };
    findCircles(schema, undefined, context);
  });

  return {
    get edges() {
      return Array.from(context.nodes.values()).reduce((acc, curr) => {
        acc.push(...Array.from(curr.children).map((c) => [curr.id, c]));
        return acc;
      }, <string[][]>[]);
    },
    get nodes() {
      return context.nodes;
    },
    get allNodeIds() {
      return Array.from(context.nodes.keys());
    },
    get circles() {
      return context.circles;
    },
    getNode(ref: string) {
      return this.nodes.get(ref);
    },
    getChildren(ref: string) {
      return Array.from(this.nodes.get(ref)?.children.values() ?? []);
    },
    isCircular(oa: oas30.SchemaObject) {
      return Schema.isComponent(oa) && this.isCircularNode(oa["::ref"]);
    },
    isOrHasCircular(oa: oas30.SchemaObject) {
      return Schema.isComponent(oa) && this.isOrHasCircularNodes(oa["::ref"]);
    },
    isOrHasCircularNodes(ref: string) {
      const node = this.getNode(ref);
      return _.isDefined(node) && (this.isCircularNode(node.id) || this.getChildren(ref).some((c) => this.isCircularNode(c)));
    },
    isCircularNode(ref: string) {
      return context.circles.has(ref);
    },
  };
}

function addEdge(parentSchema: OaComponent | undefined, childSchema: OaComponent | undefined, ctx: Context) {
  const areComponents = isCmp(parentSchema) && isCmp(childSchema);
  const isChildCircular = areComponents && ctx.circles.has(getRef(childSchema));
  function createParent() {
    const parentId = getRef(parentSchema);
    const parent = ctx.nodes.get(parentId) ?? { id: parentId, children: new Set<string>() };
    ctx.nodes.set(parent.id, parent);
    return parent;
  }

  function getOrCreateNode(oa: OaComponent) {
    const nodeId = getRef(oa);
    const node = ctx.nodes.get(nodeId) ?? { id: nodeId, children: new Set<string>() };
    ctx.nodes.set(node.id, node);
    return node;
  }

  if (areComponents) {
    const child = getOrCreateNode(childSchema);
    const parent = getOrCreateNode(parentSchema);
    if (!isChildCircular) {
      parent.children.add(child.id);
    }
    return;
  }
  if (isCmp(parentSchema)) {
    getOrCreateNode(parentSchema);
  }
  if (isCmp(childSchema)) {
    getOrCreateNode(childSchema);
  }
}
