import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl',
  footer,
  bodyClassName = 'py-3.5 px-3 sm:py-4 sm:px-4',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        {/* Spatial Backdrop */}
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-200"
          onClick={onClose}
        />

        {/* Spatial Dialog Panel */}
        <div
          className={`w-full ${maxWidth} max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] flex flex-col transform overflow-hidden rounded-2xl spatial-modal-panel p-5 sm:p-6 text-left align-middle transition-all z-10 relative shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 flex items-start justify-between pb-3 sm:pb-4 border-b border-[var(--spatial-border)]">
            <div>
              <h3 className="text-lg font-bold text-[var(--spatial-text-title)] tracking-tight">{title}</h3>
              {subtitle && <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-lg p-1.5 hover:bg-[var(--spatial-bg-card-subtle)] transition-colors active:scale-95 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={`flex-1 min-h-0 overflow-y-auto modal-scrollbar ${bodyClassName}`}>
            {children}
          </div>

          {footer && (
            <div className="shrink-0 pt-3 sm:pt-4 border-t border-[var(--spatial-border)] flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
