const path = require('node:path');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const DEFAULT_PORT = 3000;
const DEFAULT_MAX_FILE_SIZE_MB = 10;
const DEFAULT_STORAGE_DIR = 'storage';
const BYTES_PER_MB = 1024 * 1024;
const MAX_PORT = 65535;

function isMissing(value) {
  return value === undefined || value.trim() === '';
}

function parsePort(value) {
  if (isMissing(value)) {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
    throw new Error(`PORT inválida: "${value}". Use um inteiro entre 1 e ${MAX_PORT}.`);
  }
  return port;
}

function parseMaxFileSizeMb(value) {
  if (isMissing(value)) {
    return DEFAULT_MAX_FILE_SIZE_MB;
  }

  const maxFileSizeMb = Number(value);
  if (!Number.isFinite(maxFileSizeMb) || maxFileSizeMb <= 0) {
    throw new Error(`MAX_FILE_SIZE_MB inválido: "${value}". Use um número maior que zero.`);
  }
  return maxFileSizeMb;
}

// Lança erro para valores inválidos (fail fast); caminhos relativos de
// STORAGE_DIR são resolvidos a partir da pasta backend/.
function loadConfig(env = process.env) {
  const maxFileSizeMb = parseMaxFileSizeMb(env.MAX_FILE_SIZE_MB);

  return {
    port: parsePort(env.PORT),
    storageDir: path.resolve(
      BACKEND_ROOT,
      isMissing(env.STORAGE_DIR) ? DEFAULT_STORAGE_DIR : env.STORAGE_DIR,
    ),
    maxFileSizeMb,
    maxFileSizeBytes: Math.floor(maxFileSizeMb * BYTES_PER_MB),
  };
}

module.exports = { loadConfig };
