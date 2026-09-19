import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { recordError } from '../shared/errorTracker.js';

/**
 * Централизованный обработчик — монтируется в app.js ПОСЛЕДНИМ.
 *
 * Правило одно: наружу уходит только то, что мы сами решили показать.
 * Всё остальное отправляется в лог, а клиент получает номер, по которому эту
 * запись в логе можно найти.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Managed PostgreSQL/Redis occasionally close an idle connection or hit a
  // provider quota. This is an infrastructure outage, not an application bug:
  // expose it as retryable 503 instead of the misleading HTTP 500.
  const infraCodes = new Set([
    'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND',
    '57P01', '57P02', '57P03', '08000', '08001', '08003', '08004', '08006', '08007', '08P01',
  ]);
  const infraMessage = String(err?.message ?? '').toLowerCase();
  const isInfrastructureError = infraCodes.has(err?.code)
    || infraMessage.includes('connection terminated')
    || infraMessage.includes('connection timeout')
    || infraMessage.includes('command timed out')
    || infraMessage.includes("stream isn't writeable")
    || infraMessage.includes('max requests limit exceeded');
  const status = isInfrastructureError ? 503 : (err.statusCode ?? err.status ?? 500);
  // Клиентская ошибка = наш AppError ИЛИ безопасно-раскрываемая 4xx
  // (body-parser при кривом/пустом JSON бросает 400 с expose:true).
  const isClientError = Boolean(err.isOperational) || (status < 500 && err.expose === true);

  // pino-http кладёт сюда идентификатор запроса. Он же уходит клиенту при 5xx,
  // чтобы жалобу «у меня ошибка» можно было связать с конкретной записью лога.
  const errorId = req?.id ?? null;

  // логируем как unhandled только реальные серверные (5xx)
  if (status >= 500) {
    logger.error({ err, errorId }, 'Unhandled error');
    // не await — запись в трекер не должна задерживать ответ клиенту
    void recordError(isInfrastructureError ? 'infra' : 'http', err, {
      route: req?.originalUrl,
      statusCode: status,
    });
  }

  res.status(status).json({
    success: false,
    message: isInfrastructureError
      ? 'Service temporarily unavailable. Please try again.'
      : (isClientError ? err.message : 'Internal server error'),

    /* details — только для клиентских ошибок.
       Раньше поле уходило при ЛЮБОМ статусе. У 4xx это разбор полей формы,
       который мы и хотим показать. У 5xx туда попадает всё, что положил в
       ошибку нижний слой, — вплоть до фрагментов SQL и имён колонок; наружу
       такое отдавать нельзя, а в логе оно и так есть. */
    ...(isClientError && err.details && { details: err.details }),

    /* Стек — только в разработке. Сравнение именно с 'development', а не
       «всё, что не production»: дефолт NODE_ENV в config/env.js —
       'development', и при обратном условии окружение с забытой переменной
       на новом хостинге молча начало бы отдавать стек наружу.
       В render.yaml NODE_ENV=production проставлен. */
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),

    // Сам по себе номер ничего не раскрывает, но по нему находится лог.
    ...(status >= 500 && errorId && { errorId }),
  });
}
