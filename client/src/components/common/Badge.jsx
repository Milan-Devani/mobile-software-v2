import React from 'react';

const STATUS_CONFIGS = {
  // Job Statuses
  RECEIVED: { label: 'Received', bg: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  DIAGNOSING: { label: 'Diagnosing', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  ESTIMATE_SENT: { label: 'Estimate Sent', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  AWAITING_APPROVAL: { label: 'Awaiting Approval', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  APPROVED: { label: 'Approved', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  REJECTED: { label: 'Estimate Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  TESTING: { label: 'QC Testing', bg: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', dot: 'bg-fuchsia-500' },
  READY_FOR_PICKUP: { label: 'Ready for Pickup', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  DELIVERED: { label: 'Delivered', bg: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100 text-slate-600 border-slate-300', dot: 'bg-slate-400' },

  // Payment Statuses
  PAID: { label: 'Fully Paid', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  PARTIAL: { label: 'Partially Paid', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  UNPAID: { label: 'Unpaid', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },

  // Test QC Results
  PASS: { label: 'PASS', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  FAIL: { label: 'FAIL', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  NOT_TESTED: { label: 'Not Tested', bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },

  // Stock Statuses
  ACTIVE: { label: 'In Stock', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  LOW_STOCK: { label: 'Low Stock', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  OUT_OF_STOCK: { label: 'Out of Stock', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },

  // Roles
  admin: { label: 'Shop Owner / Admin', bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  technician: { label: 'Technician', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  staff: { label: 'Front Desk Staff', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

export const Badge = ({ status, customLabel, size = 'md' }) => {
  const config = STATUS_CONFIGS[status] || {
    label: status || 'Unknown',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400'
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{customLabel || config.label}</span>
    </span>
  );
};
