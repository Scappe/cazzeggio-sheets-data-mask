import crypto from 'node:crypto';
import { requestKey } from './_lib.js';
import { ACCESS_KEY_SHA256 } from './auth-hash.js';

export function isAuthorized(req) {
  const supplied = requestKey(req);
  if (!supplied) return false;
  const digest = crypto.createHash('sha256').update(String(supplied)).digest('hex');
  const expected = Buffer.from(ACCESS_KEY_SHA256, 'hex');
  const actual = Buffer.from(digest, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
