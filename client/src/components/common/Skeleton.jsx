import React from 'react';

/**
 * Atomic Skeleton element with Apple Spatial shimmer animation
 */
export const Skeleton = ({
  className = '',
  rounded = 'rounded-xl',
  height,
  width,
  style,
  ...props
}) => {
  const customStyle = {
    ...(height ? { height } : {}),
    ...(width ? { width } : {}),
    ...style,
  };

  return (
    <div
      className={`spatial-skeleton ${rounded} ${className}`}
      style={customStyle}
      aria-hidden="true"
      {...props}
    />
  );
};

/**
 * Skeleton for data tables (JobList, PartsList, CustomerList, PaymentsList, SalesList, etc.)
 */
export const TableSkeleton = ({
  rows = 6,
  columns = 6,
  showHeader = true,
  showPagination = true,
  className = '',
}) => {
  // Realistic varying widths for columns to look like real data
  const colWidths = [
    ['w-20', 'w-32', 'w-24', 'w-16', 'w-28', 'w-16'],
    ['w-24', 'w-36', 'w-20', 'w-20', 'w-24', 'w-16'],
    ['w-16', 'w-28', 'w-24', 'w-16', 'w-32', 'w-16'],
    ['w-28', 'w-40', 'w-16', 'w-24', 'w-20', 'w-16'],
    ['w-20', 'w-32', 'w-28', 'w-20', 'w-28', 'w-16'],
    ['w-24', 'w-36', 'w-20', 'w-16', 'w-24', 'w-16'],
    ['w-16', 'w-28', 'w-24', 'w-20', 'w-32', 'w-16'],
    ['w-28', 'w-40', 'w-16', 'w-16', 'w-20', 'w-16'],
  ];

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Table Header Filter / Search bar skeleton */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] rounded-2xl shadow-[var(--spatial-shadow)]">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Skeleton className="h-9 w-full" rounded="rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 sm:w-28" rounded="rounded-xl" />
            <Skeleton className="h-9 w-24 sm:w-28" rounded="rounded-xl" />
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] rounded-2xl overflow-hidden shadow-[var(--spatial-shadow)]">
        {/* Table Header Row */}
        <div className="bg-[var(--spatial-table-header-bg)] border-b border-[var(--spatial-border)] px-5 py-3.5 flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-6 shrink-0" rounded="rounded-md" />
          {Array.from({ length: columns - 1 }).map((_, cIdx) => (
            <Skeleton
              key={cIdx}
              className={`h-3.5 ${cIdx === 0 ? 'w-28' : cIdx === 1 ? 'w-36' : 'w-20'} hidden sm:block`}
              rounded="rounded-md"
            />
          ))}
          <Skeleton className="h-3.5 w-16 ml-auto" rounded="rounded-md" />
        </div>

        {/* Table Body Rows */}
        <div className="divide-y divide-[var(--spatial-border)]">
          {Array.from({ length: rows }).map((_, rIdx) => {
            const widths = colWidths[rIdx % colWidths.length];
            return (
              <div
                key={rIdx}
                className="px-5 py-4 flex items-center justify-between gap-4 transition-colors"
              >
                {/* Checkbox / ID cell */}
                <div className="flex items-center gap-3 shrink-0">
                  <Skeleton className="h-4 w-4" rounded="rounded-md" />
                  <Skeleton className={`h-4 ${widths[0]}`} />
                </div>

                {/* Primary info cell */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <Skeleton className={`h-3.5 ${widths[1]}`} />
                    <Skeleton className="h-2.5 w-24 opacity-75" />
                  </div>
                </div>

                {/* Other columns */}
                {Array.from({ length: Math.max(0, columns - 3) }).map((_, cIdx) => (
                  <div key={cIdx} className="hidden md:block shrink-0">
                    <Skeleton className={`h-3.5 ${widths[(cIdx + 2) % widths.length]}`} />
                  </div>
                ))}

                {/* Status Badge / Action Cell */}
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <Skeleton className="h-6 w-20" rounded="rounded-full" />
                  <Skeleton className="h-7 w-7" rounded="rounded-lg" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Bar Skeleton */}
        {showPagination && (
          <div className="px-5 py-3.5 border-t border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] flex items-center justify-between flex-wrap gap-3">
            <Skeleton className="h-4 w-40" />
            <div className="flex items-center gap-1.5 ml-auto">
              <Skeleton className="h-8 w-8" rounded="rounded-xl" />
              <Skeleton className="h-8 w-8" rounded="rounded-xl" />
              <Skeleton className="h-8 w-8" rounded="rounded-xl" />
              <Skeleton className="h-8 w-8" rounded="rounded-xl" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Skeleton for Metric / KPI Stat cards (Dashboard, VendorDashboard, Sales)
 */
export const StatsSkeleton = ({ count = 4, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4 sm:gap-5 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-[var(--spatial-shadow)] min-h-[120px]"
        >
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-8 w-8" rounded="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-40 opacity-70" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Generic Card skeleton with title, header actions, and body rows
 */
export const CardSkeleton = ({ rows = 4, title = true, className = '' }) => {
  return (
    <div className={`bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] rounded-2xl overflow-hidden shadow-[var(--spatial-shadow)] ${className}`}>
      {title && (
        <div className="px-5 py-4 border-b border-[var(--spatial-border)] flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-52 opacity-70" />
          </div>
          <Skeleton className="h-7 w-20" rounded="rounded-lg" />
        </div>
      )}
      <div className="p-5 space-y-4">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <Skeleton className={`h-4 ${idx % 2 === 0 ? 'w-full' : 'w-4/5'}`} />
            {idx % 2 === 0 && <Skeleton className="h-3 w-2/3 opacity-70" />}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton for Detail pages (JobDetail, CustomerDetail, VendorDetail)
 */
export const DetailSkeleton = ({ className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Bar with back button and action triggers */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24" rounded="rounded-xl" />
          <Skeleton className="h-6 w-32" rounded="rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" rounded="rounded-xl" />
          <Skeleton className="h-9 w-32" rounded="rounded-xl" />
        </div>
      </div>

      {/* Hero Summary Card */}
      <div className="bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] rounded-2xl p-5 sm:p-6 shadow-[var(--spatial-shadow)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24" rounded="rounded-full" />
            <Skeleton className="h-8 w-32" rounded="rounded-xl" />
          </div>
        </div>
      </div>

      {/* Tabs navigation skeleton */}
      <div className="flex items-center gap-2 border-b border-[var(--spatial-border)] pb-2 overflow-x-auto">
        <Skeleton className="h-9 w-28 shrink-0" rounded="rounded-xl" />
        <Skeleton className="h-9 w-32 shrink-0" rounded="rounded-xl" />
        <Skeleton className="h-9 w-28 shrink-0" rounded="rounded-xl" />
        <Skeleton className="h-9 w-36 shrink-0" rounded="rounded-xl" />
        <Skeleton className="h-9 w-24 shrink-0" rounded="rounded-xl" />
      </div>

      {/* Content Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={3} />
        </div>
        <div className="space-y-6">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={2} />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton for form wizards and intake layouts (JobCreate, SalesInvoiceCreate, Settings)
 */
export const FormSkeleton = ({ fields = 6, className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72 opacity-70" />
        </div>
        <Skeleton className="h-9 w-28" rounded="rounded-xl" />
      </div>

      {/* Form Section Box */}
      <div className="bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] rounded-2xl p-5 sm:p-6 space-y-6 shadow-[var(--spatial-shadow)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: fields }).map((_, idx) => (
            <div key={idx} className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-10 w-full" rounded="rounded-xl" />
            </div>
          ))}
        </div>

        {/* Longer text area */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-24 w-full" rounded="rounded-xl" />
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--spatial-border)]">
          <Skeleton className="h-9 w-24" rounded="rounded-xl" />
          <Skeleton className="h-9 w-36" rounded="rounded-xl" />
        </div>
      </div>
    </div>
  );
};
