import { OpenApiBundled } from "./bundle.js";
import { oas30 } from "openapi3-ts";

export module BundleMock {
  export function create() {
    return {
      createApi,
      withRoute,
      withSchemas,
      withSchema,
      factory: {
        schemaRef,
        mockSchema,
        mockXOmit,
      },
    };
  }

  type XOmitConfig = {
    required: Array<string> | boolean;
    properties: Record<string, boolean> | boolean;
  } & {
    [prop in Exclude<keyof oas30.SchemaObject, "required" | "properties">]?: boolean;
  };

  function mockXOmit(config: Partial<XOmitConfig>) {
    return { "x-omit": config };
  }

  function schemaRef(name: string) {
    return { $ref: `#/components/schemas/${name}` };
  }

  function mockSchema(schema: oas30.SchemaObject): oas30.SchemaObject {
    if (schema.allOf || schema.oneOf || schema.anyOf) {
      return { ...schema };
    }
    return { type: "object", ...schema };
  }

  function createApi(...mods: Array<(oa: OpenApiBundled) => OpenApiBundled>): OpenApiBundled {
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

  function withSchemas(schemas: NonNullable<oas30.ComponentsObject["schemas"]>): (oa: OpenApiBundled) => OpenApiBundled {
    return (oa: OpenApiBundled) => ({
      ...oa,
      components: {
        ...oa.components,
        schemas: {
          ...(oa.components?.schemas ?? {}),
          ...schemas,
        },
      },
    });
  }

  function withSchema(name: string, schema: oas30.SchemaObject) {
    return (oa: OpenApiBundled) => ({
      ...oa,
      components: {
        ...oa.components,
        schemas: {
          ...(oa.components?.schemas ?? {}),
          [name]: mockSchema(schema) satisfies oas30.SchemaObject,
        },
      },
    });
  }

  function withRoute(routes: NonNullable<oas30.PathsObject>): (oa: OpenApiBundled) => OpenApiBundled {
    return (oa: OpenApiBundled) => ({
      ...oa,
      paths: {
        ...oa.paths,
        ...routes,
      },
    });
  }
}
