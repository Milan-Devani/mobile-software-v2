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
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-140 ease-out focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 dark:focus:ring-[#0a84ff]/40 disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer';

  const variantClasses = {
    primary: 'spatial-btn-primary',
    secondary: 'spatial-btn-secondary',
    outline: 'border border-[var(--spatial-border)] text-[var(--spatial-text-title)] bg-[var(--spatial-bg-card-subtle)] hover:bg-[var(--spatial-bg-card-hover)] hover:border-[var(--spatial-border-hover)] shadow-2xs',
    danger: 'bg-[#ff3b30] hover:bg-[#e03126] text-white shadow-xs dark:bg-[#ff453a] dark:hover:bg-[#ff5b52] active:scale-[0.98]',
    success: 'bg-[#34c759] hover:bg-[#2db84f] text-white shadow-xs dark:bg-[#30d158] dark:hover:bg-[#43d968] active:scale-[0.98]',
    ghost: 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)]',
  };

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-xs sm:text-[13px] px-3.5 py-2 gap-2',
    lg: 'text-sm sm:text-base px-4 py-2.5 gap-2.5',
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
