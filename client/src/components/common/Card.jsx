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
            {title && <h3 className="font-semibold text-[var(--spatial-text-title)] text-[15px] tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5 font-normal">{subtitle}</p>}
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
  const sizeClass = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-9 h-9' : 'w-6 h-6';
  const heightClass = fullPage ? 'min-h-[60vh]' : minHeight;

  return (
    <div
      className={`flex flex-col items-center justify-center flex-1 w-full ${heightClass} py-12 px-4 gap-3 text-center ${className}`}
    >
      <Loader2 className={`${sizeClass} text-[#0071e3] dark:text-[#0a84ff] animate-spin stroke-[2]`} />
      {label && <p className="text-xs font-medium text-[var(--spatial-text-muted)] tracking-tight">{label}</p>}
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
        <div className="w-12 h-12 rounded-2xl bg-[var(--spatial-bg-card-subtle)] text-[#0071e3] dark:text-[#0a84ff] flex items-center justify-center mx-auto mb-3 border border-[var(--spatial-border)] shadow-xs">
          <Icon className="w-6 h-6 stroke-[1.8]" />
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-[var(--spatial-text-title)] tracking-tight">{title}</h3>
      {description && <p className="text-xs text-[var(--spatial-text-muted)] max-w-sm mx-auto mt-1 mb-4 leading-relaxed">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="spatial-btn-primary inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl shadow-xs active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export {
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  StatsSkeleton,
  DetailSkeleton,
  FormSkeleton,
} from './Skeleton';

