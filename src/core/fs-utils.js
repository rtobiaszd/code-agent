"use strict";

const fs = require("fs");
const path = require("path");
const { CONFIG } = require("../config");

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function ensureDir(dir) {
  if (!exists(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeRead(p, fallback = "") {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return fallback;
  }
}

function safeWrite(p, content) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, "utf8");
}

function normalizeSlashes(p) {
  return String(p || "").replace(/\\/g, "/");
}

function abs(relPath) {
  if (path.isAbsolute(relPath)) return relPath;
  return path.join(CONFIG.REPO_PATH, relPath);
}

function rel(absPath) {
  return normalizeSlashes(path.relative(CONFIG.REPO_PATH, absPath));
}

function fileLooksText(p) {
  try {
    const buf = fs.readFileSync(p);
    const len = Math.min(buf.length, 512);
    for (let i = 0; i < len; i += 1) {
      if (buf[i] === 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function basenameNormalized(filePath) {
  return path.basename(normalizeSlashes(filePath)).toLowerCase();
}

function isProtectedFile(filePath) {
  const normalized = normalizeSlashes(filePath).toLowerCase();
  return CONFIG.PROTECTED_FILES.some((p) => normalized.endsWith(String(p).toLowerCase()));
}

function isBlockedFileName(filePath) {
  return CONFIG.BLOCKED_FILE_NAMES.includes(basenameNormalized(filePath));
}

function isSpecialAllowedFile(filePath) {
  return CONFIG.SPECIAL_ALLOWED_FILES.includes(basenameNormalized(filePath));
}

function hasAllowedExtension(filePath) {
  const lower = normalizeSlashes(filePath).toLowerCase();
  if (isSpecialAllowedFile(lower)) return true;
  return CONFIG.ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function classifyFileEligibility(filePath, task = null) {
  const normalized = normalizeSlashes(filePath);
  const base = basenameNormalized(normalized);

  if (!normalized) {
    return { allowed: false, reason: "empty_path", fatal: false };
  }

  if (isProtectedFile(normalized)) {
    return { allowed: false, reason: `protected:${base}`, fatal: true };
  }

  if (isBlockedFileName(normalized)) {
    return { allowed: false, reason: `blocked_name:${base}`, fatal: false };
  }

  if (!hasAllowedExtension(normalized)) {
    return { allowed: false, reason: `blocked_extension:${base}`, fatal: false };
  }

  if (
    task?.kind === "stabilization" &&
    !exists(abs(normalized)) &&
    !CONFIG.STABILIZATION_ALLOWED_NEW_FILES.includes(normalized)
  ) {
    return { allowed: false, reason: `stabilization_create_not_allowed:${base}`, fatal: false };
  }

  return { allowed: true, reason: "allowed", fatal: false };
}

function walkFiles(dir, list = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return list;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (CONFIG.IGNORE_DIRS.includes(entry.name)) continue;
      walkFiles(full, list);
      continue;
    }

    if (CONFIG.IGNORE_FILES.includes(entry.name)) continue;
    if (isBlockedFileName(entry.name)) continue;
    if (!hasAllowedExtension(entry.name) && !isSpecialAllowedFile(entry.name)) continue;
    if (!fileLooksText(full)) continue;
    list.push(full);
  }

  return list;
}

function backupFiles(paths) {
  const map = new Map();
  for (const p of paths || []) {
    const full = abs(p);
    map.set(normalizeSlashes(p), exists(full) ? safeRead(full, "") : null);
  }
  return map;
}

function restoreBackup(backupMap) {
  for (const [filePath, content] of backupMap.entries()) {
    const full = abs(filePath);
    if (content === null) {
      if (exists(full)) fs.unlinkSync(full);
      continue;
    }
    safeWrite(full, content);
  }
}

module.exports = {
  exists,
  ensureDir,
  safeRead,
  safeWrite,
  normalizeSlashes,
  abs,
  rel,
  fileLooksText,
  basenameNormalized,
  isProtectedFile,
  isBlockedFileName,
  isSpecialAllowedFile,
  hasAllowedExtension,
  classifyFileEligibility,
  walkFiles,
  backupFiles,
  restoreBackup
};
