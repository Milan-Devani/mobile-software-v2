import React from 'react';

const STATUS_CONFIGS = {
  // Job Statuses
  RECEIVED: {
    label: 'Received',
    bg: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60',
    dot: 'bg-sky-500'
  },
  DIAGNOSING: {
    label: 'Diagnosing',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60',
    dot: 'bg-indigo-500'
  },
  ESTIMATE_SENT: {
    label: 'Estimate Sent',
    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
    dot: 'bg-amber-500'
  },
  AWAITING_APPROVAL: {
    label: 'Awaiting Approval',
    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
    dot: 'bg-amber-500'
  },
  APPROVED: {
    label: 'Approved',
    bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60',
    dot: 'bg-blue-500'
  },
  REJECTED: {
    label: 'Estimate Rejected',
    bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60',
    dot: 'bg-rose-500'
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60',
    dot: 'bg-purple-500'
  },
  TESTING: {
    label: 'QC Testing',
    bg: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 dark:border-fuchsia-800/60',
    dot: 'bg-fuchsia-500'
  },
  READY_FOR_PICKUP: {
    label: 'Ready for Pickup',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
    dot: 'bg-emerald-500'
  },
  DELIVERED: {
    label: 'Delivered',
    bg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60',
    dot: 'bg-teal-500'
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    dot: 'bg-slate-400'
  },

  // Payment Statuses
  PAID: {
    label: 'Fully Paid',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
    dot: 'bg-emerald-500'
  },
  PARTIAL: {
    label: 'Partially Paid',
    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
    dot: 'bg-amber-500'
  },
  UNPAID: {
    label: 'Unpaid',
    bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60',
    dot: 'bg-rose-500'
  },

  // Test QC Results
  PASS: {
    label: 'PASS',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
    dot: 'bg-emerald-500'
  },
  FAIL: {
    label: 'FAIL',
    bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60',
    dot: 'bg-rose-500'
  },
  NOT_TESTED: {
    label: 'Not Tested',
    bg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    dot: 'bg-slate-400'
  },

  // Stock Statuses
  ACTIVE: {
    label: 'In Stock',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
    dot: 'bg-emerald-500'
  },
  LOW_STOCK: {
    label: 'Low Stock',
    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
    dot: 'bg-amber-500'
  },
  OUT_OF_STOCK: {
    label: 'Out of Stock',
    bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60',
    dot: 'bg-rose-500'
  },

  // Roles
  admin: {
    label: 'Shop Owner / Admin',
    bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60',
    dot: 'bg-purple-500'
  },
  technician: {
    label: 'Technician',
    bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60',
    dot: 'bg-blue-500'
  },
  staff: {
    label: 'Front Desk Staff',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
    dot: 'bg-emerald-500'
  },
};

export const Badge = ({ status, customLabel, size = 'md' }) => {
  const config = STATUS_CONFIGS[status] || {
    label: status || 'Unknown',
    bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400'
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border shadow-2xs backdrop-blur-xs transition-colors ${config.bg} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-shadow ${config.dot}`} />
      <span>{customLabel || config.label}</span>
    </span>
  );
};
