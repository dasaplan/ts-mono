import {_, File, Folder} from "@dasaplan/ts-sdk";
import { generateZodClientFromOpenAPI } from "openapi-zod-client";
import { childLog } from "../../logger.js";
import { OpenApiBundled } from "@dasaplan/openapi-bundler";


const PATH_TEMPLATE = "../../templates/schemas-only.hbs";

/*
 * So the standard generator does not meet the requirements we have to create typesafe types.
 * Extending existing generators felt like tinkering a lot because changes on the input data model are needed.
 * This fundamental change needs a deep understanding of the problem domain which is best gathered by having running into the problems the generator try to solve.
 * Hence, we create an own generator and when we see, we are going in a similar direction as an existing generator, we will switch to that project.
 */
/** @deprecated does not meet requirements*/
export async function generateZodSchemas(openapiSpec: OpenApiBundled, outDir: string, params?: { postProcessor?: (api: string) => string }) {
  childLog(generateZodSchemas).info(`start generate: %s`, outDir);
  const outFilePath = File.of(outDir, "zod.ts").absolutPath;
  const templatePath = File.resolve(PATH_TEMPLATE).absolutPath;
  await generateZodClientFromOpenAPI({
    distPath: outFilePath,
    openApiDoc: openapiSpec,
    templatePath: templatePath,
  });

  if (_.isDefined(params?.postProcessor)) params.postProcessor(outFilePath);
  return outFilePath;
}
