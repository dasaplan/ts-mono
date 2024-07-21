#!/usr/bin/env ts-node

import { Command } from "commander";
import * as process from "process";
import { createCommandGenerate } from "./src/index.js";
import { createCommandGenerateTs } from "./src/commands.js";
import { createCommandBundle } from "@dasaplan/openapi-bundler";
import { createCommandGenerateZod } from "@dasaplan/openapi-codegen-zod";
import { createCommandGenerateEndpoints } from "@dasaplan/openapi-codegen-endpoints";

const program = new Command();
createCommandGenerate(program);
createCommandBundle(program);
createCommandGenerateTs(program);
createCommandGenerateZod(program);
createCommandGenerateEndpoints(program);

program.parse(process.argv);
