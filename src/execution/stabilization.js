"use strict";

const { CONFIG } = require("../config");
const { sanitizeOneLine, unique } = require("../core/text");
const { extractRelevantFilesFromErrors, getMandatoryDiagnosticFiles } = require("../repo/health");

function createRepoStabilizationTask(repoHealth) {
  const files = unique([
    ...extractRelevantFilesFromErrors(repoHealth.summary || ""),
    ...getMandatoryDiagnosticFiles(repoHealth.summary || "")
  ]);

  return {
    id: `stabilize-${Date.now()}`,
    title: "Stabilize repository tooling and compilation",
    category: "bugfix",
    priority: "high",
    kind: "stabilization",
    goal: "Fix current lint, typecheck, build, dependency, or test failures before any product evolution",
    why: sanitizeOneLine(repoHealth.summary || "repository health check failed", 240),
    files: files.slice(0, CONFIG.MAX_FILES_PER_TASK),
    new_files_allowed: true,
    commit_message: "fix: stabilize repository tooling and compilation"
  };
}

module.exports = {
  createRepoStabilizationTask
};
