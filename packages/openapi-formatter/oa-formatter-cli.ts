#!/usr/bin/env ts-node

import { Command } from "commander";
import * as process from "process";
import { createCommandFormat } from "./src/index.js";

const program = new Command();
createCommandFormat(program);

program.parse(process.argv);
