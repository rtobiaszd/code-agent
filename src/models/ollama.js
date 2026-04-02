"use strict";

const axios = require("axios");
const { CONFIG } = require("../config");
const { truncate, parseJsonSafe } = require("../core/text");
const { log } = require("../core/logger");

async function askModel(model, prompt) {
  const response = await axios.post(
    CONFIG.OLLAMA_URL,
    { model, prompt, stream: false },
    { timeout: 1000 * 60 * 10 }
  );

  return response.data?.response || "";
}

async function repairJsonWithModel(model, raw, label) {
  const prompt = [
    "You are a JSON repair engine.",
    "",
    "TASK:",
    "Repair the following broken JSON so it becomes directly parsable by JSON.parse.",
    "",
    "RULES:",
    "- Return ONLY valid JSON",
    "- No markdown",
    "- No explanation",
    "- Keep the original structure and intent",
    "- Escape all strings correctly",
    "- Preserve file contents exactly as much as possible",
    "",
    "BROKEN INPUT:",
    truncate(raw, 40000)
  ].join("\n");

  const repairedRaw = await askModel(model, prompt);
  const parsed = parseJsonSafe(repairedRaw);

  if (parsed) {
    log(`🧩 JSON repaired for ${label}`);
    return parsed;
  }

  return null;
}

async function askAndParseJson(model, prompt, label, validator = null) {
  const raw = await askModel(model, prompt);
  let parsed = parseJsonSafe(raw);

  if (!parsed && CONFIG.MAX_JSON_REPAIR_ATTEMPTS > 0) {
    parsed = await repairJsonWithModel(CONFIG.MODEL_JSON_REPAIR, raw, label);
  }

  if (!parsed) {
    throw new Error(`Falha ao parsear JSON para ${label}`);
  }

  if (validator && !validator(parsed)) {
    throw new Error(`JSON inválido para ${label}`);
  }

  return parsed;
}

module.exports = {
  askModel,
  repairJsonWithModel,
  askAndParseJson
};
