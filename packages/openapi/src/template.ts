import { fileURLToPath } from "url";
import path from "path";
import { Folder } from "@dasaplan/ts-sdk";
import { appLog } from "./logger.js";

export namespace TemplateDir {
  function isInit() {
    const exists = Folder.cwd("templates").readAllFilesAsString().length > 0;
    appLog.log.info("templates exists:", exists);
    return exists;
  }

  function init() {
    const packageRoot = fileURLToPath(import.meta.resolve("@dasaplan/openapi"));
    const templates = path.resolve(packageRoot, "..", "templates");
    const tmp = Folder.of(templates);
    appLog.log.info("copy templates:", tmp.absolutePath, tmp.copyTo(Folder.cwd("templates")).absolutePath);
  }

  export function getTmpDir() {
    if (!isInit()) {
      init();
    }
    return Folder.cwd("templates");
  }
}
