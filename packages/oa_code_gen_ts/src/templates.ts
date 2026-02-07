import { ApplicationError, Folder, Imports } from "@dasaplan/ts-sdk";

export namespace Templates {
  interface TemplateConfig {
    devRoot: string;
    distRoot: string;
  }
  /**
   * We look for the templates folder either provided by the user on root level (local),
   * In the distribution (dis) or when in development directly from the src.
   * @param cfg
   */
  export function folder(cfg: TemplateConfig) {
    // using template from the development source
    const develop = Folder.of(cfg.devRoot).cd("templates");
    if (develop.exists()) {
      return develop;
    }

    // using template from the root executable
    const local = Folder.of("templates");
    if (local.exists()) {
      return local;
    }

    // using template from the distributed package
    const libPath = Imports.resolve("@dasaplan/openapi-codegen-ts");
    const lib = Folder.of(libPath).cd(cfg.distRoot, "templates");
    if (lib.exists()) {
      return lib;
    }

    throw ApplicationError.create(`could not find templates folder - should be distributed with the npm package}`);
  }

  export function getTemplateFile(name: string, cfg: TemplateConfig) {
    return folder(cfg).makeFile(name);
  }
}
