import { ApplicationError, Folder } from "@dasaplan/ts-sdk";

export module Templates {
  export function folder() {
    const local = Folder.of("templates", { createIfNotExists: false });
    if (local.exists()) {
      return local;
    }
    const develop = Folder.of("dist/templates", { createIfNotExists: false });
    if (develop.exists()) {
      return develop;
    }
    throw ApplicationError.create(`could not find templates folder - should be distributed with the node package}`);
  }

  export function getTemplateFile(name: string) {
    return folder().makeFile(name);
  }
}
