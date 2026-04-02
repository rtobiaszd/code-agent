"use strict";

const { CONFIG } = require("../config");
const { abs, rel, safeRead, safeWrite } = require("../core/fs-utils");
const { sanitizeOneLine, unique, listToBullets } = require("../core/text");
const { rememberNextOpportunities } = require("./memory");

function deriveNextOpportunities({ task, implementation, review }) {
  const touchedFiles = unique((implementation?.files || []).map((item) => item.path)).slice(0, 6);
  const opportunities = [];

  if (task?.category !== "tests" && touchedFiles.length) {
    opportunities.push(`Add or expand automated tests for: ${touchedFiles.join(", ")}`);
  }

  if (task?.category !== "dx" && touchedFiles.length) {
    opportunities.push(`Improve developer experience around changed modules: ${touchedFiles.join(", ")}`);
  }

  if ((review?.warnings || []).length) {
    opportunities.push(`Resolve remaining reviewer warnings related to ${sanitizeOneLine(task?.title || "this task", 120)}`);
  }

  opportunities.push(`Monitor regressions after ${sanitizeOneLine(task?.title || "recent delivery", 120)} and harden validation where needed`);
  return unique(opportunities).slice(0, 4);
}

function buildEvolutionEntry({ task, implementation, review, commitMessage, nextOpportunities }) {
  const touchedFiles = implementation?.files?.map((file) => file.path) || [];
  const deletedFiles = implementation?.delete_files || [];
  const notes = implementation?.notes || [];
  const warnings = review?.warnings || [];

  return [
    `### ${new Date().toISOString()} | ${sanitizeOneLine(task.title, 160)}`,
    `- category: ${sanitizeOneLine(task.category, 40)}`,
    `- priority: ${sanitizeOneLine(task.priority, 20)}`,
    `- goal: ${sanitizeOneLine(task.goal, 300)}`,
    `- commit: ${sanitizeOneLine(commitMessage || task.commit_message || "", 220)}`,
    `- files changed: ${touchedFiles.length ? touchedFiles.join(", ") : "none"}`,
    deletedFiles.length ? `- files deleted: ${deletedFiles.join(", ")}` : "- files deleted: none",
    `- implementation summary: ${sanitizeOneLine(implementation?.summary || "completed successfully", 320)}`,
    `- review reason: ${sanitizeOneLine(review?.reason || "approved", 220)}`,
    `- notes:\n${listToBullets(notes)}`,
    `- warnings:\n${listToBullets(warnings)}`,
    `- next opportunities:\n${listToBullets(nextOpportunities)}`
  ].join("\n");
}

function trimEvolutionEntries(entries) {
  return entries.slice(0, CONFIG.MAX_EVOLUTION_ENTRIES);
}

function upsertEvolutionSection(originalContent, entry) {
  const marker = CONFIG.EVOLUTION_SECTION_TITLE;
  const text = String(originalContent || "").trimEnd();

  if (!text.includes(marker)) {
    return `${text}\n\n${marker}\n\n${entry}\n`;
  }

  const idx = text.indexOf(marker);
  const before = text.slice(0, idx + marker.length).trimEnd();
  const after = text.slice(idx + marker.length).trim();
  const blocks = after ? after.split(/\n(?=###\s)/g).map((chunk) => chunk.trim()).filter(Boolean) : [];
  const updated = trimEvolutionEntries([entry, ...blocks]).join("\n\n");
  return `${before}\n\n${updated}\n`;
}

function updateMainEvolutionDoc({ task, implementation, review, commitMessage, memory }) {
  const target = abs(CONFIG.MAIN_EVOLUTION_DOC);
  const previous = safeRead(target, "");
  const nextOpportunities = deriveNextOpportunities({ task, implementation, review });
  const entry = buildEvolutionEntry({ task, implementation, review, commitMessage, nextOpportunities });
  const next = upsertEvolutionSection(previous, entry);
  safeWrite(target, next);

  if (memory) {
    rememberNextOpportunities(memory, nextOpportunities);
    memory.metrics.blueprintUpdates = Number(memory.metrics.blueprintUpdates || 0) + 1;
  }

  return { path: rel(target), nextOpportunities };
}

module.exports = {
  deriveNextOpportunities,
  updateMainEvolutionDoc
};
