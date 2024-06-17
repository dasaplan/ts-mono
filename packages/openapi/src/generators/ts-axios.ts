import path from "path";
import process from "process";
import child_process from "node:child_process";
import url from "url";
import { File, Folder } from "@dasaplan/ts-sdk";
import { childLog } from "../logger.js";

const TEMPLATE_DIR = "../../templates";
export interface TsAxiosPublicGenOptions {
  generateZod?: boolean;
}
export interface TsAxiosInternalOptions extends TsAxiosPublicGenOptions {
  postProcessor?: (api: string) => string;
}
export function generateTypescriptAxios(openapiSpec: string, out: string, params?: TsAxiosInternalOptions) {
  childLog(generateTypescriptAxios).info(`start generate:`, openapiSpec, out);

  const outDir = path.isAbsolute(out) ? out : path.resolve(process.cwd(), out);
  const templateDirPath = Folder.cwd(TEMPLATE_DIR).absolutePath;
  const zodEnabled = params?.generateZod ? "zodEnabled" : "zodDisabled";

  const tempInCwd = Folder.cwd("templates");
  /* fixme: when templates live in node modules, we copy them here
      - we should change the path to be aware of the true src of the templates and use it.
      - keep in mind that we fetch in multiple files the path
      - to avoid regression, first extract current behaviour, so we can switch the path safe and without issues. */
  const shouldCopyToCwd = templateDirPath !== tempInCwd.absolutePath;
  const templates = shouldCopyToCwd ? Folder.of(templateDirPath).copyTo(tempInCwd) : Folder.of(templateDirPath);
  child_process.execSync(
    `npx openapi-generator-cli generate -g typescript-axios --skip-validate-spec -i "${openapiSpec}" -o "${outDir}" -t "${templates.absolutePath}" --additional-properties ${zodEnabled}`
  );
  const apiFile = File.of(outDir, "api.ts");
  if (params?.postProcessor) params.postProcessor(apiFile.absolutPath);

  return outDir;
}
