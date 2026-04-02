"use strict";

const { CONFIG } = require("../config");
const {
  detectProjectCommands,
  runCommands,
  summarizeVerificationResults
} = require("../repo/health");

function runVerification(memory, { mode = "fast", logger }) {
  const commands = detectProjectCommands(CONFIG);
  const verifyResults = runCommands(CONFIG, commands.verify, "verify", logger);
  const verifyOk = verifyResults.every((item) => item.ok);

  let testResults = [];
  let testOk = true;

  if (verifyOk && mode === "full") {
    testResults = runCommands(CONFIG, commands.test, "test", logger);
    testOk = testResults.every((item) => item.ok);
  }

  if (verifyOk) memory.metrics.verifyPass += 1;
  else memory.metrics.verifyFail += 1;

  if (mode === "full") {
    if (testOk) memory.metrics.testPass += 1;
    else memory.metrics.testFail += 1;
  }

  return {
    ok: verifyOk && testOk,
    mode,
    commands,
    verifyResults,
    testResults,
    summary: summarizeVerificationResults(verifyResults, testResults)
  };
}

module.exports = {
  runVerification
};
