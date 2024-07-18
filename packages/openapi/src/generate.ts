import process from "process";
import { createTsPostProcessor } from "./post-process/index.js";
import { generateTypescriptAxios, TsAxiosPublicGenOptions } from "./generators/index.js";
import { File, Folder } from "@dasaplan/ts-sdk";
import { appLog } from "./logger.js";
import { bundleOpenapi, createSpecProcessor, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { generateZodSchemas, ZodGenOptions } from "@dasaplan/openapi-codegen-zod";

export async function generateOpenapi(specFilePath: string, outputFile: string, params?: { clearTemp: boolean; tempFolder?: string }) {
  try {
    const { bundledFilePath, parsed } = await bundle(specFilePath, { tempFolder: params?.tempFolder });
    const { outDir } = await generateTsAxios(bundledFilePath, outputFile, { generateZod: true });
    await generateZod(parsed, outputFile, { includeTsTypes: true });

    // save spec where the code is generated
    Folder.of(outDir).writeYml(File.of(bundledFilePath).name, parsed);

    if (params?.clearTemp ?? true) Folder.temp().clear();
    return outDir;
  } catch (e: unknown) {
    if (e instanceof Error) {
      appLog.log.error(`${e.name}: ${e.message}`);
    } else {
      appLog.log.error(`Something went wrong: ${JSON.stringify(e)}`);
    }
    process.exit(1);
  }
}

export async function bundle(spec: string, params?: { tempFolder?: string }) {
  const { parsed, outFile: bundledFilePath } = await bundleOpenapi(spec, {
    outFile: params?.tempFolder,
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
