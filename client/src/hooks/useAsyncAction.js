import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook to safely manage asynchronous actions and guard against duplicate clicks / submissions.
 * 
 * @param {Function} asyncFn The async function to execute.
 * @param {Object} options Optional config: onSuccess, onError, cooldownMs
 * @returns {Object} { execute, loading, isRunning }
 */
export const useAsyncAction = (asyncFn, options = {}) => {
  const [loading, setLoading] = useState(false);
  const isRunningRef = useRef(false);
  const cooldownMs = options.cooldownMs || 250;

  const execute = useCallback(
    async (...args) => {
      // Synchronous double-click guard
      if (isRunningRef.current) {
        return;
      }

      isRunningRef.current = true;
      setLoading(true);

      try {
        const result = await asyncFn(...args);
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        return result;
      } catch (err) {
        if (options.onError) {
          options.onError(err);
        }
        throw err;
      } finally {
        setTimeout(() => {
          isRunningRef.current = false;
          setLoading(false);
        }, cooldownMs);
      }
    },
    [asyncFn, options, cooldownMs]
  );

  return {
    execute,
    loading,
    isRunning: isRunningRef.current,
  };
};

export default useAsyncAction;
