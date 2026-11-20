/**
 * Opt-in pagination helpers.
 * Endpoints only paginate when the client sends ?limit=…, so every existing caller
 * that expects the full list (exports, dropdowns, scripts) keeps working unchanged.
 */
export const MAX_PAGE_SIZE = 500;

/** Returns { limit, offset } when ?limit is present and valid, otherwise null (no pagination). */
export const readPagination = (query = {}) => {
  if (query.limit === undefined || query.limit === null || query.limit === '') return null;
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 0, 1), MAX_PAGE_SIZE);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
};

/** Slices an already-filtered array when pagination is requested. */
export const paginateArray = (items = [], pagination) => {
  if (!pagination) return items;
  return items.slice(pagination.offset, pagination.offset + pagination.limit);
};
