"use strict";

const path = require("path");
const { CONFIG } = require("../config");
const { exists, safeRead, safeWrite, normalizeSlashes, isProtectedFile } = require("../core/fs-utils");
const {
  stableTaskSignature,
  stableTextSignature,
  sanitizeOneLine,
  unique
} = require("../core/text");

function memoryFile() {
  return path.join(CONFIG.REPO_PATH, ".agent-memory.json");
}

function createMemory() {
  return {
    repoHash: "",
    blueprintHash: "",
    backlog: [],
    accepted: [],
    failed: [],
    skipped: [],
    history: [],
    identicalFailureBursts: {},
    learned: {
      successfulTaskSignatures: [],
      failedTaskSignatures: [],
      successfulCommitMessages: [],
      forbiddenKeywordsObserved: [],
      lintPatterns: [],
      buildPatterns: [],
      testPatterns: [],
      fileFailureStats: {},
      taskReplanStats: {},
      nextOpportunityPatterns: [],
      dependencyInstallPatterns: []
    },
    metrics: {
      iterations: 0,
      plannerRuns: 0,
      tasksExecuted: 0,
      approvals: 0,
      rejections: 0,
      applied: 0,
      commits: 0,
      pushes: 0,
      verifyPass: 0,
      verifyFail: 0,
      testPass: 0,
      testFail: 0,
      selfHealSuccess: 0,
      selfHealFail: 0,
      replans: 0,
      blueprintUpdates: 0,
      installs: 0,
      installSuccess: 0,
      installFail: 0,
      lastSuccessAt: null,
      lastErrorAt: null
    }
  };
}

function sanitizeMemory(raw) {
  const base = createMemory();
  const m = raw && typeof raw === "object" ? raw : {};

  return {
    ...base,
    ...m,
    backlog: Array.isArray(m.backlog) ? m.backlog : [],
    accepted: Array.isArray(m.accepted) ? m.accepted : [],
    failed: Array.isArray(m.failed) ? m.failed : [],
    skipped: Array.isArray(m.skipped) ? m.skipped : [],
    history: Array.isArray(m.history) ? m.history : [],
    identicalFailureBursts:
      m.identicalFailureBursts && typeof m.identicalFailureBursts === "object"
        ? m.identicalFailureBursts
        : {},
    learned: {
      ...base.learned,
      ...(m.learned || {}),
      successfulTaskSignatures: Array.isArray(m?.learned?.successfulTaskSignatures)
        ? m.learned.successfulTaskSignatures
        : [],
      failedTaskSignatures: Array.isArray(m?.learned?.failedTaskSignatures)
        ? m.learned.failedTaskSignatures
        : [],
      successfulCommitMessages: Array.isArray(m?.learned?.successfulCommitMessages)
        ? m.learned.successfulCommitMessages
        : [],
      forbiddenKeywordsObserved: Array.isArray(m?.learned?.forbiddenKeywordsObserved)
        ? m.learned.forbiddenKeywordsObserved
        : [],
      lintPatterns: Array.isArray(m?.learned?.lintPatterns) ? m.learned.lintPatterns : [],
      buildPatterns: Array.isArray(m?.learned?.buildPatterns) ? m.learned.buildPatterns : [],
      testPatterns: Array.isArray(m?.learned?.testPatterns) ? m.learned.testPatterns : [],
      fileFailureStats:
        m?.learned?.fileFailureStats && typeof m.learned.fileFailureStats === "object"
          ? m.learned.fileFailureStats
          : {},
      taskReplanStats:
        m?.learned?.taskReplanStats && typeof m.learned.taskReplanStats === "object"
          ? m.learned.taskReplanStats
          : {},
      nextOpportunityPatterns: Array.isArray(m?.learned?.nextOpportunityPatterns)
        ? m.learned.nextOpportunityPatterns
        : [],
      dependencyInstallPatterns: Array.isArray(m?.learned?.dependencyInstallPatterns)
        ? m.learned.dependencyInstallPatterns
        : []
    },
    metrics: {
      ...base.metrics,
      ...(m.metrics || {})
    }
  };
}

function loadMemory() {
  if (!exists(memoryFile())) return createMemory();
  try {
    return sanitizeMemory(JSON.parse(safeRead(memoryFile(), "{}")));
  } catch {
    return createMemory();
  }
}

function saveMemory(memory) {
  safeWrite(memoryFile(), JSON.stringify(sanitizeMemory(memory), null, 2));
}

function pushHistory(memory, item) {
  memory.history.unshift({ at: new Date().toISOString(), ...item });
  if (memory.history.length > CONFIG.MAX_HISTORY_ITEMS) {
    memory.history = memory.history.slice(0, CONFIG.MAX_HISTORY_ITEMS);
  }
}

function rememberSuccess(memory, task, commitMessage) {
  const signature = stableTaskSignature(task);
  if (!memory.learned.successfulTaskSignatures.includes(signature)) {
    memory.learned.successfulTaskSignatures.unshift(signature);
  }
  memory.learned.successfulTaskSignatures = memory.learned.successfulTaskSignatures.slice(0, 200);

  if (commitMessage && !memory.learned.successfulCommitMessages.includes(commitMessage)) {
    memory.learned.successfulCommitMessages.unshift(commitMessage);
  }
  memory.learned.successfulCommitMessages = memory.learned.successfulCommitMessages.slice(0, 100);

  clearTaskFailureBursts(memory, task);
}

