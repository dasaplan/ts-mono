import child_process from "node:child_process";
import { Folder } from "@dasaplan/ts-sdk";
import { appLog } from "../logger.js";
import { TemplateDir } from "../template.js";

export interface TsAxiosPublicGenOptions {
  generateZod?: boolean;
}
export interface TsAxiosInternalOptions extends TsAxiosPublicGenOptions {
  postProcessor?: (api: string) => string;
}
export function generateTypescriptAxios(openapiSpec: string, out: string, params?: TsAxiosInternalOptions) {
  appLog.childLog(generateTypescriptAxios).info(`start generate:`, openapiSpec, out);

  const outDir = Folder.of(out);

  const zodEnabled = params?.generateZod ? "zodEnabled" : "zodDisabled";
  const templates = TemplateDir.getTmpDir();

  child_process.execSync(
    `npx openapi-generator-cli generate -g typescript-axios --skip-validate-spec -i "${openapiSpec}" -o "${outDir.absolutePath}" -t "${templates.absolutePath}" --additional-properties ${zodEnabled}`
  );
  const apiFile = outDir.makeFile("api.ts");
  if (params?.postProcessor) params.postProcessor(apiFile.absolutePath);

  return outDir.absolutePath;
}
