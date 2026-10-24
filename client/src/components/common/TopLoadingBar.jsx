import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Apple-style slim top navigation progress bar.
 * Appears seamlessly during route transitions to eliminate abrupt blinks and jerks.
 */
export const TopLoadingBar = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // On route change, start smooth progress animation
    setVisible(true);
    setProgress(30);

    const step1 = setTimeout(() => {
      setProgress(75);
    }, 80);

    const step2 = setTimeout(() => {
      setProgress(100);
    }, 180);

    const step3 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 360);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
    };
  }, [location.pathname, location.search]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[2.5px] bg-transparent overflow-hidden print:hidden"
    >
      <div
        className="h-full bg-gradient-to-r from-[#0071e3] via-[#0a84ff] to-[#5ac8fa] shadow-[0_0_8px_rgba(10,132,255,0.8)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? '140ms' : '180ms',
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
};

export default TopLoadingBar;
