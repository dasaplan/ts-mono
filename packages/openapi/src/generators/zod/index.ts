import { childLog } from "../../logger.js";
import { File } from "@dasaplan/node-sdk";

import { OpenApiBundled } from "../../bundle.js";
import { generateZod, ZodGenOptions } from "./zod-schemas.js";

export async function generateZodSchemas(openapiSpec: OpenApiBundled, outFile: string, options?: ZodGenOptions) {
  childLog(generateZodSchemas).info(`start generate: %s`, outFile);
  const outFilePath = File.of(outFile).absolutPath;
  const { sourceFile } = await generateZod(openapiSpec, File.resolve(outFile).absolutPath, options);
  sourceFile.saveSync();
  return outFilePath;
}
