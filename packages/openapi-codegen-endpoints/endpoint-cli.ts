#!/usr/bin/env ts-node

import { Command } from "commander";
import * as process from "process";
import { createCommandGenerateEndpoints } from "./src/index.js";

const program = new Command();
createCommandGenerateEndpoints(program);
program.parse(process.argv);
