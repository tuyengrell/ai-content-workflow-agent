import { createHmac, timingSafeEqual } from 'node:crypto';
export function configured(env) { return Boolean(env.REVIEW_PASSWORD?.trim() && env.SESSION_SECRET?.trim()); }
const sign = (value, secret) => createHmac('sha256', secret).update(value).digest('hex');
export function login(password, env, now = Date.now()) {
  if (!configured(env)) throw Object.assign(new Error('Configuration error: REVIEW_PASSWORD and SESSION_SECRET are required'), { status: 503 });
  const a = Buffer.from(String(password ?? '')), b = Buffer.from(env.REVIEW_PASSWORD);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  const expiry = String(now + 3600000); return `${expiry}.${sign(expiry, env.SESSION_SECRET)}`;
}
export function verify(token, env, now = Date.now()) {
  if (!configured(env) || typeof token !== 'string' || !/^\d{13}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expiry, signature] = token.split('.');
  return Number(expiry) > now && timingSafeEqual(Buffer.from(signature), Buffer.from(sign(expiry, env.SESSION_SECRET)));
}
