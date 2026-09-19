import { messages } from './messages.js';
import { TelegramBindTokenService } from './bind-token.service.js';
import { TelegramLoginNonceService } from './login-nonce.service.js';
import { BranchBindTokenService } from './branch-bind-token.service.js';
import { GroupBindTokenService } from './group-bind-token.service.js';
import { LOGIN_PAYLOAD_PREFIX } from './constants.js';
import { resolveUser, coinsCommand, ratingCommand, homeCommand } from './bot.commands.js';
import { isFeatureEnabledForOrg } from '../../shared/orgFeatures.js';

export function registerTelegramBotHandlers({ bot, pool, redis, logger, language = 'ru' }) {
  if (!bot) return;

  const t = messages(language);
  const bindTokens = new TelegramBindTokenService({ redis, botUsername: 'unused-for-consume-only' });
  const loginNonces = new TelegramLoginNonceService({ redis, botUsername: 'unused-for-approve-only' });
  const branchBindTokens = new BranchBindTokenService({ redis });
  const groupBindTokens = new GroupBindTokenService({ redis });

  /**
   * Что именно пришло от Telegram. Без этого молчание бота неотличимо от
   * «обновление не дошло»: webhook отдаёт 200 и на update, который не совпал
   * ни с одним обработчиком, поэтому по коду ответа диагноз не поставить.
   */
  bot.use(async (ctx, next) => {
    const text = ctx.message?.text;
    if (text) {
      logger?.info(
        { chatId: ctx.chat?.id, text: text.slice(0, 32), entities: ctx.message?.entities?.map((e) => e.type) },
        'Telegram update received',
      );
    }
    await next();
  });

  bot.command('start', async (ctx) => {
    const payload = String(ctx.match || '').trim();
    if (!payload) {
      await ctx.reply(t.startHelp);
      return;
    }

    // Один deep-link на две операции — тип зашит в payload (см. constants.js).
    if (payload.startsWith(LOGIN_PAYLOAD_PREFIX)) {
      await handleLogin({ ctx, pool, loginNonces, logger, messages: t, payload });
      return;
    }

    await handleBind({ ctx, pool, bindTokens, logger, messages: t, token: payload });
  });

  /**
   * Команды «про меня». Обёртка одна на все три: каждая должна сначала узнать,
   * кому принадлежит чат, и отказать, если привязки нет — дублировать эти
   * пять строк в каждой команде значит однажды забыть их в одной.
   */
  const dataCommand = (name, handler) =>
    bot.command(name, async (ctx) => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;

      try {
        const user = await resolveUser(pool, chatId);
        if (!user) {
          await ctx.reply(t.loginNotLinked);
          return;
        }
        // XOB (12.08): до входа личность неизвестна — эти строки остаются на
        // языке бота по умолчанию. С этой точки студент уже определён —
        // дальше отвечаем на ЕГО языке, а не на глобальном TELEGRAM_BOT_LANG.
        const tUser = messages(user.preferredLanguage || language);
        // Родителю эти цифры не подходят: у него нет своих коинов и рейтинга,
        // а данные ребёнка требуют выбора, какого именно.
        if (user.role !== 'student') {
          await ctx.reply(tUser.onlyForStudents);
          return;
        }

        await ctx.reply(await handler(user), { parse_mode: 'HTML' });
      } catch (err) {
        logger?.error({ err, chatId, command: name }, 'Telegram data command failed');
        await ctx.reply(t.dataError);
      }
    });

  dataCommand('home', homeCommand);
  dataCommand('coins', coinsCommand);
  dataCommand('rating', ratingCommand);

  bot.command('help', async (ctx) => {
    await ctx.reply(t.helpText);
  });

  /**
   * Привязка группы родителей филиала (Branch Manager). Код выдаётся в
   * кабинете (POST /api/branch-manager/telegram/bind-token), бот добавляется
   * в группу ВРУЧНУЮ, а эта команда отправляется прямо в группе. /start с
   * deep-link здесь не подходит: Telegram открывает по нему приватный чат с
   * ботом, а не групповой — payload из группового /start не долетает так же.
   */
  bot.command('bindbranch', async (ctx) => {
    const chatType = ctx.chat?.type;
    if (chatType !== 'group' && chatType !== 'supergroup') {
      await ctx.reply(t.branchBindNotGroup);
      return;
    }

    const token = String(ctx.match || '').trim();
    const branchId = await branchBindTokens.consume(token);
    if (!branchId) {
      await ctx.reply(t.branchBindTokenInvalid);
      return;
    }

    const chatId = ctx.chat.id;
    try {
      const { rowCount } = await pool.query(
        `UPDATE branches SET parent_tg_chat_id = $1, parent_tg_bound_at = now()
          WHERE id = $2 AND deleted_at IS NULL`,
        [chatId, branchId],
      );
      if (rowCount === 0) {
        await ctx.reply(t.branchBindTokenInvalid);
        return;
      }
      await ctx.reply(t.branchBindSuccess);
    } catch (err) {
      if (err?.code === '23505') {
        await ctx.reply(t.branchBindAlreadyLinked);
        return;
      }
      logger?.error({ err, branchId, chatId }, 'Branch Telegram group bind failed');
      await ctx.reply(t.genericError);
    }
  });

  bot.command('bindgroup', async (ctx) => {
    if (!['group', 'supergroup'].includes(ctx.chat?.type)) return ctx.reply(t.branchBindNotGroup);
    const groupId = await groupBindTokens.consume(String(ctx.match || '').trim());
    if (!groupId) return ctx.reply(t.branchBindTokenInvalid);
    try {
      const { rowCount } = await pool.query(
        `UPDATE groups SET parent_tg_chat_id = $1, parent_tg_bound_at = now(), parent_tg_title = $2
          WHERE id = $3 AND deleted_at IS NULL`, [ctx.chat.id, ctx.chat.title || null, groupId],
      );
      return ctx.reply(rowCount ? t.branchBindSuccess : t.branchBindTokenInvalid);
    } catch (err) {
      if (err?.code === '23505') return ctx.reply(t.branchBindAlreadyLinked);
      logger?.error({ err, groupId }, 'Group Telegram bind failed');
      return ctx.reply(t.genericError);
    }
  });

  bot.command('stop', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) {
      await ctx.reply(t.stopMissing);
      return;
    }

    const { rowCount } = await pool.query(
      `DELETE FROM telegram_accounts WHERE tg_chat_id = $1`,
      [chatId],
    );

    await ctx.reply(rowCount > 0 ? t.stopSuccess : t.stopMissing);
  });

  bot.catch((err) => {
    logger?.error({ err }, 'Telegram bot command error');
  });
}

