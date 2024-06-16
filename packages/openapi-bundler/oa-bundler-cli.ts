#!/usr/bin/env ts-node

import { Command } from "commander";
import * as process from "process";
import { createCommandBundle } from "./src/index.js";

const program = new Command();
createCommandBundle(program);

program.parse(process.argv);
