import { Folder } from "@dasaplan/ts-sdk";
import { bundleOpenapi, parseOpenapi } from "./bundle.js";

describe("Bundler", () => {
  describe("bundle", () => {
    test("bundleOpenapi", async () => {
      const bundled = await bundleOpenapi("test/specs/pets-modular/pets-api.yml");
      expect(bundled).toMatchSnapshot();
    });
    test("bundleOpenapi test/specs/pets-modular-complex/petstore-api.yml", async () => {
      const bundled = await bundleOpenapi("test/specs/pets-modular-complex/petstore-api.yml");
      Folder.of(bundled.outFile).writeYml("complex-api.yml", bundled.parsed);

      expect(bundled).toMatchSnapshot();
    });
  });
  describe("parse", () => {
    test("parseOpenapi", async () => {
      const bundled = await parseOpenapi("test/specs/pets-modular/pets-api.yml");
      expect(bundled).toMatchSnapshot();
    });
  });
});
