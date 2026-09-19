import { TelegramBindTokenService } from './bind-token.service.js';
import { TelegramLoginNonceService } from './login-nonce.service.js';
import { env } from '../../config/env.js';
import { redis } from '../../config/redis.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './telegram.repository.js';
import { loginByUserId } from '../auth/auth.service.js';

const allowedRoles = new Set(['student', 'parent']);

const bindTokenService = new TelegramBindTokenService({
  redis,
  botUsername: env.TELEGRAM_BOT_USERNAME || '',
});

const loginNonceService = new TelegramLoginNonceService({
  redis,
  botUsername: env.TELEGRAM_BOT_USERNAME || '',
});

/** Telegram вообще настроен на этом окружении. */
function assertConfigured() {
  if (!env.TELEGRAM_BOT_USERNAME) {
    // 503, а не 500: это не сбой кода, а незаданная переменная окружения.
    // По этому статусу фронт прячет кнопку вместо показа «ошибка сервера».
    throw new AppError(503, 'Telegram is not configured on this server');
  }
}

function assertMemberRole(req) {
  if (!allowedRoles.has(req.user?.role)) {
    throw new AppError(403, 'Only student and parent accounts can bind Telegram');
  }
}

export async function createBindToken(req, res, next) {
  try {
    assertMemberRole(req);
    assertConfigured();

    const payload = await bindTokenService.createForUser(req.user.id);
    res.status(201).json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
}

/**
 * Состояние привязки для кабинета. Раньше UI его узнать не мог и всегда рисовал
 * одну и ту же кнопку «Telegram»: уже привязанный человек жал её повторно и
 * получал от бота «этот аккаунт уже привязан» — выглядело как поломка.
 */
export async function getStatus(req, res, next) {
  try {
    assertMemberRole(req);

    const binding = await repo.findBindingByUserId(req.user.id);
    res.json({
      success: true,
      data: {
        configured: Boolean(env.TELEGRAM_BOT_USERNAME),
        linked: Boolean(binding),
        username: binding?.tg_username ?? null,
        firstName: binding?.tg_first_name ?? null,
        linkedAt: binding?.linked_at ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Отвязка из кабинета. Раньше отвязаться можно было только командой /stop в самом
 * боте — то есть потерявший доступ к тому Telegram не мог привязать новый:
 * `user_id` в telegram_accounts уникален, вставка падала на 23505.
 */
export async function unlink(req, res, next) {
  try {
    assertMemberRole(req);

    const removed = await repo.deleteBindingByUserId(req.user.id);
    res.json({ success: true, data: { unlinked: removed } });
  } catch (err) {
    next(err);
  }
}

/** Шаг 1 входа: выдать nonce и deep-link. Без авторизации — это и есть вход. */
export async function startLogin(req, res, next) {
  try {
    assertConfigured();
    const payload = await loginNonceService.create();
    res.status(201).json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
}

/**
 * Шаг 2: фронт опрашивает, подтвердил ли человек вход в боте.
 *
 * `pending` и `unknown` разделены намеренно: первое — «ждём, опрашивай дальше»,
 * второе — «ссылка истекла, начинай заново». Свести их в одно значило бы
 * заставить вкладку крутить спиннер над мёртвым nonce до бесконечности.
 */
export async function pollLogin(req, res, next) {
  try {
    const nonce = String(req.query.nonce || '').trim();
    if (!nonce) throw new AppError(400, 'nonce required');

    const result = await loginNonceService.claim(nonce);

    if (result.status !== 'approved') {
      res.json({ success: true, data: { status: result.status } });
      return;
    }

    // Удаляем nonce ТОЛЬКО после успешной выдачи сессии — иначе сбой здесь
    // (напр. Redis/БД недоступны) стирает nonce впустую, и следующий опрос
    // видит "unknown" вместо настоящей ошибки (см. login-nonce.service.js).
    const session = await loginByUserId(result.userId, ['student', 'parent']);

    // Вход одобрен ботом раньше, чем мы узнали организацию (nonce публичный,
    // до этой строки req.user нет) — поэтому фича-гейт здесь, а не в роуте
    // (requireOrgFeature на bind-token его уже не пускал бы новую привязку,
    // но старая привязка могла остаться от момента, когда фича была включена).
    // publicUser() (auth.service.js) уже посчитал orgFeatures — второй запрос
    // к БД тут был бы дублем той же самой строки.
    await loginNonceService.consume(nonce);
    if (!session.user.orgFeatures.telegramIntegration) {
      throw new AppError(403, 'Telegram integration is not enabled for your organization');
    }

    res.json({ success: true, data: { status: 'approved', ...session } });
  } catch (err) {
    next(err);
  }
}
