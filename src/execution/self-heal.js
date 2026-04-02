"use strict";

const { CONFIG } = require("../config");
const { askAndParseJson } = require("../models/ollama");
const { buildSelfHealPrompt } = require("../planning/prompts");
const { collectFileContents } = require("../repo/indexer");
const { backupFiles, restoreBackup, normalizeSlashes } = require("../core/fs-utils");
const { errorProgressScore, stableTextSignature, unique } = require("../core/text");
const { rollbackHard } = require("../core/git");
const {
  isValidImplementation,
  sanitizeImplementation,
  containsDangerousContent,
  applyImplementation,
  mergeImplementations
} = require("./implementation");
const { runVerification } = require("./verification");
const { compareRepoHealth } = require("../repo/health");
const { debug, log } = require("../core/logger");

async function selfHeal({
  blueprint,
  task,
  implementation,
  memory,
  baselineHealth
}) {
  let currentImpl = implementation;
  let previousSummary = baselineHealth?.summary || "";
  let previousSignature = stableTextSignature(previousSummary);

  for (let attempt = 1; attempt <= CONFIG.MAX_SELF_HEAL_ATTEMPTS; attempt += 1) {
    const currentFiles = collectFileContents(
      unique([
        ...(task.files || []),
        ...(currentImpl.files || []).map((item) => item.path)
      ]).slice(0, CONFIG.MAX_CONTEXT_FILES)
    );

    const prompt = buildSelfHealPrompt({
      blueprint,
      task,
      implementation: currentImpl,
      failedSummary: previousSummary,
      currentFiles,
      commands: baselineHealth?.commands || {}
    });

    let fixedImpl;
    try {
      fixedImpl = await askAndParseJson(CONFIG.MODEL_FIXER, prompt, "self-heal", isValidImplementation);
    } catch (error) {
      debug("self-heal parse error:", error.message);
      continue;
    }

    try {
      fixedImpl = sanitizeImplementation(fixedImpl, task).impl;
    } catch (error) {
      debug("self-heal sanitize error:", error.message);
      continue;
    }

    if (containsDangerousContent(fixedImpl)) continue;

    const touchedPaths = unique([
      ...fixedImpl.files.map((item) => normalizeSlashes(item.path)),
      ...(fixedImpl.delete_files || []).map((item) => normalizeSlashes(item))
    ]);

    const backups = backupFiles(touchedPaths);

    try {
      applyImplementation(fixedImpl);
      const checks = runVerification(memory, { mode: "fast", logger: log });
      const nextSummary = checks.summary || previousSummary;
      const nextSignature = stableTextSignature(nextSummary);
      const progress = errorProgressScore(nextSummary) < errorProgressScore(previousSummary) || nextSignature !== previousSignature;

      if (checks.ok) {
        memory.metrics.selfHealSuccess += 1;
        return {
          ok: true,
          implementation: mergeImplementations(currentImpl, fixedImpl),
          checks,
          progress: true,
          lastFailedSummary: previousSummary
        };
      }

      const afterHealth = {
        ok: checks.ok,
        summary: checks.summary,
        signature: nextSignature
      };

      const comparison = compareRepoHealth(baselineHealth, afterHealth);

      currentImpl = mergeImplementations(currentImpl, fixedImpl);
      previousSummary = nextSummary;
      previousSignature = nextSignature;

      if (progress || comparison.improved) {
        log(`⚠️ self-heal attempt ${attempt} improved the failure surface; continuing`);
        continue;
      }

      restoreBackup(backups);
      rollbackHard();
    } catch (error) {
      debug("self-heal apply error:", error.message);
      restoreBackup(backups);
      rollbackHard();
    }
  }

  memory.metrics.selfHealFail += 1;
  return { ok: false, implementation: currentImpl, lastFailedSummary: previousSummary };
}

module.exports = {
  selfHeal
};
