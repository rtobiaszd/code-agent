"use strict";

const { CONFIG } = require("../config");

function stamp() {
  return new Date().toISOString();
}

function log(...args) {
  console.log(stamp(), "-", ...args);
}

function debug(...args) {
  if (CONFIG.DEBUG) {
    console.log(stamp(), "-", "[DEBUG]", ...args);
  }
}

module.exports = {
  log,
  debug
};
