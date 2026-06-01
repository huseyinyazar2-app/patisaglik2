export const mediaCategories = {
  documents: { maxBytes: 30 * 1024 * 1024, retention: 'permanent', mediaType: 'document' },
  reports: { maxBytes: 30 * 1024 * 1024, retention: 'permanent', mediaType: 'document' },
  'health-media': { maxBytes: 20 * 1024 * 1024, retention: 'permanent', mediaType: 'image' },
  followups: { maxBytes: 120 * 1024 * 1024, retention: 'permanent', mediaType: 'image' },
  'ai-inputs': { maxBytes: 120 * 1024 * 1024, retention: 'temporary_90d', mediaType: 'document' }
};

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} env eksik.`);
  return value;
}

export function optionalEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

export function b2Config() {
  const endpoint = requiredEnv('B2_S3_ENDPOINT').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return {
    endpoint,
    bucket: requiredEnv('B2_BUCKET_NAME'),
    accessKeyId: requiredEnv('B2_APPLICATION_KEY_ID'),
    secretAccessKey: requiredEnv('B2_APPLICATION_KEY'),
    region: optionalEnv('B2_REGION', 'us-east-005')
  };
}
