"use strict";

const path = require("path");
const { CONFIG } = require("../config");
const { walkFiles, rel, abs, safeRead, exists, isProtectedFile } = require("../core/fs-utils");
const { sha1, truncate, unique } = require("../core/text");

function buildRepoIndex() {
  const files = walkFiles(CONFIG.REPO_PATH);
  const rels = files.map(rel).filter((p) => !isProtectedFile(p)).sort();

  const importantNames = [
    "package.json",
    "README.md",
    "tsconfig.json",
    "jsconfig.json",
    "vite.config.ts",
    "vite.config.js",
    "next.config.js",
    "next.config.mjs",
    "nest-cli.json",
    "docker-compose.yml",
    "docker-compose.yaml",
    "prisma/schema.prisma",
    "eslint.config.js",
    "eslint.config.cjs",
    "eslint.config.mjs",
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.cjs"
  ];

  const importantFiles = [];
  for (const name of importantNames) {
    const found = files.find((f) => rel(f).toLowerCase() === name.toLowerCase());
    if (found && !isProtectedFile(rel(found))) importantFiles.push(found);
  }

  const codeFiles = files.filter((f) => {
    const r = rel(f);
    if (isProtectedFile(r)) return false;
    return /src\/|app\/|server\/|routes\/|controllers\/|services\/|components\/|pages\/|lib\/|utils\//i.test(r);
  });

  const merged = unique([...importantFiles, ...codeFiles.slice(0, CONFIG.MAX_CONTEXT_FILES)]);

  return {
    files,
    rels,
    importantFiles: merged.slice(0, CONFIG.MAX_CONTEXT_FILES),
    repoHash: sha1(rels.join("\n"))
  };
}

function readFileContext(filePath, maxChars = CONFIG.MAX_FILE_CHARS) {
  const content = safeRead(filePath, "");
  return `FILE: ${rel(filePath)}\n-----\n${truncate(content, maxChars)}\n`;
}

function loadBlueprint() {
  const blueprintPath = path.join(CONFIG.REPO_PATH, CONFIG.BLUEPRINT_FILE);
  if (!exists(blueprintPath)) {
    throw new Error(`BLUEPRINT obrigatório não encontrado: ${CONFIG.BLUEPRINT_FILE}`);
  }

  const blueprint = safeRead(blueprintPath, "").trim();
  if (!blueprint || blueprint.length < 30) {
    throw new Error(`BLUEPRINT inválido ou vazio: ${CONFIG.BLUEPRINT_FILE}`);
  }

  return {
    path: blueprintPath,
    content: truncate(blueprint, CONFIG.MAX_BLUEPRINT_CHARS),
    hash: sha1(blueprint)
  };
}

function readPackageJsonSafe() {
  const packageJsonPath = path.join(CONFIG.REPO_PATH, "package.json");
  if (!exists(packageJsonPath)) return null;
  try {
    return JSON.parse(safeRead(packageJsonPath, "{}"));
  } catch {
    return null;
  }
}

function buildRepoSnapshot(index) {
  const pkg = readPackageJsonSafe();
  let packageSummary = "package.json não encontrado";
  let dependencySummary = [];

  if (pkg) {
    dependencySummary = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {})
    ];

    packageSummary = JSON.stringify(
      {
        name: pkg.name || null,
        version: pkg.version || null,
        type: pkg.type || null,
        scripts: pkg.scripts || {},
        dependencies: Object.keys(pkg.dependencies || {}).slice(0, 100),
        devDependencies: Object.keys(pkg.devDependencies || {}).slice(0, 100)
      },
      null,
      2
    );
  } else if (exists(abs("package.json"))) {
    packageSummary = truncate(safeRead(abs("package.json"), ""));
  }

  const fileContexts = index.importantFiles.map((f) => readFileContext(f)).join("\n\n");
  const evolutionDocPath = abs(CONFIG.MAIN_EVOLUTION_DOC);
  const evolutionDocSummary = exists(evolutionDocPath)
    ? truncate(safeRead(evolutionDocPath, ""), CONFIG.EVOLUTION_DOC_CONTEXT_CHARS)
    : "";

  return {
    packageSummary,
    dependencySummary,
    fileList: index.rels.slice(0, 1500).join("\n"),
    fileContexts,
    evolutionDocSummary
  };
}

function collectFileContents(paths) {
  return unique(paths || [])
    .slice(0, CONFIG.MAX_CONTEXT_FILES)
    .map((p) => {
      const full = abs(p);
      const content = exists(full) ? safeRead(full, "") : "";
      return `FILE: ${p}\n-----\n${truncate(content, CONFIG.MAX_FILE_CHARS)}\n`;
    })
    .join("\n\n");
}

module.exports = {
  buildRepoIndex,
  readFileContext,
  loadBlueprint,
  readPackageJsonSafe,
  buildRepoSnapshot,
  collectFileContents
};
