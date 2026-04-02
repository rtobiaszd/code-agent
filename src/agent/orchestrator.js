"use strict";

const path = require("path");
const { CONFIG } = require("../config");
const { log, debug } = require("../core/logger");
const { exists, safeWrite } = require("../core/fs-utils");
const {
  hasGitRepo,
  workingTreeDirty,
  ensureBranch,
  commitAll,
  pushBranch,
  rollbackHard
} = require("../core/git");
const {
  loadMemory,
  saveMemory,
  pushHistory,
  getHotFiles,
  rememberSuccess
} = require("../state/memory");
const { updateMainEvolutionDoc } = require("../state/evolution");
const {
  buildRepoIndex,
  loadBlueprint,
  buildRepoSnapshot,
  collectFileContents
} = require("../repo/indexer");
const { getRepoHealth, compareRepoHealth } = require("../repo/health");
const { createBacklog, replanTask } = require("../planning/planner");
const { buildExecutorPrompt, buildReviewerPrompt } = require("../planning/prompts");
const { askAndParseJson } = require("../models/ollama");
const {
  isValidImplementation,
  sanitizeImplementation,
  containsDangerousContent,
  applyImplementation
} = require("../execution/implementation");
const { runVerification } = require("../execution/verification");
const { selfHeal } = require("../execution/self-heal");
const { registerFailureAndDecide } = require("../execution/failure-policy");
const { createRepoStabilizationTask } = require("../execution/stabilization");
const { truncate, stableTaskSignature } = require("../core/text");

function lockFile() {
  return path.join(CONFIG.REPO_PATH, ".agent-lock");
}

function acquireLock() {
  if (exists(lockFile())) {
    throw new Error("Já existe outro agente em execução (.agent-lock).");
  }
  safeWrite(lockFile(), String(process.pid));
}

function releaseLock() {
  try {
    if (exists(lockFile())) require("fs").unlinkSync(lockFile());
  } catch {}
}

function nowDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function ensureSafeStart() {
  if (!hasGitRepo()) throw new Error("Este diretório não é um repositório git.");
  if (CONFIG.STRICT_CLEAN_START && workingTreeDirty()) {
    throw new Error("Há alterações não commitadas. Limpe o repo antes de iniciar o agente.");
  }
}

function pickNextTask(memory) {
  const backlog = Array.isArray(memory.backlog) ? memory.backlog : [];
  if (!backlog.length) return null;

  const hotFiles = new Set(getHotFiles(memory));
  const successful = new Set(memory.learned.successfulTaskSignatures || []);

  const categoryScore = {
    security: 100,
    bugfix: 95,
    performance: 90,
    optimization: 85,
    product: 80,
    tests: 75,
    refactor: 60,
    dx: 50
  };

  const priorityScore = { high: 30, medium: 20, low: 10 };

  const candidates = backlog
    .filter((task) => !successful.has(stableTaskSignature(task)))
    .sort((a, b) => {
      const aHot = (a.files || []).filter((item) => hotFiles.has(item)).length;
      const bHot = (b.files || []).filter((item) => hotFiles.has(item)).length;
      if (aHot !== bHot) return aHot - bHot;
      const aScore = (categoryScore[a.category] || 0) + (priorityScore[a.priority] || 0);
      const bScore = (categoryScore[b.category] || 0) + (priorityScore[b.priority] || 0);
      return bScore - aScore;
    });

  return candidates[0] || null;
}

function removeTaskFromBacklog(memory, taskId) {
  memory.backlog = (memory.backlog || []).filter((task) => task.id !== taskId);
}

function isValidReview(review) {
  return Boolean(review && typeof review === "object" && typeof review.verdict === "string");
}

