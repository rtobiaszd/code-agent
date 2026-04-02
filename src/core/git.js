"use strict";

const fs = require("fs");
const path = require("path");
const { CONFIG } = require("../config");
const { run } = require("./process-utils");
const { exists, safeRead, safeWrite, abs, isProtectedFile } = require("./fs-utils");
const { log } = require("./logger");

function git(cmd, allowFail = false) {
  const res = run(`git ${cmd}`, { cwd: CONFIG.REPO_PATH });
  if (!allowFail && !res.ok) {
    throw new Error(`git ${cmd} falhou:\n${res.stderr || res.stdout}`);
  }
  return (res.stdout || "").trim();
}

function hasGitRepo() {
  const res = run("git rev-parse --is-inside-work-tree", { cwd: CONFIG.REPO_PATH });
  return res.ok && String(res.stdout).trim() === "true";
}

function currentBranch() {
  return git("rev-parse --abbrev-ref HEAD", true) || "unknown";
}

function stageAll() {
  git("add .");
}

function commitAll(message) {
  stageAll();
  const res = run(`git commit -m ${JSON.stringify(message)}`, { cwd: CONFIG.REPO_PATH });
  const output = `${res.stdout}\n${res.stderr}`.trim();
  if (!res.ok) {
    if (/nothing to commit/i.test(output)) return false;
    throw new Error(`Commit falhou:\n${output}`);
  }
  return true;
}

function pushBranch() {
  const branch = currentBranch();
  const res = run(`git push -u ${CONFIG.REMOTE_NAME} ${branch}`, { cwd: CONFIG.REPO_PATH });
  if (!res.ok) {
    throw new Error(`Push falhou:\n${res.stderr || res.stdout}`);
  }
}

function getStatusPorcelain() {
  const out = git("status --porcelain", true);
  return out ? out.split(/\r?\n/).filter(Boolean) : [];
}

function workingTreeDirty() {
  const lines = getStatusPorcelain();
  if (!lines.length) return false;
  if (!CONFIG.IGNORE_UNTRACKED_PROTECTED_FILES_ONLY) return true;

  for (const line of lines) {
    const candidate = line.slice(3).trim();
    const isUntracked = line.startsWith("??");
    if (isUntracked && isProtectedFile(candidate)) continue;
    return true;
  }

  return false;
}

function ensureBranch(nowDate) {
  if (!CONFIG.AUTO_BRANCH) return currentBranch();
  const target = `${CONFIG.BRANCH_PREFIX}/${nowDate}`;
  const current = currentBranch();
  if (current === target) return current;

  const existsBranch = run(`git rev-parse --verify ${target}`, { cwd: CONFIG.REPO_PATH }).ok;
  if (existsBranch) {
    git(`checkout ${target}`);
    return target;
  }

  git(`checkout -b ${target}`);
  return target;
}

function rollbackHard() {
  const backup = new Map();
  for (const p of CONFIG.PROTECTED_FILES) {
    const full = abs(p);
    if (exists(full)) backup.set(full, safeRead(full, ""));
  }

  const mainDoc = abs(CONFIG.MAIN_EVOLUTION_DOC);
  if (exists(mainDoc)) backup.set(mainDoc, safeRead(mainDoc, ""));

  git("reset --hard", true);
  git("clean -fd", true);

  for (const [full, content] of backup.entries()) {
    try {
      safeWrite(full, content);
    } catch (error) {
      log("⚠️ falha ao restaurar backup:", full, error.message);
    }
  }
}

module.exports = {
  git,
  hasGitRepo,
  currentBranch,
  stageAll,
  commitAll,
  pushBranch,
  getStatusPorcelain,
  workingTreeDirty,
  ensureBranch,
  rollbackHard
};
