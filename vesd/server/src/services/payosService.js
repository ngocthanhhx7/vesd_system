import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

const payosBaseUrl = () => env.payos.baseUrl.replace(/\/$/, '');

function requireConfig(kind = 'payment') {
  const config = kind === 'payout' ? env.payos.payout : env.payos;
  const missing = [];
  if (!config.clientId) missing.push(kind === 'payout' ? 'PAYOS_PAYOUT_CLIENT_ID/PAYOS_CLIENT_ID' : 'PAYOS_CLIENT_ID');
  if (!config.apiKey) missing.push(kind === 'payout' ? 'PAYOS_PAYOUT_API_KEY/PAYOS_API_KEY' : 'PAYOS_API_KEY');
  if (!config.checksumKey) missing.push(kind === 'payout' ? 'PAYOS_PAYOUT_CHECKSUM_KEY/PAYOS_CHECKSUM_KEY' : 'PAYOS_CHECKSUM_KEY');
  if (missing.length) throw new ApiError(500, `Chua cau hinh payOS: ${missing.join(', ')}`);
  return config;
}

function hmacSha256(data, checksumKey) {
  return createHmac('sha256', checksumKey).update(data).digest('hex');
}

function safeEqualHex(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  try {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
}

function sortObjDataByKey(object) {
  return Object.keys(object)
    .sort()
    .reduce((result, key) => {
      result[key] = object[key];
      return result;
    }, {});
}

function convertPaymentObjToQueryStr(object) {
  return Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .map((key) => {
      let value = object[key];
      if (Array.isArray(value)) value = JSON.stringify(value.map((item) => sortObjDataByKey(item)));
      if ([null, undefined, 'undefined', 'null'].includes(value)) value = '';
      return `${key}=${value}`;
    })
    .join('&');
}

function deepSortObj(object) {
  return Object.keys(object)
    .sort()
    .reduce((result, key) => {
      const value = object[key];
      if (Array.isArray(value)) {
        result[key] = value.map((item) => (typeof item === 'object' && item !== null ? deepSortObj(item) : item));
      } else if (typeof value === 'object' && value !== null) {
        result[key] = deepSortObj(value);
      } else {
        result[key] = value;
      }
      return result;
    }, {});
}

function convertPayoutObjToQueryStr(object) {
  return Object.keys(object)
    .map((key) => {
      let value = object[key];
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) value = JSON.stringify(value);
      if (value === null || value === undefined) value = '';
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    })
    .join('&');
}

export function createPayosPaymentSignature(payload, checksumKey = requireConfig().checksumKey) {
  const data = sortObjDataByKey({
    amount: payload.amount,
    cancelUrl: payload.cancelUrl,
    description: payload.description,
    orderCode: payload.orderCode,
    returnUrl: payload.returnUrl
  });
  return hmacSha256(convertPaymentObjToQueryStr(data), checksumKey);
}

export function verifyPayosPaymentSignature(data, signature, checksumKey = requireConfig().checksumKey) {
  const expected = hmacSha256(convertPaymentObjToQueryStr(sortObjDataByKey(data)), checksumKey);
  return safeEqualHex(expected, String(signature || ''));
}

export function createPayosPayoutSignature(payload, checksumKey = requireConfig('payout').checksumKey) {
  return hmacSha256(convertPayoutObjToQueryStr(deepSortObj(payload)), checksumKey);
}

async function payosFetch(path, { method = 'GET', body, kind = 'payment', headers = {} } = {}) {
  const config = requireConfig(kind);
  const response = await fetch(`${payosBaseUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': config.clientId,
      'x-api-key': config.apiKey,
      ...(env.payos.partnerCode && kind === 'payment' ? { 'x-partner-code': env.payos.partnerCode } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data?.desc || data?.message || 'payOS request failed', data);
  if (data?.code && data.code !== '00') throw new ApiError(400, data.desc || 'payOS tu choi request', data);
  return data;
}

export async function createPayosPaymentLink(payload) {
  const body = {
    ...payload,
    amount: Number(payload.amount),
    orderCode: Number(payload.orderCode),
    signature: createPayosPaymentSignature(payload)
  };
  return payosFetch('/v2/payment-requests', { method: 'POST', body });
}

export async function getPayosPaymentRequest(id) {
  return payosFetch(`/v2/payment-requests/${encodeURIComponent(id)}`);
}

export async function cancelPayosPaymentRequest(id, cancellationReason) {
  return payosFetch(`/v2/payment-requests/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: { cancellationReason }
  });
}

export async function confirmPayosWebhook(webhookUrl) {
  return payosFetch('/confirm-webhook', { method: 'POST', body: { webhookUrl } });
}

export async function createPayosSinglePayout(payload) {
  const body = {
    referenceId: payload.referenceId,
    amount: Number(payload.amount),
    description: payload.description,
    toBin: payload.toBin,
    toAccountNumber: payload.toAccountNumber,
    category: payload.category || ['withdrawal']
  };
  const idempotencyKey = payload.idempotencyKey || payload.referenceId;
  return payosFetch('/v1/payouts', {
    method: 'POST',
    kind: 'payout',
    body,
    headers: {
      'x-idempotency-key': idempotencyKey,
      'x-signature': createPayosPayoutSignature(body)
    }
  });
}

export async function getPayosPayout(payoutId) {
  return payosFetch(`/v1/payouts/${encodeURIComponent(payoutId)}`, { kind: 'payout' });
}

export async function getPayosPayoutBalance() {
  return payosFetch('/v1/payouts-account/balance', { kind: 'payout' });
}
