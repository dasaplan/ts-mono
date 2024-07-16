import { OpenApiBundled } from "../bundle.js";
import { oas30 } from "openapi3-ts";
import { SchemaGraph } from "./circular-schmeas.js";

describe("find circles", () => {
  test("circular", () => {
    const openapi: OpenApiBundled = createApi((oa) =>
      withSchemas(oa, {
        Node: {
          type: "object",
          properties: {
            id: { type: "string" },
            parent: { $ref: "#/components/schemas/Node" },
            children: {
              type: "array",
              items: { $ref: "#/components/schemas/Node" },
            },
          },
        },
      })
    );
    const result = SchemaGraph.createFromBundled(openapi);
    expect(Array.from(result.circles.values())).toEqual([
      "#/components/schemas/Node",
    ]);
    expect(Array.from(result.nodes.keys())).toEqual([
      "#/components/schemas/Node",
    ]);
    expect(result.edges).toEqual([]);
  });

  test("simple nested circular", () => {
    const openapi: OpenApiBundled = createApi((oa) =>
      withSchemas(oa, {
        Node: {
          title: "Node",
          type: "object",
          properties: {
            id: { type: "string" },
            parent: { $ref: "#/components/schemas/Node" },
            children: {
              type: "array",
              items: { $ref: "#/components/schemas/Child" },
            },
          },
        },
        Child: {
          title: "Child",
          oneOf: [
            { $ref: "#/components/schemas/A" },
            { $ref: "#/components/schemas/B" },
            { $ref: "#/components/schemas/Node" },
          ],
          discriminator: {
            propertyName: "type",
            mapping: {
              A: "#/components/schemas/A",
              B: "#/components/schemas/B",
              Node: "#/components/schemas/Node",
            },
          },
        },
        Base: {
          type: "object",
          discriminator: { propertyName: "type" },
          properties: { type: { type: "string" } },
        },
        A: {
          allOf: [
            { $ref: "#/components/schemas/Base" },
            {
              title: "A",
              properties: {
                id: { type: "string" },
                parent: { $ref: "#/components/schemas/Node" },
                children: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Node" },
                },
              },
            },
          ],
        },
        B: {
          title: "B",
          allOf: [
            { $ref: "#/components/schemas/Base" },
            {
              properties: {
                id: { type: "string" },
                parent: { $ref: "#/components/schemas/Node" },
                children: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Node" },
                },
              },
            },
          ],
        },
      })
    );
    const result = SchemaGraph.createFromBundled(openapi);
    expect(Array.from(result.circles.values())).toEqual([
      "#/components/schemas/Node",
    ]);
    expect(Array.from(result.nodes.keys())).toEqual([
      "#/components/schemas/Node",
      "#/components/schemas/Child",
      "#/components/schemas/A",
      "#/components/schemas/Base",
      "#/components/schemas/B",
    ]);
    expect(result.edges).toEqual([
      ["#/components/schemas/Node", "#/components/schemas/Child"],
      ["#/components/schemas/Child", "#/components/schemas/A"],
      ["#/components/schemas/Child", "#/components/schemas/B"],
      ["#/components/schemas/A", "#/components/schemas/Base"],
      ["#/components/schemas/B", "#/components/schemas/Base"],
    ]);
  });

  test("deeply nested circular", () => {
    const openapi: OpenApiBundled = createApi((oa) =>
      withSchemas(oa, {
        Node: {
          title: "Node",
          type: "object",
          properties: {
            id: { type: "string" },
            parent: { $ref: "#/components/schemas/Node" },
            children: {
              type: "array",
              items: { $ref: "#/components/schemas/Child" },
            },
          },
        },
        Child: {
          title: "Child",
          oneOf: [
            { $ref: "#/components/schemas/A" },
            { $ref: "#/components/schemas/B" },
            { $ref: "#/components/schemas/Node" },
          ],
          discriminator: {
            propertyName: "type",
            mapping: {
              A: "#/components/schemas/A",
              B: "#/components/schemas/B",
              Node: "#/components/schemas/Node",
            },
          },
        },
        Base: {
          type: "object",
          discriminator: { propertyName: "type" },
          properties: { type: { type: "string" } },
        },
        A: {
          allOf: [
            { $ref: "#/components/schemas/Base" },
            {
              title: "A",
              properties: {
                parent: { $ref: "#/components/schemas/Child" },
                children: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Node" },
                },
              },
            },
          ],
        },
        B: {
          title: "B",
          allOf: [
            { $ref: "#/components/schemas/Base" },
            {
              properties: {
                parent: { $ref: "#/components/schemas/Child" },
                children: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Node" },
                },
              },
            },
          ],
        },
      })
    );
    const result = SchemaGraph.createFromBundled(openapi);
    expect(Array.from(result.circles.values())).toEqual([
      "#/components/schemas/Node",
      "#/components/schemas/Child",
    ]);
    expect(Array.from(result.nodes.keys())).toEqual([
      "#/components/schemas/Node",
      "#/components/schemas/Child",
      "#/components/schemas/A",
      "#/components/schemas/Base",
      "#/components/schemas/B",
    ]);
    expect(result.edges).toEqual([
      ["#/components/schemas/Node", "#/components/schemas/Child"],
      ["#/components/schemas/Child", "#/components/schemas/A"],
      ["#/components/schemas/Child", "#/components/schemas/B"],
      ["#/components/schemas/A", "#/components/schemas/Base"],
      ["#/components/schemas/B", "#/components/schemas/Base"],
    ]);
  });

  test("3 deeply nested circular", () => {
    const openapi: OpenApiBundled = createApi((oa) =>
      withSchemas(oa, {
        Node: {
          title: "Node",
          type: "object",
          properties: {
            id: { type: "string" },
            parent: { $ref: "#/components/schemas/Node" },
            children: {
              type: "array",
              items: { $ref: "#/components/schemas/Child" },
            },
          },
        },
        Child: {
          title: "Child",
          oneOf: [
            { $ref: "#/components/schemas/A" },
            { $ref: "#/components/schemas/B" },
          ],
          discriminator: {
            propertyName: "type",
            mapping: {
              A: "#/components/schemas/A",
              B: "#/components/schemas/B",
            },
          },
        },
        Base: {
          type: "object",
          discriminator: { propertyName: "type" },
          properties: { type: { type: "string" } },
        },
        A: {
          allOf: [
            { $ref: "#/components/schemas/Base" },
            {
              title: "A",
              properties: {
                children: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Rec" },
                },
              },
            },
          ],
        },
        B: {
          title: "B",
          allOf: [
            { $ref: "#/components/schemas/Base" },
            {
              properties: {
                children: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Rec" },
                },
              },
            },
          ],
        },
        Rec: {
          title: "Rec",
          properties: {
            a: { $ref: "#/components/schemas/A" },
            b: { $ref: "#/components/schemas/B" },
            child: { $ref: "#/components/schemas/Child" },
            node: { $ref: "#/components/schemas/Node" },
          },
        },
      })
    );
    const result = SchemaGraph.createFromBundled(openapi);
    expect(Array.from(result.circles.values())).toEqual([
      "#/components/schemas/Node",
      "#/components/schemas/A",
      "#/components/schemas/Rec",
      "#/components/schemas/Child",
    ]);
    expect(Array.from(result.nodes.keys())).toEqual([
      "#/components/schemas/Node",
      "#/components/schemas/Child",
      "#/components/schemas/A",
      "#/components/schemas/Base",
      "#/components/schemas/Rec",
      "#/components/schemas/B",
    ]);
    expect(result.edges).toEqual([
      ["#/components/schemas/Node", "#/components/schemas/Child"],
      ["#/components/schemas/Child", "#/components/schemas/A"],
      ["#/components/schemas/Child", "#/components/schemas/B"],
      ["#/components/schemas/A", "#/components/schemas/Base"],
      ["#/components/schemas/Rec", "#/components/schemas/B"],
      ["#/components/schemas/B", "#/components/schemas/Base"],
    ]);
  });
});

function createApi(
  ...mods: Array<(oa: OpenApiBundled) => OpenApiBundled>
): OpenApiBundled {
  const api: OpenApiBundled = {
    openapi: "3.0.3",
    info: { version: "", title: "" },
    paths: {},
    components: {
      schemas: {},
    },
  };
  return mods.reduce((acc, curr) => curr(acc), api);
}

function withSchemas(
  oa: OpenApiBundled,
  schemas: NonNullable<oas30.ComponentsObject["schemas"]>
): OpenApiBundled {
  return {
    ...oa,
    components: {
      ...oa.components,
      schemas: {
        ...(oa.components?.schemas ?? {}),
        ...schemas,
      },
    },
  };
}
