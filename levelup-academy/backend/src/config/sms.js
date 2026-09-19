import { env } from './env.js';
import { logger } from './logger.js';

/**
 * SMS gateway. Provider-agnostic: POST { phone, text } with Bearer token.
 * Без SMS_API_URL (dev) сообщение только логируется — код OTP виден в логах.
 */
export async function sendSms(phone, text) {
  if (!env.SMS_API_URL) {
    logger.info({ phone, text }, '[dev] SMS not sent — SMS_API_URL is not configured');
    return { delivered: false, dev: true };
  }

  const res = await fetch(env.SMS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.SMS_API_TOKEN && { Authorization: `Bearer ${env.SMS_API_TOKEN}` }),
    },
    body: JSON.stringify({ phone, text }),
  });

  if (!res.ok) {
    throw new Error(`SMS provider responded ${res.status}: ${await res.text()}`);
  }
  return { delivered: true };
}
