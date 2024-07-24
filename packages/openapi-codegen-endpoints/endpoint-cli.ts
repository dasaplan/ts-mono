#!/usr/bin/env ts-node

import { Command } from "commander";
import * as process from "process";
import { createCommandGenerateEndpoints } from "./src/index.js";
import { createCommandGenerateEndpointsRtkQuery } from "./src/commands.js";

const program = new Command();
createCommandGenerateEndpoints(program);
createCommandGenerateEndpointsRtkQuery(program);
program.parse(process.argv);
