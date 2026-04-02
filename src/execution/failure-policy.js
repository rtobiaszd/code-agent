"use strict";

const { CONFIG } = require("../config");
const { sanitizeOneLine, stableTaskSignature, stableTextSignature } = require("../core/text");
const { extractRelevantFilesFromErrors } = require("../repo/health");
const {
  rememberFailure,
  rememberFileFailures,
  countTaskFailures,
  registerIdenticalFailure,
  getTaskReplanCount,
  incrementTaskReplan,
  clearTaskFailureBursts,
  saveMemory
} = require("../state/memory");
const { log } = require("../core/logger");

function collectFailureFiles(task, reason, implementation) {
  return [...new Set([
    ...((task && Array.isArray(task.files)) ? task.files : []),
    ...extractRelevantFilesFromErrors(reason || ""),
    ...((implementation && Array.isArray(implementation.files)) ? implementation.files.map((item) => item.path) : [])
  ])].filter(Boolean);
}

function classifyFailure(reason) {
  const low = String(reason || "").toLowerCase();

  if (
    low.includes("invalid_json") ||
    low.includes("json_comment_not_allowed") ||
    low.includes("implementação sanitizada ficou vazia") ||
    low.includes("blocked_extension") ||
    low.includes("blocked_name:") ||
    low.includes("arquivo protegido") ||
    low.includes("non_fatal_invalid_file_selection") ||
    low.includes("empty_implementation")
  ) {
    return "replanable";
  }

  if (
    low.includes("lint") ||
    low.includes("eslint") ||
    low.includes("typecheck") ||
    low.includes("typescript") ||
    low.includes("build") ||
    low.includes("test")
  ) {
    return "healable";
  }

  if (low.includes("repository health check failed") || low.includes("stabilize repository")) {
    return "stabilization";
  }

  if (low.includes("fatal_protected_file")) {
    return "fatal";
  }

  return "unknown";
}

function registerFailureAndDecide(memory, task, reason, implementation) {
  const classification = classifyFailure(reason);
  const failureEntry = {
    at: new Date().toISOString(),
    title: task.title,
    category: task.category,
    reason: sanitizeOneLine(reason, 400),
    signature: stableTaskSignature(task),
    error_signature: stableTextSignature(reason),
    classification
  };

  memory.failed.unshift(failureEntry);
  memory.failed = memory.failed.slice(0, 300);
  memory.metrics.lastErrorAt = new Date().toISOString();

  rememberFailure(memory, task, reason);
  rememberFileFailures(memory, collectFailureFiles(task, reason, implementation), reason);

  const identical = registerIdenticalFailure(memory, task, reason);
  const taskFailures = countTaskFailures(memory, task);
  const replans = getTaskReplanCount(memory, task);

  let action = "retry";

  if (classification === "replanable") {
    if (replans < CONFIG.MAX_REPLAN_PER_TASK) {
      incrementTaskReplan(memory, task);
      memory.metrics.replans += 1;
      action = "replan";
    } else if (identical.count >= CONFIG.MAX_IDENTICAL_ERROR_RETRIES) {
      action = "drop";
    }
  } else if (classification === "healable") {
    if (taskFailures >= CONFIG.MAX_REPEAT_FAILURES_PER_TASK && identical.count >= CONFIG.MAX_IDENTICAL_ERROR_RETRIES) {
      action = "drop";
    }
  } else if (classification === "fatal") {
    action = "drop";
  } else {
    if (taskFailures >= CONFIG.MAX_REPEAT_FAILURES_PER_TASK) {
      action = "drop";
    }
  }

  if (action === "drop") {
    clearTaskFailureBursts(memory, task);
    log("⛔ dropping task after exhausted retries");
  } else if (action === "replan") {
    log("🔁 task will be replanned instead of dropped");
  } else {
    log("🔁 keeping task for retry/self-heal");
  }

  saveMemory(memory);
  return { action, classification, identicalCount: identical.count, taskFailures };
}

module.exports = {
  collectFailureFiles,
  classifyFailure,
  registerFailureAndDecide
};
