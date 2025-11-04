import { fileURLToPath } from "url";
import path from "path";
import { ApplicationError, Folder } from "@dasaplan/ts-sdk";
import { appLog } from "./logger.js";

export namespace TemplateDir {
  let _tempFolder: Folder | undefined = undefined;

  function init(): Folder {
    const localTempDir = Folder.cwd("templates");
    if (localTempDir.exists()) {
      const isValid = localTempDir.lsFiles().length > 0;
      if (isValid) {
        _tempFolder = localTempDir;
        appLog.log.debug(`init template dir from user: ${_tempFolder.absolutePath}`);
        return _tempFolder;
      }
    }

    const packageRoot = fileURLToPath(import.meta.resolve("@dasaplan/openapi"));
    const templates = path.resolve(packageRoot, "..", "templates");
    const packageTemplates = Folder.of(templates);
    if (packageTemplates.exists()) {
      _tempFolder = packageTemplates;
      appLog.log.debug(`init template dir from package: ${_tempFolder.absolutePath}`);
      return _tempFolder;
    }

    throw ApplicationError.create(
      "Failed initializing template directory! Templates are expected to exists in the npm package or in the current working directory (cwd)",
    );
  }

  export function copyToCwd() {
    const tmp = getTmpDir();
    appLog.log.info("copy templates:", tmp.absolutePath, tmp.copyTo(Folder.cwd("templates")).absolutePath);
  }

  export function getTmpDir() {
    if (_tempFolder === undefined) {
      return init();
    }
    return _tempFolder;
  }
}
