#!/usr/bin/env ts-node

import { Command } from "commander";
import * as process from "process";
import { createCommandGenerateZod } from "./src/index.js";

const program = new Command();
createCommandGenerateZod(program);

program.parse(process.argv);
