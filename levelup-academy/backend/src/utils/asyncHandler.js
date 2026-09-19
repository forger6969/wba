/** Обёртка контроллеров: любой reject уходит в errorHandler через next(). */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
