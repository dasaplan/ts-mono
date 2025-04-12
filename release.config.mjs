/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  extends: "semantic-release-monorepo",
  branches: ["main", "update"],
  dryRun: true,
};
