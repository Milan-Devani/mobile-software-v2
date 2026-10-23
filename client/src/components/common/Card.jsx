import React from 'react';
import { Loader2 } from 'lucide-react';

export const Card = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  bodyClassName = 'p-5',
  headerClassName = 'px-5 py-4 border-b border-[var(--spatial-border)]',
  hover = false,
  overflow = 'visible',
  ...props
}) => {
  const isHidden = overflow === 'hidden' || className.includes('overflow-hidden');

  return (
    <div
      className={`spatial-card ${hover ? 'spatial-card-hover' : ''} ${
        isHidden ? 'overflow-hidden' : 'overflow-visible'
      } ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className={`flex items-center justify-between rounded-t-2xl ${headerClassName}`}>
          <div>
            {title && <h3 className="font-bold text-[var(--spatial-text-title)] text-base tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
};

export const LoadingSpinner = ({
  label = 'Loading...',
  size = 'md',
  fullPage = false,
  className = '',
  minHeight = 'min-h-[280px]',
}) => {
  const sizeClass = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';
  const heightClass = fullPage ? 'min-h-[60vh]' : minHeight;

  return (
    <div
      className={`flex flex-col items-center justify-center flex-1 w-full ${heightClass} py-12 px-4 gap-3 text-center ${className}`}
    >
      <Loader2 className={`${sizeClass} text-sky-400 animate-spin`} />
      {label && <p className="text-xs font-medium text-[var(--spatial-text-muted)]">{label}</p>}
    </div>
  );
};

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`spatial-card border-dashed border-[var(--spatial-border)] text-center py-12 px-4 ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--spatial-bg-card-subtle)] text-sky-400 flex items-center justify-center mx-auto mb-3 border border-[var(--spatial-border)] shadow-sm">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-bold text-[var(--spatial-text-title)]">{title}</h3>
      {description && <p className="text-xs text-[var(--spatial-text-muted)] max-w-sm mx-auto mt-1 mb-4">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="spatial-btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