function rememberFailure(memory, task, reason) {
  const signature = stableTaskSignature(task);
  if (!memory.learned.failedTaskSignatures.includes(signature)) {
    memory.learned.failedTaskSignatures.unshift(signature);
  }
  memory.learned.failedTaskSignatures = memory.learned.failedTaskSignatures.slice(0, 200);

  const low = String(reason || "").toLowerCase();
  if (low.includes("lint")) {
    memory.learned.lintPatterns.unshift(reason);
    memory.learned.lintPatterns = memory.learned.lintPatterns.slice(0, 50);
  } else if (low.includes("build") || low.includes("typecheck") || low.includes("typescript")) {
    memory.learned.buildPatterns.unshift(reason);
    memory.learned.buildPatterns = memory.learned.buildPatterns.slice(0, 50);
  } else if (low.includes("test")) {
    memory.learned.testPatterns.unshift(reason);
    memory.learned.testPatterns = memory.learned.testPatterns.slice(0, 50);
  }
}

function rememberInstalledPackages(memory, packages, reason) {
  const items = unique((packages || []).map((pkg) => `${pkg} :: ${sanitizeOneLine(reason || "", 180)}`));
  memory.learned.dependencyInstallPatterns = unique([
    ...items,
    ...(memory.learned.dependencyInstallPatterns || [])
  ]).slice(0, 100);
}

function rememberNextOpportunities(memory, opportunities) {
  const next = unique((opportunities || []).map((item) => sanitizeOneLine(item, 220)).filter(Boolean));
  memory.learned.nextOpportunityPatterns = unique([
    ...next,
    ...(memory.learned.nextOpportunityPatterns || [])
  ]).slice(0, 100);
}

function incrementTaskReplan(memory, task) {
  const signature = stableTaskSignature(task);
  const current = Number(memory.learned.taskReplanStats?.[signature] || 0);
  memory.learned.taskReplanStats[signature] = current + 1;
  return memory.learned.taskReplanStats[signature];
}

function getTaskReplanCount(memory, task) {
  const signature = stableTaskSignature(task);
  return Number(memory.learned.taskReplanStats?.[signature] || 0);
}

function rememberFileFailures(memory, files, reason) {
  const stats = memory.learned.fileFailureStats || {};
  const cleanFiles = unique((files || []).map(normalizeSlashes).filter(Boolean).filter((file) => !isProtectedFile(file)));

  for (const file of cleanFiles) {
    const current = stats[file] && typeof stats[file] === "object"
      ? stats[file]
      : { count: 0, lastReason: "", lastAt: null };

    stats[file] = {
      count: Number(current.count || 0) + 1,
      lastReason: sanitizeOneLine(reason || "", 220),
      lastAt: new Date().toISOString()
    };
  }

  const sortedEntries = Object.entries(stats)
    .sort((a, b) => Number(b[1]?.count || 0) - Number(a[1]?.count || 0))
    .slice(0, CONFIG.MAX_HOT_FILES);

  memory.learned.fileFailureStats = Object.fromEntries(sortedEntries);
}

function getHotFiles(memory) {
  return Object.entries(memory.learned.fileFailureStats || {})
    .filter(([, meta]) => Number(meta?.count || 0) >= CONFIG.HOT_FILE_FAILURE_THRESHOLD)
    .sort((a, b) => Number(b[1]?.count || 0) - Number(a[1]?.count || 0))
    .map(([file]) => file)
    .slice(0, CONFIG.MAX_HOT_FILES);
}

function countTaskFailures(memory, task) {
  const signature = stableTaskSignature(task);
  return memory.failed.filter((entry) => entry?.signature === signature).length;
}

function registerIdenticalFailure(memory, task, reason) {
  const signature = stableTaskSignature(task);
  const errorSignature = stableTextSignature(reason);
  const key = `${signature}:${errorSignature}`;
  const current = Number(memory.identicalFailureBursts[key] || 0) + 1;
  memory.identicalFailureBursts[key] = current;
  return { key, count: current, errorSignature };
}

function clearTaskFailureBursts(memory, task) {
  const signature = stableTaskSignature(task);
  for (const key of Object.keys(memory.identicalFailureBursts || {})) {
    if (key.startsWith(`${signature}:`)) {
      delete memory.identicalFailureBursts[key];
    }
  }
}

module.exports = {
  memoryFile,
  createMemory,
  sanitizeMemory,
  loadMemory,
  saveMemory,
  pushHistory,
  rememberSuccess,
  rememberFailure,
  rememberInstalledPackages,
  rememberNextOpportunities,
  incrementTaskReplan,
  getTaskReplanCount,
  rememberFileFailures,
  getHotFiles,
  countTaskFailures,
  registerIdenticalFailure,
  clearTaskFailureBursts
};
