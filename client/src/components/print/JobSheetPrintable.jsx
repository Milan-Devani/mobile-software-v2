import React from 'react';
import { Smartphone, CheckSquare, Square, Printer } from 'lucide-react';
import { Button } from '../common/Button';

export const JobSheetPrintable = ({ job, shop }) => {
  if (!job) return null;

  const handlePrint = () => {
    window.print();
  };

  const cond = job.device_condition || {};
  const accessories = job.accessories_received || [];

  return (
    <div className="bg-white p-6 sm:p-8 max-w-4xl mx-auto text-slate-800 print:p-0 print:max-w-full">
      {/* Print action toolbar (hidden on print) */}
      <div className="no-print flex items-center justify-between pb-6 mb-6 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Repair Job Sheet Preview</h2>
          <p className="text-xs text-slate-500">Official customer intake document & service agreement</p>
        </div>
        <Button icon={Printer} onClick={handlePrint}>
          Print Job Sheet
        </Button>
      </div>

      {/* Main Printable Document */}
      <div className="border border-slate-300 rounded-xl p-6 print:border-none print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b border-slate-300">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-xl">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{shop?.name || 'TechFix Pro Repairs'}</h1>
              <p className="text-xs text-slate-500">{shop?.tagline || 'Professional Smartphone & Tablet Repair Services'}</p>
              <p className="text-xs text-slate-600 mt-1">{shop?.address} • {shop?.phone} • {shop?.email}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-100 rounded text-xs font-mono font-bold tracking-wider text-slate-700">
              JOB SHEET
            </span>
            <p className="text-base font-bold font-mono text-primary-700 mt-1">{job.job_number}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Intake Date: {new Date(job.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* 2-Column: Customer & Device */}
        <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200 text-xs">
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px] text-primary-700">Customer Information</h4>
            <div className="space-y-1">
              <p><span className="text-slate-500">Name:</span> <strong className="text-slate-900">{job.customer?.full_name}</strong></p>
              <p><span className="text-slate-500">Phone:</span> {job.customer?.phone}</p>
              <p><span className="text-slate-500">WhatsApp:</span> {job.customer?.whatsapp_number || job.customer?.phone}</p>
              {job.customer?.email && <p><span className="text-slate-500">Email:</span> {job.customer?.email}</p>}
              {job.customer?.address && <p><span className="text-slate-500">Address:</span> {job.customer?.address}</p>}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px] text-primary-700">Device Specifications</h4>
            <div className="space-y-1">
              <p><span className="text-slate-500">Device:</span> <strong className="text-slate-900">{job.device?.brand} {job.device?.model}</strong></p>
              <p><span className="text-slate-500">Color / Storage:</span> {job.device?.color || 'N/A'} {job.device?.storage_capacity ? `• ${job.device.storage_capacity}` : ''}</p>
              <p><span className="text-slate-500">IMEI:</span> <span className="font-mono">{job.device?.imei || 'Not provided'}</span></p>
              <p><span className="text-slate-500">Passcode / PIN:</span> <span className="font-mono">{job.device?.passcode || 'None'}</span></p>
              <p><span className="text-slate-500">Operating System:</span> {job.device?.operating_system || 'iOS/Android'}</p>
            </div>
          </div>
        </div>

        {/* Reported Complaint */}
        <div className="py-4 border-b border-slate-200 text-xs">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-1.5 text-[11px] text-primary-700">Customer Reported Complaint</h4>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 italic text-slate-700">
            "{job.customer_complaint}"
          </div>
        </div>

        {/* Intake Condition & Accessories */}
        <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200 text-xs">
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px] text-primary-700">Physical Condition at Intake</h4>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <p>Screen: <strong>{cond.screen || 'Intact'}</strong></p>
              <p>Body / Frame: <strong>{cond.body || 'Good'}</strong></p>
              <p>Scratches: <strong>{cond.scratches || 'Minor'}</strong></p>
              <p>Cracks: <strong>{cond.cracks || 'None'}</strong></p>
              <p>Water Damage: <strong>{cond.water_damage ? 'YES' : 'NO'}</strong></p>
              <p>Charging Port: <strong>{cond.charging_port || 'Normal'}</strong></p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px] text-primary-700">Accessories Received</h4>
            <div className="flex flex-wrap gap-2">
              {accessories.length > 0 ? (
                accessories.map((acc, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-medium text-slate-700">
                    ✓ {acc}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic text-[11px]">Device only (no accessories)</span>
              )}
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="py-4 border-b border-slate-200 text-xs flex justify-between items-center">
          <div>
            <p className="text-slate-500">Estimated Total:</p>
            <p className="text-lg font-bold text-slate-900">${Number(job.total_amount).toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500">Warranty Coverage:</p>
            <p className="text-sm font-bold text-emerald-700">{job.warranty_days || 90} Days Limited Warranty</p>
          </div>
        </div>

        {/* Terms and Customer Signature */}
        <div className="pt-4 text-[10px] text-slate-500 leading-relaxed">
          <p className="font-semibold text-slate-700 mb-1">Terms & Conditions:</p>
          <p>{shop?.terms_conditions || 'Devices left unclaimed for more than 45 days after Ready for Pickup notification may be disposed of according to state regulations. Liquid damaged repairs carry no warranty.'}</p>

          <div className="grid grid-cols-2 gap-8 pt-8 mt-4 border-t border-slate-200">
            <div>
              <div className="border-b border-slate-400 h-8 mb-1" />
              <p className="font-medium text-slate-700">Customer Signature & Acceptance</p>
            </div>
            <div>
              <div className="border-b border-slate-400 h-8 mb-1" />
              <p className="font-medium text-slate-700">Authorized Technician / Staff</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
