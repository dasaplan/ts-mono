#!/usr/bin/env ts-node

import { Command } from "commander";
import * as process from "process";
import { createCommandGenerate } from "./src/index.js";
import { createCommandBundle, createCommandGenerateTs, createCommandGenerateZod } from "./src/commands.js";

const program = new Command();
createCommandGenerate(program);
createCommandBundle(program);
createCommandGenerateTs(program);
createCommandGenerateZod(program);

program.parse(process.argv);
