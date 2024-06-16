import process from "process";
import {  createTsPostProcessor } from "./post-process/index.js";
import { generateTypescriptAxios, generateZodSchemas, TsAxiosPublicGenOptions } from "./generators/index.js";
import { File, Folder } from "@dasaplan/ts-sdk";
import { log } from "./logger.js";
import { ZodGenOptions } from "./generators/zod/zod-schemas.js";
import {bundleOpenapi, createSpecProcessor, OpenApiBundled} from "@dasaplan/openapi-bundler";

export async function generateOpenapi(specFilePath: string, outputFile: string, params?: { clearTemp: boolean }) {
  try {
    const { bundledFilePath, parsed } = await bundle(specFilePath);
    const { outDir } = await generateTsAxios(bundledFilePath, outputFile, { generateZod: true });
    await generateZod(parsed, outputFile, { includeTsTypes: true });

    // save spec where the code is generated
    Folder.of(outDir).writeYml(File.of(bundledFilePath).name, parsed);

    if (params?.clearTemp ?? true) Folder.temp().clear();
    return outDir;
  } catch (e: unknown) {
    if (e instanceof Error) {
      log.error(`${e.name}: ${e.message}`);
    } else {
      log.error(`Something went wrong: ${JSON.stringify(e)}`);
    }
    process.exit(1);
  }
}

export async function bundle(spec: string) {
  const { parsed, outFile: bundledFilePath } = await bundleOpenapi(spec, {
    postProcessor: createSpecProcessor({ mergeAllOf: true, ensureDiscriminatorValues: true }),
  });
  return { parsed, bundledFilePath };
}

export async function generateTsAxios(bundledFilePath: string, output: string, options?: TsAxiosPublicGenOptions) {
  const outDir = generateTypescriptAxios(bundledFilePath, output, {
    generateZod: true,
    postProcessor: createTsPostProcessor({ deleteUnwantedFiles: true, ensureDiscriminatorValues: true }),
    ...(options ?? {}),
  });
  return { outDir };
}

export async function generateZod(bundled: OpenApiBundled, output: string, options: ZodGenOptions) {
  const outFilePath = await generateZodSchemas(bundled, File.of(output, "zod.ts").absolutPath, options);
  return { outFilePath };
}
