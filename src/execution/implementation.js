"use strict";

const fs = require("fs");
const { CONFIG } = require("../config");
const {
  abs,
  exists,
  safeWrite,
  normalizeSlashes,
  classifyFileEligibility,
  backupFiles,
  restoreBackup
} = require("../core/fs-utils");
const { sanitizeOneLine, unique } = require("../core/text");

function isJsonFilePath(filePath) {
  return normalizeSlashes(filePath).toLowerCase().endsWith(".json");
}

function detectJsonCommentViolation(content) {
  const text = String(content || "").trimStart();
  return text.startsWith("//") || text.startsWith("/*");
}

function validateJsonContent(filePath, content) {
  if (!isJsonFilePath(filePath)) return { ok: true };

  if (detectJsonCommentViolation(content)) {
    return { ok: false, reason: `json_comment_not_allowed:${filePath}` };
  }

  try {
    JSON.parse(String(content));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: `invalid_json:${filePath}:${sanitizeOneLine(error.message || String(error), 220)}`
    };
  }
}

function isValidImplementation(impl) {
  return Boolean(
    impl &&
      typeof impl === "object" &&
      Array.isArray(impl.files) &&
      impl.files.every((item) => item && typeof item.path === "string" && typeof item.content === "string")
  );
}

function containsDangerousContent(value) {
  const text = JSON.stringify(value);
  const patterns = [
    /rm\s+-rf/gi,
    /DROP\s+TABLE/gi,
    /TRUNCATE\s+TABLE/gi,
    /-----BEGIN (?:RSA|OPENSSH|PRIVATE KEY)-----/g,
    /process\.env\.[A-Z0-9_]+\s*=\s*["'`]/g
  ];
  return patterns.some((pattern) => pattern.test(text));
}

function sanitizeImplementation(impl, task, config = CONFIG) {
  if (!impl || typeof impl !== "object") throw new Error("Implementação inválida.");
  if (!Array.isArray(impl.files)) impl.files = [];
  if (!Array.isArray(impl.delete_files)) impl.delete_files = [];
  if (!Array.isArray(impl.notes)) impl.notes = [];

  const skipped = [];
  const cleanedFiles = [];

  for (const f of impl.files) {
    if (!f || typeof f.path !== "string") {
      skipped.push({ path: "(unknown)", reason: "invalid_path", fatal: false });
      continue;
    }

    const eligibility = classifyFileEligibility(f.path, task);
    if (!eligibility.allowed) {
      skipped.push({ path: normalizeSlashes(f.path), reason: eligibility.reason, fatal: eligibility.fatal });
      if (eligibility.fatal) {
        const err = new Error(`Tentativa de alterar arquivo protegido: ${f.path}`);
        err.code = "FATAL_PROTECTED_FILE";
        throw err;
      }
      continue;
    }

    if (!["update", "create"].includes(f.action)) {
      skipped.push({ path: normalizeSlashes(f.path), reason: `invalid_action:${f.action}`, fatal: false });
      continue;
    }

    if (typeof f.content !== "string") {
      skipped.push({ path: normalizeSlashes(f.path), reason: "invalid_content", fatal: false });
      continue;
    }

    if (f.action === "create" && !config.ALLOW_NEW_FILES && !task.new_files_allowed) {
      skipped.push({ path: normalizeSlashes(f.path), reason: "create_not_allowed", fatal: false });
      continue;
    }

    const jsonValidation = validateJsonContent(f.path, f.content);
    if (!jsonValidation.ok) {
      skipped.push({ path: normalizeSlashes(f.path), reason: jsonValidation.reason, fatal: false });
      continue;
    }

    cleanedFiles.push({
      path: normalizeSlashes(f.path),
      action: f.action,
      content: String(f.content)
    });
  }

  const cleanedDeletes = [];
  for (const delPath of impl.delete_files) {
    const eligibility = classifyFileEligibility(delPath, task);
    if (!eligibility.allowed || eligibility.fatal) {
      skipped.push({
        path: normalizeSlashes(delPath),
        reason: `delete_${eligibility.reason}`,
        fatal: Boolean(eligibility.fatal)
      });
      continue;
    }
    cleanedDeletes.push(normalizeSlashes(delPath));
  }

  if (cleanedDeletes.length > 0 && !config.ALLOW_DELETE_FILES) {
    throw new Error("Delete de arquivos bloqueado pela configuração.");
  }

  impl.files = cleanedFiles;
  impl.delete_files = cleanedDeletes;

  if (skipped.length) {
    impl.notes.unshift(
      `Skipped files: ${skipped.map((item) => `${item.path} [${item.reason}]`).join(", ")}`
    );
  }

  if (impl.files.length === 0 && impl.delete_files.length === 0) {
    const err = new Error(
      `Implementação sanitizada ficou vazia. Ignorados: ${skipped.map((item) => `${item.path} [${item.reason}]`).join(", ")}`
    );
    err.code = skipped.some((item) => String(item.reason).startsWith("blocked_"))
      ? "NON_FATAL_INVALID_FILE_SELECTION"
      : "EMPTY_IMPLEMENTATION";
    throw err;
  }

  if (impl.files.length > config.MAX_FILES_PER_TASK + 8) {
    throw new Error("Implementação alterou arquivos demais.");
  }

  return { impl, skipped };
}

function applyImplementation(impl) {
  const touched = [];
  for (const file of impl.files) {
    const jsonValidation = validateJsonContent(file.path, file.content);
    if (!jsonValidation.ok) {
      throw new Error(`Conteúdo inválido para ${file.path}: ${jsonValidation.reason}`);
    }
    safeWrite(abs(file.path), file.content);
    touched.push(normalizeSlashes(file.path));
  }

  for (const delPath of impl.delete_files || []) {
    const full = abs(delPath);
    if (exists(full)) {
      fs.unlinkSync(full);
      touched.push(normalizeSlashes(delPath));
    }
  }

  return unique(touched);
}

function mergeImplementations(baseImpl, nextImpl) {
  const baseFiles = Array.isArray(baseImpl?.files) ? baseImpl.files : [];
  const nextFiles = Array.isArray(nextImpl?.files) ? nextImpl.files : [];
  const fileMap = new Map();

  for (const file of [...baseFiles, ...nextFiles]) {
    if (!file || !file.path) continue;
    fileMap.set(normalizeSlashes(file.path), {
      path: normalizeSlashes(file.path),
      action: file.action || (exists(abs(file.path)) ? "update" : "create"),
      content: String(file.content || "")
    });
  }

  return {
    summary: sanitizeOneLine(nextImpl?.summary || baseImpl?.summary || "implementation updated", 320),
    files: [...fileMap.values()],
    delete_files: unique([
      ...(Array.isArray(baseImpl?.delete_files) ? baseImpl.delete_files : []),
      ...(Array.isArray(nextImpl?.delete_files) ? nextImpl.delete_files : [])
    ].map(normalizeSlashes)),
    notes: unique([
      ...(Array.isArray(baseImpl?.notes) ? baseImpl.notes : []),
      ...(Array.isArray(nextImpl?.notes) ? nextImpl.notes : [])
    ])
  };
}

module.exports = {
  isJsonFilePath,
  validateJsonContent,
  isValidImplementation,
  containsDangerousContent,
  sanitizeImplementation,
  applyImplementation,
  mergeImplementations
};
