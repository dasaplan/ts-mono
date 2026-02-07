#!/usr/bin/env node

import { Command } from "commander";
import * as process from "process";
import { createCommandGenerateZod, createCommandGenerateEndpoints, createCommandGenerateExpressApi } from "./commands/index.js";

const program = new Command();

program
  .name("oa-cli")
  .description("OpenAPI Code Generation CLI")
  .version("0.0.0");

createCommandGenerateZod(program);
createCommandGenerateEndpoints(program);
createCommandGenerateExpressApi(program);

program.parse(process.argv);
