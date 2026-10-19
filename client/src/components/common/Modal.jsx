import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl',
  footer,
  bodyClassName = 'py-4 max-h-[75vh] overflow-y-auto pr-1',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        {/* Spatial Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-200"
          onClick={onClose}
        />

        {/* Spatial Dialog Panel */}
        <div
          className={`w-full ${maxWidth} transform overflow-hidden rounded-2xl spatial-modal-panel p-6 text-left align-middle transition-all z-10 relative`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between pb-4 border-b border-[var(--spatial-border)]">
            <div>
              <h3 className="text-lg font-bold text-[var(--spatial-text-title)] tracking-tight">{title}</h3>
              {subtitle && <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-lg p-1.5 hover:bg-[var(--spatial-bg-card-subtle)] transition-colors active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={bodyClassName}>
            {children}
          </div>

          {footer && (
            <div className="pt-4 border-t border-[var(--spatial-border)] flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
