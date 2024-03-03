import path from "path";
import process from "process";
import child_process from "node:child_process";
import url from "url";
import { File, Folder } from "@dasaplan/node-sdk";
import { childLog } from "../logger.js";

const dirname = url.fileURLToPath(new URL(".", import.meta.url));
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
  const templateDirPath = Folder.resolve(dirname, TEMPLATE_DIR).absolutePath;
  const zodEnabled = params?.generateZod ? "zodEnabled" : "zodDisabled";

  const templates = Folder.of(templateDirPath).copyTo(Folder.cwd("templates"))
  child_process.execSync(
    `openapi-generator-cli generate -g typescript-axios --skip-validate-spec -i "${openapiSpec}" -o "${outDir}" -t "${templates.absolutePath}" --additional-properties ${zodEnabled}`
  );
  const apiFile = File.of(outDir, "api.ts");
  if (params?.postProcessor) params.postProcessor(apiFile.absolutPath);

  return outDir;
}
