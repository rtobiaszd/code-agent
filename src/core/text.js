"use strict";

const crypto = require("crypto");

function sha1(value) {
  return crypto.createHash("sha1").update(String(value || "")).digest("hex");
}

function unique(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function stripCodeFence(text) {
  return String(text || "")
    .replace(/^```(?:json|javascript|js|txt)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function sanitizeOneLine(text, max = 220) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function truncate(text, max) {
  const limit = Number(max || 20000);
  const content = String(text || "");
  if (content.length <= limit) return content;
  return `${content.slice(0, limit)}\n/* ...TRUNCATED... */`;
}

function stableTextSignature(text) {
  return sha1(String(text || "").trim().toLowerCase());
}

function stableTaskSignature(task) {
  const payload = {
    title: String(task?.title || ""),
    category: String(task?.category || ""),
    goal: String(task?.goal || ""),
    files: Array.isArray(task?.files) ? [...task.files].sort() : []
  };
  return sha1(JSON.stringify(payload));
}

function listToBullets(items, fallback = "- none") {
  const cleaned = unique((items || []).map((item) => sanitizeOneLine(item, 260)).filter(Boolean));
  if (!cleaned.length) return fallback;
  return cleaned.map((item) => `- ${item}`).join("\n");
}

function sanitizeModelOutput(raw) {
  if (!raw) return "";
  let cleaned = stripCodeFence(raw).trim();
  cleaned = cleaned.replace(/^\uFEFF/, "");
  cleaned = cleaned.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  return cleaned;
}

function parseJsonSafe(raw) {
  if (!raw) return null;

  try {
    let cleaned = sanitizeModelOutput(raw)
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {}

    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return null;

    let candidate = match[0];
    candidate = candidate.replace(/,\s*([}\]])/g, "$1");
    candidate = candidate.replace(/:\s*`([\s\S]*?)`(?=\s*[,}])/g, (_, c) => {
      return ": " + JSON.stringify(c);
    });

    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function errorProgressScore(summary) {
  const text = String(summary || "").toLowerCase();
  let score = 0;
  if (text.includes("error")) score += 10;
  if (text.includes("typescript")) score += 8;
  if (text.includes("typecheck")) score += 8;
  if (text.includes("build")) score += 7;
  if (text.includes("eslint")) score += 6;
  if (text.includes("lint")) score += 6;
  if (text.includes("test")) score += 4;
  score += text.length / 1000;
  return score;
}

module.exports = {
  sha1,
  unique,
  stripCodeFence,
  sanitizeOneLine,
  truncate,
  stableTextSignature,
  stableTaskSignature,
  listToBullets,
  sanitizeModelOutput,
  parseJsonSafe,
  errorProgressScore
};
