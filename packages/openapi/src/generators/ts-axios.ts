import path from "path";
import process from "process";
import child_process from "node:child_process";
import { File } from "@dasaplan/ts-sdk";
import { childLog } from "../logger.js";
import { TemplateDir } from "../template.js";

export interface TsAxiosPublicGenOptions {
  generateZod?: boolean;
}
export interface TsAxiosInternalOptions extends TsAxiosPublicGenOptions {
  postProcessor?: (api: string) => string;
}
export function generateTypescriptAxios(openapiSpec: string, out: string, params?: TsAxiosInternalOptions) {
  childLog(generateTypescriptAxios).info(`start generate:`, openapiSpec, out);

  const outDir = path.isAbsolute(out) ? out : path.resolve(process.cwd(), out);

  const zodEnabled = params?.generateZod ? "zodEnabled" : "zodDisabled";
  const templates = TemplateDir.getTmpDir();

  child_process.execSync(
    `npx openapi-generator-cli generate -g typescript-axios --skip-validate-spec -i "${openapiSpec}" -o "${outDir}" -t "${templates.absolutePath}" --additional-properties ${zodEnabled}`
  );
  const apiFile = File.of(outDir, "api.ts");
  if (params?.postProcessor) params.postProcessor(apiFile.absolutPath);

  return outDir;
}
