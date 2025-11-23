#!/usr/bin/env ts-node

import { Command } from "commander";
import * as process from "process";
import { createCommandGenerateEndpoints, createCommandGenerateExpressApi } from "./src/index.js";

const program = new Command();
createCommandGenerateEndpoints(program);
createCommandGenerateExpressApi(program);
program.parse(process.argv);
