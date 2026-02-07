import { ApplicationError, Folder, Imports } from "@dasaplan/ts-sdk";

export namespace Templates {
  export function folder() {
    const libPath = Imports.resolve("@dasaplan/openapi-codegen-ts");
    const lib = Folder.of(libPath).cd("client/endpoint/templates");
    if (lib.exists()) {
      return lib;
    }

    const local = Folder.of("templates");
    if (local.exists()) {
      return local;
    }
    const develop = Folder.of("dist/client/endpoint/templates");
    if (develop.exists()) {
      return develop;
    }
    throw ApplicationError.create(`could not find templates folder - should be distributed with the node package}`);
  }

  export function getTemplateFile(name: string) {
    return folder().makeFile(name);
  }
}
