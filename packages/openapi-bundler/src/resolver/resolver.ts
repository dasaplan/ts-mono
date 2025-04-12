import { OpenApiBundled } from "../bundle.js";
import { oas30 } from "openapi3-ts";
import { isRef } from "@redocly/openapi-core";
import pointer from "jsonpointer";
import { _ } from "@dasaplan/ts-sdk";
import { OaComponent } from "./model.js";

export type WithOptionalRef<T extends oas30.ReferenceObject | OaComponent> = Exclude<T, oas30.ReferenceObject> & { "::ref"?: string; $ref?: string };
type WithoutRef<T extends oas30.ReferenceObject | OaComponent> = Exclude<T, oas30.ReferenceObject>;

export interface Resolver {
  root: OpenApiBundled;
  resolveRefOptional<T extends oas30.ReferenceObject | OaComponent>(data: T | undefined): WithOptionalRef<T> | undefined;
  resolveRef<T extends oas30.ReferenceObject | OaComponent = oas30.SchemaObject | OaComponent>(
    data: T,
    params?: { deleteRef: boolean },
  ): typeof params extends { deletedRef: true } ? WithoutRef<T> : WithOptionalRef<T>;
  resolveRefImmutable<T extends oas30.ReferenceObject | OaComponent>(
    data: T | { $ref: string },
    params?: { deleteRef: boolean },
  ): typeof params extends { deletedRef: true } ? WithoutRef<T> : WithOptionalRef<T>;
}

export namespace Resolver {
  export function create(bundled: OpenApiBundled): Resolver {
    return {
      root: bundled,
      resolveRefOptional<T extends oas30.ReferenceObject | OaComponent>(data: T | { $ref: string } | undefined): WithOptionalRef<T> | undefined {
        if (_.isNil(data)) {
          return undefined;
        }
        if (!isRef(data)) {
          return data as WithOptionalRef<T>;
        }
        const ref = data.$ref;
        try {
          const propPath = ref.replace("#/", "/");
          const resolved = pointer.get(this.root, propPath);
          // eslint-disable-next-line
          (resolved as any)["::ref"] = ref;
          return resolved;
        } catch {
          throw `Error: could not resolve ref ${ref}`;
        }
      },
      resolveRef<T extends oas30.ReferenceObject | OaComponent>(
        data: { $ref: string } | unknown,
        params?: { deleteRef: boolean },
      ): typeof params extends { deletedRef: true } ? WithoutRef<T> : WithOptionalRef<T> {
        if (!isRef(data)) {
          return data as WithOptionalRef<T>;
        }
        const ref = data.$ref;
        try {
          const propPath = ref.replace("#/", "/");
          if (params?.deleteRef ?? false) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (data as any).$ref;
          }
          return pointer.get(this.root, propPath);
        } catch {
          throw `Error: could not resolve ref ${ref}`;
        }
      },
      resolveRefImmutable<T extends oas30.ReferenceObject | OaComponent>(
        _data: T | { $ref: string } | unknown,
        params?: { deleteRef: boolean },
      ): typeof params extends { deletedRef: true } ? WithoutRef<T> : WithOptionalRef<T> {
        const data = _.cloneDeep(_data);
        if (!isRef(data)) {
          return data as WithOptionalRef<T>;
        }
        const ref = data.$ref;
        try {
          const propPath = ref.replace("#/", "/");
          if (params?.deleteRef ?? false) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (data as any).$ref;
          }
          return _.cloneDeep(pointer.get(this.root, propPath));
        } catch {
          throw `Error: could not resolve ref ${ref}`;
        }
      },
    };
  }
}
