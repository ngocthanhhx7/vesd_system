import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

function requireWebhookSecret() {
  if (!env.casso.webhookSecret) throw new ApiError(500, 'Chua cau hinh CASSO_WEBHOOK_SECRET');
  return env.casso.webhookSecret;
}

function sortObjDataByKey(data) {
  if (!data || typeof data !== 'object') return data;
  return Object.keys(data)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObjDataByKey(data[key]);
      return result;
    }, {});
}

function safeEqual(left, right) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyCassoWebhookV2Signature(signatureHeader, payload) {
  const secret = requireWebhookSecret();
  const match = String(signatureHeader || '').match(/t=(\d+),v1=([a-f0-9]+)/i);
  if (!match) return false;

  const [, timestamp, signature] = match;
  const sortedPayload = sortObjDataByKey(payload);
  const message = `${timestamp}.${JSON.stringify(sortedPayload)}`;
  const expectedSignature = createHmac('sha512', secret).update(message).digest('hex');
  return safeEqual(expectedSignature, signature);
}

export function verifyCassoLegacySecureToken(secureToken) {
  if (!env.casso.legacySecureToken) throw new ApiError(500, 'Chua cau hinh CASSO_WEBHOOK_SECRET');
  return safeEqual(env.casso.legacySecureToken, String(secureToken || ''));
}
