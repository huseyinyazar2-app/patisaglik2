import { CLIENT_ERROR_CODES, makeCodedError } from './errorCodes.js';

const API_FALLBACK = 'https://api.pethelp.app';
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || (import.meta.env?.DEV ? '' : API_FALLBACK);

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function postJson(path, body) {
  let response;
  try {
    response = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw makeCodedError('network_error', { code: CLIENT_ERROR_CODES.network_error, message: error.message || 'network_error' });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const reason = data.error || data.reason || `http_${response.status}`;
    throw makeCodedError(reason, { code: data.errorCode, message: reason });
  }
  return data;
}

export async function postApiJson(path, body) {
  return postJson(path, body);
}

export async function registerAccount(input) {
  return postJson('/api/auth/register', input);
}

export async function loginAccount(input) {
  return postJson('/api/auth/login', input);
}

export async function requestMediaUpload({ userId, petId, category, file }) {
  return postJson('/api/media/sign-upload', {
    userId,
    petId,
    category,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size
  });
}

export async function completeMediaUpload(input) {
  return postJson('/api/media/complete', input);
}

export async function uploadMediaFile({ userId, petId, category, file, relatedEntityType, relatedEntityId }) {
  const signed = await requestMediaUpload({ userId, petId, category, file });
  const upload = await fetch(signed.uploadUrl, {
    method: signed.method || 'PUT',
    headers: signed.headers || {},
    body: file
  });
  if (!upload.ok) throw makeCodedError('upload_failed', { code: CLIENT_ERROR_CODES.upload_failed, message: `upload_${upload.status}` });
  const completed = await completeMediaUpload({
    userId,
    petId,
    category,
    objectKey: signed.objectKey,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    relatedEntityType,
    relatedEntityId
  });
  return { ...signed, ...completed };
}
