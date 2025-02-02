import { createTsPostProcessor } from "./post-process/index.js";
import { generateTypescriptAxios, TsAxiosPublicGenOptions } from "./generators/index.js";
import { _, ApplicationError, File, Folder } from "@dasaplan/ts-sdk";
import { bundleOpenapi, createSpecProcessor, OpenApiBundled } from "@dasaplan/openapi-bundler";
import { generateZodSchemas } from "@dasaplan/openapi-codegen-zod";
import { generateEndpointDefinitionsFromBundled } from "@dasaplan/openapi-codegen-endpoints";
import { Project } from "ts-morph";

export interface ExperimentalFeatures {
  experimental?: never;
}
export async function generateOpenapi(
  specFilePath: string,
  outputFile: string,
  params?: { clearTemp: boolean; tempFolder?: string } & TsAxiosPublicGenOptions & ExperimentalFeatures,
) {
  try {
    const { bundledFilePath, parsed } = await bundle(specFilePath, { tempFolder: params?.tempFolder });
    const { outDir } = await generateTsAxios(bundledFilePath, outputFile, { generateZod: true });

    const out = Folder.of(outDir).create();
    await generateZod(parsed, out);
    await generateEndpoints(parsed, out);

    // save spec where the code is generated
    out.writeYml(File.of(specFilePath).name, parsed);

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
    postProcessor: createSpecProcessor(),
  });
  return { parsed, bundledFilePath };
}

export async function generateTsAxios(bundledFilePath: string, output: string, options?: TsAxiosPublicGenOptions) {
  const outDir = await generateTypescriptAxios(bundledFilePath, output, {
    generateZod: true,
    postProcessor: createTsPostProcessor({ deleteUnwantedFiles: true, ensureDiscriminatorValues: true }),
    ...(options ?? {}),
  });
  return { outDir };
}

async function generateZod(parsed: OpenApiBundled, out: Folder) {
  await generateZodSchemas(parsed, out.makeFile("zod.ts").absolutePath, { includeTsTypes: true });
}

async function generateEndpoints(parsed: OpenApiBundled, out: Folder) {
  const { endpointFileName, endpointFilePath } = await generateEndpointDefinitionsFromBundled(parsed, { outDir: out.absolutePath });
  const endpointFile = File.of(endpointFilePath);

  // add export to index.ts
  const project = new Project();
  project.addSourceFileAtPath(endpointFile.absolutePath);
  const _indexSrc = project.addSourceFileAtPath(out.makeFile("index.ts").absolutePath);
  _indexSrc.addExportDeclaration({
    moduleSpecifier: `./${endpointFileName.replace(".ts", ".js")}`,
  });
  project.saveSync();
}
