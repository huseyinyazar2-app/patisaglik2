const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '';

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function postJson(path, body) {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `http_${response.status}`);
  return data;
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
  if (!upload.ok) throw new Error(`upload_${upload.status}`);
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
