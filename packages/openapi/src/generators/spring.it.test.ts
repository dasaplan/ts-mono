import { Folder, File } from "@dasaplan/ts-sdk";
import { generateJava } from "./spring.js";
import { bundleOpenapi, createSpecProcessor } from "@dasaplan/openapi-bundler";
import { resolveSpecPath } from "openapi-example-specs";
import path from "path";
import { describe, test, expect, beforeAll } from "vitest";

describe("Generator", () => {
  const spec = "pets-modular/pets-api.yml";
  const out = Folder.resolve(__dirname, "..", "..", "test/out/java-unit");

  beforeAll(() => {
    out.deleteSelf();
  });

  test("generate java", async () => {
    const { outFile: bundled } = await bundleOpenapi(resolveSpecPath(spec), {
      outFile: out.makeFile(`pets-modular-pets-api-java-bundled.yml`).absolutePath,
      postProcessor: createSpecProcessor({
        ensureDiscriminatorValues: true,
        mergeAllOf: true,
      }),
    });

    const bundledApi = File.of(bundled).readAsString();
    expect(bundledApi).toMatchSnapshot(`bundled-java-${spec}`);

    const outFolder = await generateJava(bundled, out.absolutePath);
    const genFolder = Folder.resolve(outFolder, "src/main/java/org/openapitools");
    const models = genFolder.cd("model").readAllFilesAsString();
    const apis = genFolder.cd("api").readAllFilesAsString();

    models.forEach((f) => expect(f.content.replace(/@Generated.*\)/, "")).toMatchSnapshot(`java-models-${spec}-${path.basename(f.src)}`));
    apis.forEach((f) => expect(f.content.replace(/@Generated.*\)/, "")).toMatchSnapshot(`java-apis-${spec}-${path.basename(f.src)}`));
  }, 20000);
});
