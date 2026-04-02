#!/usr/bin/env node
"use strict";

const { runAgent } = require("./src/agent/orchestrator");

runAgent().catch((error) => {
  console.error(new Date().toISOString(), "-", "fatal:", error?.stack || error?.message || error);
  process.exitCode = 1;
});