/**
 * Вход. Намеренно НИЧЕГО не создаёт: если чат не привязан — отказ и подсказка.
 * Привязка возможна только из кабинета, где человек уже ввёл логин и пароль;
 * иначе открывший ссылку входа мог бы присвоить себе чужой аккаунт.
 */
async function handleLogin({ ctx, pool, loginNonces, logger, messages: t, payload }) {
  const nonce = payload.slice(LOGIN_PAYLOAD_PREFIX.length);
  const chatId = ctx.chat?.id;
  if (!chatId) {
    await ctx.reply(t.genericError);
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.status
         FROM telegram_accounts ta
         JOIN users u ON u.id = ta.user_id
        WHERE ta.tg_chat_id = $1
          AND u.deleted_at IS NULL`,
      [chatId],
    );

    const user = rows[0];
    if (!user || user.status !== 'active') {
      await ctx.reply(t.loginNotLinked);
      return;
    }

    // false = ключа нет: nonce протух или его никто не выдавал. Молча «успех»
    // показывать нельзя — вкладка всё равно не откроется, человек будет ждать.
    const approved = await loginNonces.approve(nonce, user.id);
    await ctx.reply(approved ? t.loginSuccess : t.loginExpired);
  } catch (err) {
    logger?.error({ err, chatId }, 'Telegram login approve failed');
    await ctx.reply(t.genericError);
  }
}

async function handleBind({ ctx, pool, bindTokens, logger, messages: t, token }) {
  const userId = await bindTokens.consume(token);
  if (!userId) {
    await ctx.reply(t.tokenInvalid);
    return;
  }

  const chatId = ctx.chat?.id;
  if (!chatId) {
    await ctx.reply(t.genericError);
    return;
  }

  try {
    const target = await resolveTelegramRole(pool, userId);
    if (!target) {
      await ctx.reply(t.tokenInvalid);
      return;
    }
    const { role, organizationId } = target;

    // Гонка: токен выпущен, пока фича была включена, но Main Admin выключил
    // её партнёру до того, как студент дописал привязку в боте.
    if (!(await isFeatureEnabledForOrg(organizationId, 'telegram_integration'))) {
      await ctx.reply(t.tokenInvalid);
      return;
    }

    await pool.query(
      `INSERT INTO telegram_accounts (user_id, tg_chat_id, tg_role, tg_username, tg_first_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, chatId, role, ctx.from?.username ?? null, ctx.from?.first_name ?? null],
    );

    await ctx.reply(t.bindSuccess);
  } catch (err) {
    if (err?.code === '23505') {
      await replyDuplicateBinding({ pool, ctx, userId, chatId, messages: t });
      return;
    }

    logger?.error({ err, userId, chatId }, 'Telegram bind failed');
    await ctx.reply(t.genericError);
  }
}

async function resolveTelegramRole(pool, userId) {
  const { rows } = await pool.query(
    `SELECT role, organization_id FROM users WHERE id = $1 AND deleted_at IS NULL AND status = 'active'`,
    [userId],
  );

  const row = rows[0];
  if (!row || (row.role !== 'student' && row.role !== 'parent')) return null;
  return { role: row.role, organizationId: row.organization_id };
}

async function replyDuplicateBinding({ pool, ctx, userId, chatId, messages: t }) {
  const { rows } = await pool.query(
    `SELECT user_id, tg_chat_id
       FROM telegram_accounts
      WHERE user_id = $1 OR tg_chat_id = $2
      LIMIT 1`,
    [userId, chatId],
  );

  const existing = rows[0];
  if (existing?.user_id === userId) {
    await ctx.reply(t.alreadyLinkedUser);
    return;
  }

  await ctx.reply(t.alreadyLinkedChat);
}
