import crypto from 'node:crypto';
import { b2Config } from './config.js';

function hmac(key, value) {
  return crypto.createHmac('sha256', key).update(value).digest();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function encodePath(value) {
  return String(value).split('/').map(encodeURIComponent).join('/');
}

function signingKey(secret, dateStamp, region) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}

export function presignObject({ method = 'GET', objectKey, expiresSeconds = 900 }) {
  const cfg = b2Config();
  const now = new Date();
  const fullDate = amzDate(now);
  const dateStamp = fullDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const canonicalUri = `/${encodePath(cfg.bucket)}/${encodePath(objectKey)}`;
  const params = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${cfg.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': fullDate,
    'X-Amz-Expires': String(expiresSeconds),
    'X-Amz-SignedHeaders': 'host'
  });
  params.sort();

  const canonicalRequest = [
    method,
    canonicalUri,
    params.toString(),
    `host:${cfg.endpoint}\n`,
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    fullDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join('\n');
  const signature = crypto
    .createHmac('sha256', signingKey(cfg.secretAccessKey, dateStamp, cfg.region))
    .update(stringToSign)
    .digest('hex');

  params.set('X-Amz-Signature', signature);
  return `https://${cfg.endpoint}${canonicalUri}?${params.toString()}`;
}

export function presignPutObject(input) {
  return presignObject({ ...input, method: 'PUT' });
}

export function presignGetObject(input) {
  return presignObject({ ...input, method: 'GET' });
}
