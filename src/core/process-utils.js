"use strict";

const { spawnSync } = require("child_process");
const { CONFIG } = require("../config");

function run(command, options = {}) {
  const result = spawnSync(command, {
    cwd: options.cwd || CONFIG.REPO_PATH,
    shell: true,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 1024 * 1024 * 100
  });

  return {
    ok: result.status === 0,
    code: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

module.exports = {
  run
};
