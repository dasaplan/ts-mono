import { OpenapiBundledMock, bundleOpenapi, createSpecProcessor, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { ExampleSpec, resolveSpecPath } from "openapi-example-specs";
import { generateTsSources, TsTypeGenOptions } from "./ts_generator.js";
import { describe, test, expect } from "vitest";

const options: () => TsTypeGenOptions = () => ({
  typeNameSuffix: "",
});

describe("generatets_vanilla", () => {
  const { withSchemas, createApi } = OpenapiBundledMock.create();

  test.each([
    "pets-simple/pets-api.yml",
    "pets-modular/pets-api.yml",
    "pets-modular-complex/petstore-api.yml",
    "generic/api.yml",
    "pets-recursive/pets-api.yml",
  ] satisfies Array<ExampleSpec>)("generates %s", async (spec) => {
    const api = resolveSpecPath(spec);
    const { parsed } = await bundleOpenapi(api, {
      postProcessor: createSpecProcessor({
        mergeAllOf: true,
        ensureDiscriminatorValues: true,
        xOmit: true,
      }),
    });
    const name = spec.replace(".yml", "");
    const { sourceFile } = await generateTsSources(parsed, `tmp/ts_vanilla/${name}.ts`, options());

    expect(sourceFile.getFullText()).toMatchSnapshot(name);
  });

  test("fullmetal", async () => {
    const spec = "fullmetal/openapi.yml";
    const api = resolveSpecPath(spec);
    const { parsed } = await bundleOpenapi(api, {
      postProcessor: createSpecProcessor({
        mergeAllOf: true,
        ensureDiscriminatorValues: true,
        xOmit: true,
      }),
    });
    const name = spec.replace(".yaml", "");
    const { sourceFile } = await generateTsSources(parsed, `tmp/ts_vanilla/${name}.ts`, options());

    expect(sourceFile.getFullText()).toMatchSnapshot(name);
  });

  test("circular schema", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Node: {
          type: "object",
          properties: {
            id: { type: "string" },
            parent: { $ref: "#/components/schemas/Node" },
            children: { type: "array", items: { $ref: "#/components/schemas/Node" } },
          },
        },
      }),
    );

    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/circular.ts`, options());

    expect(sourceFile.getFullText()).toMatchSnapshot("circular");
  });

  test("default", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Node: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
            name: { type: "string", default: "foo" },
            tel: { type: "number", default: 123456 },
            isNice: { type: "boolean", default: false },
            hobbies: { type: "string", enum: ["a", "b", "c"], default: "b" },
          },
        },
      }),
    );

    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/defaults.ts`, options());

    expect(sourceFile.getFullText()).toMatchInlineSnapshot(`
      "
      export namespace Types {
          export type Node = { id: string; name: string | undefined; tel: number | undefined; isNice: boolean | undefined; hobbies: "a" | "b" | "c" | undefined };
      }
      "
    `);
  });

  test("property name does not change when entity is referenced", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Node: {
          type: "object",
          properties: {
            id: { type: "string" },
            refEntity: { $ref: "#/components/schemas/SomeEntity" },
            refEntity2: { $ref: "#/components/schemas/SomeEntity" },
          },
        },
        SomeEntity: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      }),
    );

    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "export namespace Types {
          export type SomeEntity = { name: string | undefined };
          export type Node = { id: string | undefined; refEntity: Types.SomeEntity | undefined; refEntity2: Types.SomeEntity | undefined };
      }"
    `);
  });
  test("unions have discriminator property required and have at least two schemas", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        A: {
          title: "A",
          properties: {
            id: { type: "string" },
            type: { type: "string" },
          },
        },
        B: {
          title: "B",
          properties: {
            id: { type: "string" },
            type: { type: "string" },
          },
        },
        SingleUnion: {
          oneOf: [{ $ref: "#/components/schemas/A" }],
          discriminator: { propertyName: "type", mapping: { A_TYPE: "#/components/schemas/A" } },
        },
        Union: {
          oneOf: [{ $ref: "#/components/schemas/A" }],
          discriminator: { propertyName: "type", mapping: { A_TYPE: "#/components/schemas/A", AA_TYPE: "#/components/schemas/A" } },
        },
        MultiUnion: {
          oneOf: [{ $ref: "#/components/schemas/A" }, { $ref: "#/components/schemas/B" }],
          discriminator: { propertyName: "type", mapping: { A_TYPE: "#/components/schemas/A", B_TYPE: "#/components/schemas/B" } },
        },
      }),
    );
    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "export namespace Types {
          export type B = { id: string | undefined; type: "B_TYPE" };
          export type A = { id: string | undefined; type: "A_TYPE" | "AA_TYPE" };
          export type MultiUnion = Types.A | Types.B;
          export type Union = Types.A | Types.A;
          export type SingleUnion = Types.A;
      }"
    `);
  });

  test("deeply nested circular schema", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Node: {
          title: "Node",
          type: "object",
          properties: {
            id: { type: "string" },
            parent: { $ref: "#/components/schemas/Node" },
            children: { type: "array", items: { $ref: "#/components/schemas/Child" } },
          },
        },
        Child: {
          title: "Child",
          oneOf: [{ $ref: "#/components/schemas/A" }, { $ref: "#/components/schemas/B" }, { $ref: "#/components/schemas/Node" }],
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
                children: { type: "array", items: { $ref: "#/components/schemas/Node" } },
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
                children: { type: "array", items: { $ref: "#/components/schemas/Node" } },
              },
            },
          ],
        },
      }),
    );
    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "export namespace Types {
          export type Base = { type: string | undefined };
          export type B = Types.Base & { id: string | undefined; parent: Types.Node | undefined; children: Array<Types.Node> | undefined; type: "B" };
          export type A = Types.Base & { id: string | undefined; parent: Types.Node | undefined; children: Array<Types.Node> | undefined; type: "A" };
          export type Child = Types.A | Types.B | Types.Node;
          export type Node = { id: string | undefined; parent: Types.Node | undefined; children: Array<Types.Child> | undefined };
      }"
    `);
  });

  test("deeply nested multi circular schema", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Node: {
          title: "Node",
          type: "object",
          properties: {
            id: { type: "string" },
            parent: { $ref: "#/components/schemas/Node" },
            children: { type: "array", items: { $ref: "#/components/schemas/Child" } },
          },
        },
        Child: {
          title: "Child",
          oneOf: [{ $ref: "#/components/schemas/A" }, { $ref: "#/components/schemas/B" }, { $ref: "#/components/schemas/Node" }],
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
                children: { type: "array", items: { $ref: "#/components/schemas/Node" } },
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
                children: { type: "array", items: { $ref: "#/components/schemas/Node" } },
              },
            },
          ],
        },
      }),
    );
    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "export namespace Types {
          export type Base = { type: string | undefined };
          export type B = Types.Base & { parent: Types.Child | undefined; children: Array<Types.Node> | undefined; type: "B" };
          export type A = Types.Base & { parent: Types.Child | undefined; children: Array<Types.Node> | undefined; type: "A" };
          export type Child = Types.A | Types.B | Types.Node;
          export type Node = { id: string | undefined; parent: Types.Node | undefined; children: Array<Types.Child> | undefined };
      }"
    `);
  });

  test("deeply 3 deep nested multi circular schema", async () => {
    const openapi: OpenApiBundled = createApi(
      withSchemas({
        Node: {
          title: "Node",
          type: "object",
          properties: {
            id: { type: "string" },
            parent: { $ref: "#/components/schemas/Node" },
            children: { type: "array", items: { $ref: "#/components/schemas/Child" } },
          },
        },
        Child: {
          title: "Child",
          oneOf: [{ $ref: "#/components/schemas/A" }, { $ref: "#/components/schemas/B" }],
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
                children: { type: "array", items: { $ref: "#/components/schemas/Rec" } },
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
                children: { type: "array", items: { $ref: "#/components/schemas/Rec" } },
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
      }),
    );
    const { sourceFile } = await generateTsSources(openapi, `tmp/ts_vanilla/circular.ts`, options());

    expect(sourceFile.getFullText().trim()).toMatchInlineSnapshot(`
      "export namespace Types {
          export type Base = { type: string | undefined };
          export type B = Types.Base & { children: Array<Types.Rec> | undefined; type: "B" };
          export type Rec = { a: Types.A | undefined; b: Types.B | undefined; child: Types.Child | undefined; node: Types.Node | undefined };
          export type A = Types.Base & { children: Array<Types.Rec> | undefined; type: "A" };
          export type Child = Types.A | Types.B;
          export type Node = { id: string | undefined; parent: Types.Node | undefined; children: Array<Types.Child> | undefined };
      }"
    `);
  });
});
