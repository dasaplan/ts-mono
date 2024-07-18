import path from "path";
import process from "process";
import child_process from "node:child_process";
import { appLog } from "../logger.js";

export function generateJava(openapiSpec: string, out: string) {
  appLog.childLog(generateJava).info(`start generate:`, openapiSpec, out);
  const options = {
    enumUnknownDefaultCase: true,
  };
  const additionalProperties = Object.entries(options)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");
  const outDir = path.isAbsolute(out) ? out : path.resolve(process.cwd(), out, "java");
  child_process.execSync(
    `npx openapi-generator-cli generate -g spring --skip-validate-spec -i "${openapiSpec}" -o "${outDir}" --additional-properties=${additionalProperties}`
  );

  return outDir;
}
