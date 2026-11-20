import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Server-side pagination helper for tables.
 *
 * @param {(paging: { limit: number, offset: number }) => Promise<{ rows: any[], total: number, extra?: any }>} fetchPage
 *        Loads ONE page from the backend. Must return the rows for that page and the
 *        total number of matching rows (all pages).
 * @param {any[]} filterDeps  Values that define the query (filters, search, ids).
 *        When any of them change, the table jumps back to page 1.
 * @param {{ initialPageSize?: number, enabled?: boolean }} [options]
 *
 * Handles: page / page-size state, reset to page 1 on filter change, ignoring
 * out-of-order (stale) responses, and stepping back when a page becomes empty
 * (e.g. after deleting the last row on the last page).
 */
export function usePagedQuery(fetchPage, filterDeps = [], { initialPageSize = 10, enabled = true } = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [extra, setExtra] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const requestIdRef = useRef(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  // Filters changed → back to page 1. Handled inside the fetch effect so a filter change
  // on page N doesn't first fire a wasted request for page N with the new filters.
  const filterKey = JSON.stringify(filterDeps);
  const lastFilterKeyRef = useRef(filterKey);

  useEffect(() => {
    if (lastFilterKeyRef.current !== filterKey) {
      lastFilterKeyRef.current = filterKey;
      if (page !== 1) {
        requestIdRef.current += 1; // drop any in-flight response for the old filters
        setPage(1); // re-runs this effect with page 1
        return;
      }
    }
    if (!enabled) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    Promise.resolve(fetchRef.current({ limit: pageSize, offset: (page - 1) * pageSize }))
      .then((res) => {
        if (requestId !== requestIdRef.current) return;
        const nextRows = res?.rows || [];
        const nextTotal = res?.total ?? nextRows.length;
        if (nextRows.length === 0 && page > 1 && nextTotal > 0) {
          setPage(Math.max(1, Math.ceil(nextTotal / pageSize)));
          return;
        }
        setRows(nextRows);
        setTotal(nextTotal);
        setExtra(res?.extra ?? null);
      })
      .catch((err) => {
        if (requestId === requestIdRef.current) console.error('Failed to load table page:', err);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  }, [enabled, page, pageSize, filterKey, reloadKey]);

  /** Re-fetch the current page (e.g. after a create/update/delete). */
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const changePageSize = useCallback((size) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return { rows, total, extra, page, setPage, pageSize, setPageSize: changePageSize, loading, reload };
}

export default usePagedQuery;
