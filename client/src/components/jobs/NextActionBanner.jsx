import React from 'react';
import {
  Wrench,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ShoppingBag,
  Send,
  Play,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const NextActionBanner = ({
  job,
  onStartDiagnosis,
  onOpenEstimateModal,
  onStartRepair,
  onCompleteRepair,
  onOpenTestingTab,
  onMarkReadyForPickup,
  onOpenPickupModal,
  onOpenPaymentModal,
  onReopenJob,
  onChangeStatus,
  userRole,
}) => {
  if (!job) return null;

  const status = job.status;

  const getActionConfig = () => {
    switch (status) {
      case 'RECEIVED':
        return {
          title: 'Device Intake Complete - Awaiting Diagnosis',
          instruction: 'Technician needs to inspect hardware, test components, and log diagnosis findings.',
          buttonLabel: 'Start Diagnosis',
          icon: Wrench,
          bg: 'bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border-sky-200',
          textColor: 'text-sky-900',
          btnClass: 'bg-sky-600 hover:bg-sky-700 text-white',
          action: onStartDiagnosis,
          canPerform: ['admin', 'technician'].includes(userRole),
        };

      case 'DIAGNOSING':
        return {
          title: 'Diagnosis In Progress',
          instruction: 'Enter discovered root cause, recommended fix, and create parts/labor cost estimate.',
          buttonLabel: 'Prepare Repair Estimate',
          icon: FileText,
          bg: 'bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-200',
          textColor: 'text-indigo-900',
          btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
          action: onOpenEstimateModal,
          canPerform: ['admin', 'technician'].includes(userRole),
        };

      case 'ESTIMATE_SENT':
      case 'AWAITING_APPROVAL':
        return {
          title: 'Estimate Sent - Awaiting Customer Approval',
          instruction: `Estimate ($${Number(job.total_amount).toFixed(2)}) sent to ${job.customer?.full_name || 'Customer'}. Waiting for authorization or manual phone approval.`,
          buttonLabel: 'Review Estimate & Status',
          icon: Clock,
          bg: 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-200',
          textColor: 'text-amber-900',
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
          action: onOpenEstimateModal,
          canPerform: true,
        };

      case 'APPROVED':
        const isWarrantyApproved = job.is_warranty_claim && (job.warranty_same_issue || Number(job.balance_due || 0) === 0);
        return {
          title: isWarrantyApproved ? 'Warranty Claim Authorized (Free Rework)' : 'Estimate Approved by Customer',
          instruction: isWarrantyApproved
            ? 'Covered under warranty. Pre-authorized free rework — no customer approval or payment needed. Move to workbench and begin repair.'
            : 'Customer authorized the repair. Move device to workbench and begin parts replacement.',
          buttonLabel: 'Start Repair (In Progress)',
          icon: Play,
          bg: 'bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-blue-200',
          textColor: 'text-blue-900',
          btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
          action: onStartRepair,
          canPerform: ['admin', 'technician'].includes(userRole),
        };

      case 'IN_PROGRESS':
        return {
          title: 'Repair In Progress on Workbench',
          instruction: 'Component replacement underway. Once physical repairs are assembled, advance to QC testing bench.',
          buttonLabel: 'Complete Repair & Move to Testing',
          icon: Wrench,
          bg: 'bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border-purple-200',
          textColor: 'text-purple-900',
          btnClass: 'bg-purple-600 hover:bg-purple-700 text-white',
          action: onCompleteRepair,
          canPerform: ['admin', 'technician'].includes(userRole),
        };

      case 'TESTING':
        return {
          title: 'Quality Check Inspection Required',
          instruction: 'Execute the 16-point Quality Assurance checklist. All tests must pass before releasing device for pickup.',
          buttonLabel: 'Complete QC Inspection',
          icon: CheckCircle2,
          bg: 'bg-gradient-to-r from-fuchsia-500/10 via-fuchsia-500/5 to-transparent border-fuchsia-200',
          textColor: 'text-fuchsia-900',
          btnClass: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white',
          action: onMarkReadyForPickup,
          canPerform: ['admin', 'technician'].includes(userRole),
        };

      case 'READY_FOR_PICKUP':
        const isFreeWarranty = job.is_warranty_claim && (job.warranty_same_issue || job.warranty_free_rework || Number(job.balance_due || 0) === 0);
        return {
          title: isFreeWarranty
            ? 'Device Ready for Customer Pickup (Warranty Rework Complete)'
            : 'Device Ready for Customer Pickup',
          instruction: isFreeWarranty
            ? 'Customer notified. Quality checks passed. Free rework covered under warranty (No payment required).'
            : `Customer notified. Upon arrival, customer must test device, confirm operation, and settle any balance ($${Number(job.balance_due || 0).toFixed(2)}).`,
          buttonLabel: isFreeWarranty ? 'Process Warranty Handover' : 'Process Customer Pickup',
          icon: ShoppingBag,
          bg: 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200',
          textColor: 'text-emerald-900',
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          action: onOpenPickupModal,
          canPerform: ['admin', 'staff'].includes(userRole),
        };

      case 'DELIVERED':
        return {
          title: job.is_warranty_claim
            ? `Device Delivered (Warranty Claim #${job.reopen_count || 1} Active)`
            : 'Repair Completed & Device Delivered',
          instruction: job.is_warranty_claim
            ? `Device was previously delivered and reopened under warranty (${job.last_warranty_issue || 'Warranty issue'}).`
            : 'Device handed over to customer. Warranty is active. If customer faces any issue during warranty, click below to reopen this job.',
          buttonLabel: 'Reopen Job (Warranty Claim)',
          icon: RotateCcw,
          bg: 'bg-gradient-to-r from-teal-500/10 via-amber-500/5 to-transparent border-teal-200',
          textColor: 'text-teal-900',
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
          action: onReopenJob,
          canPerform: true,
        };

      case 'REJECTED':
        return {
          title: 'Estimate Rejected by Customer',
          instruction: `Customer declined the quote (${job.rejection_reason || 'No reason specified'}). Device prepared for return in original condition.`,
          buttonLabel: 'Process Return Pickup',
          icon: AlertCircle,
          bg: 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-200',
          textColor: 'text-rose-900',
          btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
          action: onOpenPickupModal,
          canPerform: ['admin', 'staff'].includes(userRole),
        };

      case 'CANCELLED':
        return {
          title: 'Job Sheet Cancelled',
          instruction: 'This repair job was cancelled and closed. You can reopen it if service is requested again.',
          buttonLabel: 'Reopen Repair Job',
          icon: RotateCcw,
          bg: 'bg-slate-100 border-slate-300',
          textColor: 'text-slate-800',
          btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm',
          action: onReopenJob,
          canPerform: true,
        };

      default:
        return null;
    }
  };

  const config = getActionConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`p-4 sm:p-5 rounded-xl border ${config.bg} shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all`}>
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-lg bg-white shadow-sm border border-slate-200/60 text-primary-600 shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">CURRENT STATUS:</span>
            <Badge status={status} size="sm" />
            {['admin', 'staff'].includes(userRole) && onChangeStatus && (
              <button
                type="button"
                onClick={onChangeStatus}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-950/60 transition-colors shadow-2xs"
                title="Shop Owner: Change Job Status"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Change Status</span>
              </button>
            )}
          </div>
          <h4 className={`text-base font-bold ${config.textColor} tracking-tight`}>{config.title}</h4>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">{config.instruction}</p>
        </div>
      </div>

      {config.buttonLabel && config.action && (
        <div className="shrink-0 w-full md:w-auto">
          <button
            onClick={config.action}
            disabled={!config.canPerform}
            className={`w-full md:w-auto px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${config.btnClass} ${
              !config.canPerform ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span>NEXT ACTION: {config.buttonLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
};
