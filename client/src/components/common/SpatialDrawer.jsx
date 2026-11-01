import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const SpatialDrawer = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'w-full md:w-[70vw] md:max-w-[70vw]',
  footer,
  headerAction,
}) => {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer;
    if (isOpen) {
      setMounted(true);
      // Wait for next animation frame so DOM element renders initial translate-x-full
      const raf = requestAnimationFrame(() => {
        timer = setTimeout(() => {
          setActive(true);
        }, 20);
      });
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    } else {
      setActive(false);
      timer = setTimeout(() => {
        setMounted(false);
        document.body.style.overflow = 'unset';
        document.body.classList.remove('modal-open');
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    };
  }, []);

  if (!mounted) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop with smooth fade */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-350 ease-out cursor-pointer ${
          active ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-over Right Sidebar Panel with 70% width and smooth spring animation */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pointer-events-none">
        <div
          className={`${maxWidth} pointer-events-auto transform transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] bg-[var(--spatial-card-bg)] border-l border-[var(--spatial-border)] shadow-2xl flex flex-col h-full ${
            active ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ backdropFilter: 'blur(32px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 p-5 sm:p-6 border-b border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-[var(--spatial-text-title)] tracking-tight truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-1 font-normal truncate">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {headerAction}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)] border border-[var(--spatial-border)] transition-all cursor-pointer active:scale-95"
                aria-label="Close drawer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 min-h-0 overflow-y-auto modal-scrollbar p-5 sm:p-6 space-y-6">
            {children}
          </div>

          {/* Footer (if provided) */}
          {footer && (
            <div className="shrink-0 p-4 sm:p-5 border-t border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
