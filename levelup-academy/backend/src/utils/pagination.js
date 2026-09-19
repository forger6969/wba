const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** ?page=2&limit=50 → { page, limit, offset } с защитой от мусора и перегруза. */
export function parsePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query.limit, 10) || DEFAULT_LIMIT));
  return { page, limit, offset: (page - 1) * limit };
}

export function buildPageMeta(total, page, limit) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}
