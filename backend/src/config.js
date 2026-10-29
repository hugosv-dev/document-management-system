const path = require('node:path');

const DEFAULT_PORT = 3000;
const DEFAULT_MAX_FILE_SIZE_MB = 10;
const DEFAULT_STORAGE_DIR = path.resolve(__dirname, '..', 'storage');
const BYTES_PER_MB = 1024 * 1024;

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadConfig(env = process.env) {
  const maxFileSizeMb = parsePositiveNumber(env.MAX_FILE_SIZE_MB, DEFAULT_MAX_FILE_SIZE_MB);

  return {
    port: parsePositiveNumber(env.PORT, DEFAULT_PORT),
    storageDir: env.STORAGE_DIR ? path.resolve(env.STORAGE_DIR) : DEFAULT_STORAGE_DIR,
    maxFileSizeMb,
    maxFileSizeBytes: Math.floor(maxFileSizeMb * BYTES_PER_MB),
  };
}

module.exports = { loadConfig };
