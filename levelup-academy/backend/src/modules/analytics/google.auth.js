import { JWT } from 'google-auth-library';
import { env } from '../../config/env.js';

/**
 * Доступ к Google API от имени сервисного аккаунта (Karis 25.08.2026).
 *
 * Почему сервисный аккаунт, а не OAuth-токен владельца: refresh-token у
 * приложения в статусе Testing Google принудительно гасит через 7 дней —
 * панель молча переставала бы показывать данные раз в неделю. У сервисного
 * аккаунта срока жизни нет.
 *
 * Новая зависимость не нужна: google-auth-library уже стоит в проекте ради
 * проверки id-token при входе через Google (modules/auth/auth.service.js),
 * и та же библиотека умеет JWT сервисного аккаунта.
 *
 * Оба скоупа — readonly. Сервер только читает статистику и физически не может
 * что-то изменить в GA4 или Search Console, даже если ключ утечёт.
 */
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
];

/**
 * Приводит ключ к настоящему PEM.
 *
 * В .env многострочное значение не живёт, поэтому ключ хранят одной строкой с
 * литеральными \n — их надо развернуть обратно. Отдельно принимаем base64:
 * некоторые хостинги (Render в том числе) режут значения с переводами строк,
 * и там base64 — единственный рабочий способ.
 */
function normalizePrivateKey(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (value.includes('BEGIN')) return value.replace(/\\n/g, '\n');
  // не PEM — значит base64
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    return decoded.includes('BEGIN') ? decoded.replace(/\\n/g, '\n') : '';
  } catch {
    return '';
  }
}

/** Чего именно не хватает — чтобы панель показала не «ошибку», а список дел. */
export function missingConfig() {
  const missing = [];
  if (!env.GOOGLE_SA_CLIENT_EMAIL) missing.push('GOOGLE_SA_CLIENT_EMAIL');
  if (!normalizePrivateKey(env.GOOGLE_SA_PRIVATE_KEY)) missing.push('GOOGLE_SA_PRIVATE_KEY');
  if (!env.GA4_PROPERTY_ID) missing.push('GA4_PROPERTY_ID');
  return missing;
}

export function isConfigured() {
  return missingConfig().length === 0;
}

let client = null;

/**
 * JWT-клиент. Токен доступа он выпускает и обновляет сам, поэтому кешировать
 * его вручную не нужно — достаточно переиспользовать сам клиент.
 */
export function googleClient() {
  if (!isConfigured()) return null;
  if (!client) {
    client = new JWT({
      email: env.GOOGLE_SA_CLIENT_EMAIL,
      key: normalizePrivateKey(env.GOOGLE_SA_PRIVATE_KEY),
      scopes: SCOPES,
    });
  }
  return client;
}

/**
 * Ошибки Google приходят вложенными (error.response.data.error.message) и до
 * пользователя в сыром виде доходить не должны. Здесь их разворачиваем в одну
 * понятную строку — она попадёт на экран, поэтому важнее всего два случая:
 * 403 (сервисный аккаунт не добавлен в ресурс) и 404 (ID ресурса неверный).
 */
export function describeGoogleError(err, source) {
  const status = err?.response?.status ?? err?.status ?? null;
  const raw = err?.response?.data?.error?.message ?? err?.message ?? 'неизвестная ошибка';

  if (status === 403) {
    return `${source}: доступ запрещён (403). Сервисный аккаунт ${env.GOOGLE_SA_CLIENT_EMAIL || '—'} не добавлен в ресурс, либо у него нет прав на чтение. Оригинал: ${raw}`;
  }
  if (status === 404) {
    return `${source}: ресурс не найден (404). Проверьте GA4_PROPERTY_ID / GSC_SITE_URL. Оригинал: ${raw}`;
  }
  if (status === 429) {
    return `${source}: превышена квота запросов (429). Данные появятся, когда квота обновится. Оригинал: ${raw}`;
  }
  return `${source}: ${raw}${status ? ` (HTTP ${status})` : ''}`;
}
