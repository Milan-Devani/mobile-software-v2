import { useCallback, useRef } from 'react';

/**
 * Guards against out-of-order responses.
 *
 * Call `beginRequest()` at the start of each fetch; it returns `isLatest()`, which is true
 * only while no newer request has started. Skip state updates when it returns false, so a
 * slow response for an old search/filter can never overwrite the results of a newer one.
 *
 *   const beginRequest = useLatestRequest();
 *   const load = async () => {
 *     const isLatest = beginRequest();
 *     const res = await api.get(...);
 *     if (!isLatest()) return;
 *     setRows(res.rows);
 *   };
 */
export const useLatestRequest = () => {
  const counterRef = useRef(0);
  return useCallback(() => {
    counterRef.current += 1;
    const id = counterRef.current;
    return () => id === counterRef.current;
  }, []);
};

export default useLatestRequest;