async function executeTask({ task, blueprint, memory }) {
  const fileContexts = collectFileContents(task.files || []);
  const baselineHealth = getRepoHealth(CONFIG, log);

  const executorPrompt = buildExecutorPrompt({
    blueprint,
    task,
    fileContexts,
    commands: baselineHealth.commands || {},
    memory
  });

  const rawImplementation = await askAndParseJson(
    CONFIG.MODEL_EXECUTOR,
    executorPrompt,
    "executor",
    isValidImplementation
  );

  const sanitized = sanitizeImplementation(rawImplementation, task);
  const implementation = sanitized.impl;

  if (containsDangerousContent(implementation)) {
    throw new Error("Implementação recusada por conteúdo perigoso.");
  }

  applyImplementation(implementation);

  const quickChecks = runVerification(memory, { mode: "fast", logger: log });

  if (!quickChecks.ok) {
    const healed = await selfHeal({
      blueprint,
      task,
      implementation,
      memory,
      baselineHealth
    });

    if (!healed.ok) {
      throw new Error(healed.lastFailedSummary || quickChecks.summary || "Self-heal falhou.");
    }
  }

  const finalChecks = runVerification(memory, { mode: "full", logger: log });
  if (!finalChecks.ok) {
    throw new Error(finalChecks.summary || "Verificação final falhou.");
  }

  const afterHealth = {
    ok: finalChecks.ok,
    summary: finalChecks.summary,
    signature: finalChecks.summary
  };

  const repoDelta = compareRepoHealth(baselineHealth, afterHealth);

  const reviewPrompt = buildReviewerPrompt({
    blueprint,
    task,
    implementation,
    diff: truncate(require("../core/git").git("diff -- .", true), 45000),
    config: CONFIG
  });

  const review = await askAndParseJson(
    CONFIG.MODEL_REVIEWER,
    reviewPrompt,
    "review",
    isValidReview
  );

  if (String(review.verdict).toUpperCase() !== "APPROVED") {
    throw new Error(review.reason || "Reviewer rejeitou a implementação.");
  }

  return {
    implementation,
    review,
    repoDelta
  };
}

async function runAgent() {
  acquireLock();

  try {
    ensureSafeStart();

    const memory = loadMemory();
    const blueprint = loadBlueprint();
    const repoIndex = buildRepoIndex();

    memory.repoHash = repoIndex.repoHash;
    memory.blueprintHash = blueprint.hash;
    saveMemory(memory);

    const branch = ensureBranch(nowDate());
    log("🚀 AGENT STARTED");
    log("📁 repo:", CONFIG.REPO_PATH);
    log("📘 blueprint:", CONFIG.BLUEPRINT_FILE);
    log("🌿 branch:", branch);

    let repoHealth = getRepoHealth(CONFIG, log);
    if (!repoHealth.ok && CONFIG.REPO_STABILIZATION_MODE) {
      const stabilizationTask = createRepoStabilizationTask(repoHealth);
      memory.backlog = [stabilizationTask, ...(memory.backlog || [])];
      saveMemory(memory);
      log("🛠️ repo unhealthy, entering stabilization mode");
    }

    if (!memory.backlog?.length) {
      const snapshot = buildRepoSnapshot(repoIndex);
      const backlog = await createBacklog({
        blueprint,
        snapshot,
        memory,
        branch,
        repoIndex,
        config: CONFIG
      });

      memory.backlog = backlog.tasks || [];
      memory.metrics.plannerRuns += 1;
      saveMemory(memory);
    }

    const task = pickNextTask(memory);
    if (!task) {
      log("⏸️ no valid task available");
      return;
    }

    memory.metrics.iterations += 1;
    memory.metrics.tasksExecuted += 1;
    pushHistory(memory, { type: "task_selected", task });
    saveMemory(memory);

    log("🎯 task:", task.title);
    log("📌 goal:", task.goal);

    try {
      const result = await executeTask({ task, blueprint, memory });
      const commitMessage = result.review.suggested_commit_message || task.commit_message;

      const committed = commitAll(commitMessage);
      if (committed) {
        memory.metrics.commits += 1;
      }

      if (CONFIG.AUTO_PUSH && committed) {
        pushBranch();
        memory.metrics.pushes += 1;
      }

      memory.accepted.unshift({
        at: new Date().toISOString(),
        title: task.title,
        category: task.category,
        commit_message: commitMessage
      });
      memory.accepted = memory.accepted.slice(0, 300);
      memory.metrics.lastSuccessAt = new Date().toISOString();
      rememberSuccess(memory, task, commitMessage);

      updateMainEvolutionDoc({
        task,
        implementation: result.implementation,
        review: result.review,
        commitMessage,
        memory
      });

      removeTaskFromBacklog(memory, task.id);
      saveMemory(memory);

      log("✅ task concluída:", task.title);
    } catch (error) {
      rollbackHard();
      const reason = error?.message || String(error);
      const decision = registerFailureAndDecide(memory, task, reason, null);

      if (decision.action === "replan") {
        try {
          const nextTask = await replanTask({
            blueprint,
            task,
            failureSummary: reason,
            memory,
            config: CONFIG
          });

          memory.backlog = (memory.backlog || []).map((item) => item.id === task.id ? nextTask : item);
          saveMemory(memory);
          log("🧠 task replanned:", nextTask.title);
        } catch (replanError) {
          debug("replan error:", replanError.message);
          removeTaskFromBacklog(memory, task.id);
          saveMemory(memory);
        }
      } else if (decision.action === "drop") {
        removeTaskFromBacklog(memory, task.id);
        saveMemory(memory);
      }

      log("❌ task failed:", reason);
    }
  } finally {
    releaseLock();
  }
}

module.exports = {
  runAgent
};
