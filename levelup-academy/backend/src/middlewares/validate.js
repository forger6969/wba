import { AppError } from '../utils/AppError.js';

/**
 * Zod-валидация на границе системы.
 *   router.post('/', validate({ body: createGroupSchema }), ctrl.create)
 *
 * schemas: { body?, params?, query? } — каждая часть парсится и ЗАМЕНЯЕТСЯ
 * результатом парсинга (coerce/defaults применяются).
 */
export function validate(schemas) {
  return (req, _res, next) => {
    for (const part of ['body', 'params', 'query']) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        return next(
          new AppError(422, 'Validation failed', result.error.flatten().fieldErrors),
        );
      }
      req[part] = result.data;
    }
    next();
  };
}
