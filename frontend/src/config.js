const DEFAULT_MAX_FILE_SIZE_MB = 10;
const configuredMaxFileSizeMb = Number(import.meta.env.VITE_MAX_FILE_SIZE_MB);

// Deve acompanhar MAX_FILE_SIZE_MB do backend, que continua sendo a validação definitiva.
export const MAX_FILE_SIZE_MB =
  configuredMaxFileSizeMb > 0 ? configuredMaxFileSizeMb : DEFAULT_MAX_FILE_SIZE_MB;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Mesmo formato aceito pelo backend no cabeçalho X-User-Id.
export const USER_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
