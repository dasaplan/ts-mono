import { appLog } from "../logger.js";
import { File, Folder } from "@dasaplan/ts-sdk";
import { OaGenerator } from "./oa-generator.js";

export async function generateJava(openapiSpec: string, out: string) {
  const log = appLog.childLog(generateJava);
  log.info(`start generate:`, openapiSpec, out);

  const outDir = Folder.of(out);

  const sanitizedInput = {
    specPath: File.of(openapiSpec).normalize().absolutePath,
    outDirPath: outDir.normalize().absolutePath,
  };

  await OaGenerator.generate(
    {
      "--generator-name": "spring",
      "--input-spec": sanitizedInput.specPath,
      "--output": sanitizedInput.outDirPath,
    },
    { enumUnknownDefaultCase: true }
  );

  return sanitizedInput.outDirPath;
}
