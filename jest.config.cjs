/**
 * @see documentation for values: https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
 * IMPORTANT! jest need to be executed with flag:
 * - NODE_OPTIONS=--experimental-vm-modules
 *
 * @example cross-env NODE_OPTIONS=--experimental-vm-modules jest
 *
 * Several issues with jest, ts-jest and esm
 * - jest and node esm are not compatible: https://stackoverflow.com/questions/68956636/how-to-use-esm-tests-with-jest
 * - ts-jest has issues with import.meta (as a replacement of __dirname): https://github.com/kulshekhar/ts-jest/issues/3888
 * - jest (ts-jest needs extra configuration for esm: https://stackoverflow.com/questions/75706338/could-not-locate-module-jest-with-esm-nodejs-app
 */
module.exports = {

    projects: [
        {
            preset: 'ts-jest/presets/default-esm', // needed for esm and import.meta, as well suggested by ts-jest docs
            roots: ["<rootDir>/packages/openapi/src"], // default jest config
            testMatch: ["**/?(*.)+(spec|test).+(ts|m?js)"], // needs to be extended for esm file extensions
            moduleNameMapper: {"(.+)\\.js": "$1"}, // needed, but idk why
            transform: {"\\.[jt]sx?$": ["ts-jest", {useESM: true}]}, // needed and suggested by ts-jest docs
            extensionsToTreatAsEsm: ['.ts'], // works also without it but suggested by ts-jest docs,
            reporters: ['default', 'summary'],
        },
        {
            preset: 'ts-jest/presets/default-esm', // needed for esm and import.meta, as well suggested by ts-jest docs
            roots: ["<rootDir>/packages/openapi-bundler/src"], // default jest config
            testMatch: ["**/?(*.)+(spec|test).+(ts|m?js)"], // needs to be extended for esm file extensions
            moduleNameMapper: {"(.+)\\.js": "$1"}, // needed, but idk why
            transform: {"\\.[jt]sx?$": ["ts-jest", {useESM: true}]}, // needed and suggested by ts-jest docs
            extensionsToTreatAsEsm: ['.ts'], // works also without it but suggested by ts-jest docs,
            reporters: ['default', 'summary'],
        },
    ],
};