export const ERROR_CODES = {
  body_too_large: 1001,
  invalid_json: 1002,
  server_error: 1003,
  not_found: 1004,
  db_not_configured: 1201,
  invalid_register_fields: 1301,
  phone_already_registered: 1302,
  invalid_login_fields: 1303,
  invalid_credentials: 1304,
  invalid_login: 1305,
  unauthorized: 1306,
  missing_file: 3101,
  missing_key: 3102,
  ai_missing_key: 3107,
  ai_provider_http: 3103,
  invalid_schema: 3104,
  invalid_json_ai: 3105,
  ai_request_failed: 3106,
  unsupported_category: 3201,
  missing_required_fields: 3202,
  file_too_large: 3203,
  invalid_object_key: 3204,
  admin_request_failed: 4101
};

export function errorCodeFor(reason, fallback = ERROR_CODES.server_error) {
  const key = String(reason || '').trim();
  if (ERROR_CODES[key]) return ERROR_CODES[key];
  if (/^http_\d+$/i.test(key)) return ERROR_CODES.ai_provider_http;
  return fallback;
}

export function codedError(reason, extra = {}) {
  return {
    ok: false,
    error: reason,
    errorCode: errorCodeFor(reason),
    ...extra
  };
}
