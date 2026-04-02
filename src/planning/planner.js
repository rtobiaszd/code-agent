"use strict";

const { CONFIG } = require("../config");
const { askAndParseJson } = require("../models/ollama");
const { getHotFiles } = require("../state/memory");
const { buildBacklogPlannerPrompt, buildReplanPrompt } = require("./prompts");
const { normalizeSlashes, isProtectedFile, isBlockedFileName } = require("../core/fs-utils");
const { unique } = require("../core/text");

function isValidBacklog(backlog) {
  return Boolean(backlog && typeof backlog === "object" && Array.isArray(backlog.tasks));
}

function validateTaskShape(task) {
  return Boolean(task && typeof task === "object" && task.id && task.title && task.category && task.goal);
}

function detectForbiddenKeywordsInTask(task, config = CONFIG) {
  const serialized = JSON.stringify(task).toLowerCase();
  return config.FORBIDDEN_TECH_KEYWORDS.filter((kw) => serialized.includes(kw));
}

function validateBacklog(backlog, repoIndex, memory, config = CONFIG) {
  if (!backlog || typeof backlog !== "object") throw new Error("Backlog inválido.");
  if (!Array.isArray(backlog.tasks)) throw new Error("Backlog sem tasks.");

  const realFiles = new Set(repoIndex.rels);
  const cleaned = [];

  for (const task of backlog.tasks.slice(0, config.MAX_BACKLOG_ITEMS)) {
    if (!validateTaskShape(task)) continue;

    const forbidden = detectForbiddenKeywordsInTask(task, config);
    if (forbidden.length) {
      memory.learned.forbiddenKeywordsObserved.push(...forbidden);
      memory.learned.forbiddenKeywordsObserved = unique(memory.learned.forbiddenKeywordsObserved).slice(0, 100);
      continue;
    }

    const files = Array.isArray(task.files) ? task.files.filter(Boolean) : [];
    const validFiles = files
      .map(normalizeSlashes)
      .filter((f) => !isProtectedFile(f))
      .filter((f) => !isBlockedFileName(f))
      .filter((f) => realFiles.has(f));

    const normalizedTask = {
      id: String(task.id),
      title: String(task.title),
      category: String(task.category),
      priority: String(task.priority || "medium"),
      goal: String(task.goal),
      why: String(task.why || ""),
      files: validFiles.slice(0, config.MAX_FILES_PER_TASK),
      new_files_allowed: Boolean(task.new_files_allowed),
      commit_message: String(task.commit_message || `chore: ${task.title}`)
    };

    if (!normalizedTask.files.length && !normalizedTask.new_files_allowed) continue;
    cleaned.push(normalizedTask);
  }

  backlog.tasks = cleaned;
  return backlog;
}

async function createBacklog({ blueprint, snapshot, memory, branch, repoIndex, config = CONFIG }) {
  const prompt = buildBacklogPlannerPrompt({
    blueprint,
    snapshot,
    memory,
    branch,
    config,
    hotFiles: getHotFiles(memory)
  });

  const backlog = await askAndParseJson(config.MODEL_PLANNER, prompt, "backlog", isValidBacklog);
  return validateBacklog(backlog, repoIndex, memory, config);
}

async function replanTask({ blueprint, task, failureSummary, memory, config = CONFIG }) {
  const prompt = buildReplanPrompt({
    blueprint,
    task,
    failureSummary,
    replanCount: Number(memory.learned.taskReplanStats?.[task.id] || 0)
  });

  const nextTask = await askAndParseJson(config.MODEL_PLANNER, prompt, "task-replan", validateTaskShape);

  return {
    ...task,
    ...nextTask,
    files: Array.isArray(nextTask.files) ? nextTask.files.map(normalizeSlashes).slice(0, config.MAX_FILES_PER_TASK) : task.files,
    new_files_allowed: Boolean(nextTask.new_files_allowed),
    commit_message: String(nextTask.commit_message || task.commit_message || `chore: ${nextTask.title || task.title}`)
  };
}

module.exports = {
  isValidBacklog,
  validateTaskShape,
  validateBacklog,
  createBacklog,
  replanTask
};
