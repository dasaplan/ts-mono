import { OpenApiBundled } from "./bundle.js";
import { oas30 } from "openapi3-ts";

export module BundleMock {
  export function create() {
    return {
      createApi,
      withRoute,
      withSchemas,
      withObjectSchema,
      withSchema,
      factory: {
        schemaRef,
      },
    };
  }

  function schemaRef(name: string) {
    return { $ref: `#/components/schemas/${name}` };
  }

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
    schemas: NonNullable<oas30.ComponentsObject["schemas"]>
  ): (oa: OpenApiBundled) => OpenApiBundled {
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

  function withObjectSchema(name: string, schema: oas30.SchemaObject) {
    return (oa: OpenApiBundled) => ({
      ...oa,
      components: {
        ...oa.components,
        schemas: {
          ...(oa.components?.schemas ?? {}),
          [name]: { ...schema, type: "object" } satisfies oas30.SchemaObject,
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
          [name]: { ...schema, type: "object" } satisfies oas30.SchemaObject,
        },
      },
    });
  }

  function withRoute(
    routes: NonNullable<oas30.PathsObject>
  ): (oa: OpenApiBundled) => OpenApiBundled {
    return (oa: OpenApiBundled) => ({
      ...oa,
      paths: {
        ...oa.paths,
        ...routes,
      },
    });
  }
}