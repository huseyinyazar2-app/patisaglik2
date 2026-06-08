export const CLIENT_ERROR_CODES = {
  network_error: 9001,
  upload_failed: 9002,
  local_file_read_failed: 9003,
  missing_file: 3101,
  missing_key: 3102,
  http_error: 3999,
  unknown_error: 9999
};

export function errorCodeFor(reason, fallback = CLIENT_ERROR_CODES.unknown_error) {
  const key = String(reason || '').trim();
  if (CLIENT_ERROR_CODES[key]) return CLIENT_ERROR_CODES[key];
  if (/^http_\d+$/i.test(key)) return CLIENT_ERROR_CODES.http_error;
  return fallback;
}

export function makeCodedError(reason, { code, message } = {}) {
  const error = new Error(message || reason || 'unknown_error');
  error.code = code || errorCodeFor(reason);
  error.reason = reason || 'unknown_error';
  return error;
}

export function formatErrorForDeveloper(error, fallbackMessage = 'Islem tamamlanamadi') {
  const code = error?.code || error?.errorCode || errorCodeFor(error?.reason || error?.message);
  const detail = error?.message || error?.reason || 'unknown_error';
  return `${fallbackMessage}. Hata kodu: ${code}. Detay: ${detail}`;
}
