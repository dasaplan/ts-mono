import { createTsPostProcessor } from "./post-process/index.js";
import { generateTypescriptAxios, TsAxiosPublicGenOptions } from "./generators/index.js";
import { _, ApplicationError, File, Folder } from "@dasaplan/ts-sdk";
import { bundleOpenapi, createSpecProcessor, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { generateZodSchemas, ZodGenOptions } from "@dasaplan/openapi-codegen-zod";

export async function generateOpenapi(specFilePath: string, outputFile: string, params?: { clearTemp: boolean; tempFolder?: string }) {
  try {
    const { bundledFilePath, parsed } = await bundle(specFilePath, { tempFolder: params?.tempFolder });
    const { outDir } = await generateTsAxios(bundledFilePath, outputFile, { generateZod: true });
    await generateZod(parsed, outputFile, { includeTsTypes: true });

    // save spec where the code is generated
    Folder.of(outDir).writeYml(File.of(specFilePath).name, parsed);

    if (params?.clearTemp ?? true) {
      const tmp = _.isDefined(params?.tempFolder) ? Folder.of(params?.tempFolder) : Folder.temp();
      tmp.clear();
    }

    return outDir;
  } catch (e: unknown) {
    throw ApplicationError.create(`Failed generating from spec ${specFilePath}`).chainUnknown(e);
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
  const outFilePath = await generateZodSchemas(bundled, File.of(output, "zod.ts").absolutePath, options);
  return { outFilePath };
}
