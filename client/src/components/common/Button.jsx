import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary', // primary, secondary, outline, danger, success, ghost
  size = 'md', // sm, md, lg
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  onClick,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.97]';

  const variantClasses = {
    primary: 'spatial-btn-primary',
    secondary: 'spatial-btn-secondary',
    outline: 'border border-[var(--spatial-border)] text-[var(--spatial-text-title)] bg-[var(--spatial-bg-card-subtle)] hover:bg-[var(--spatial-bg-card-hover)] hover:border-[var(--spatial-border-hover)] shadow-xs',
    danger: 'bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:from-rose-500 hover:to-rose-600 shadow-md shadow-rose-950/20 active:scale-[0.97]',
    success: 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-600 shadow-md shadow-emerald-950/20 active:scale-[0.97]',
    ghost: 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)]',
  };

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
};
