import React, { useRef, useState } from 'react';
import {
  Printer,
  Share2,
  Copy,
  Check,
  Building2,
  Phone,
  Calendar,
  Smartphone,
  ShieldCheck,
  Receipt,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatIndianCurrency, formatInvoiceDate } from '../../utils/billFormatters';

// Simple Barcode SVG
const SimpleBarcode = ({ value = 'VND-0001' }) => {
  return (
    <div className="flex flex-col items-center select-none">
      <div className="flex items-center gap-[1.5px] h-7">
        {value.split('').map((char, idx) => {
          const isThick = (char.charCodeAt(0) + idx) % 2 === 0;
          return (
            <span
              key={idx}
              className={`h-full bg-slate-900 inline-block ${isThick ? 'w-[2.5px]' : 'w-[1px]'}`}
            />
          );
        })}
      </div>
      <span className="font-mono text-[9px] tracking-widest text-slate-600 uppercase mt-0.5">
        *{value}*
      </span>
    </div>
  );
};

export const VendorReceiptPrintable = ({
  transaction,
  shop,
  onClose,
  isPreview = false,
}) => {
  const [copied, setCopied] = useState(false);
  const printAreaRef = useRef(null);

  if (!transaction) return null;

  const vendor = transaction.vendor || {};
  const mobiles = transaction.mobiles || [];
  const txnType = transaction.txn_type || 'SEND_TO_VENDOR';

  const isSend = txnType === 'SEND_TO_VENDOR';
  const isReceive = txnType === 'RECEIVE_FROM_VENDOR';
  const isJobInward = txnType === 'VENDOR_JOB_INWARD';
  const isJobReturn = txnType === 'VENDOR_JOB_RETURN';

  let titleBadge = 'DISPATCH CHALAN (SEND TO VENDOR)';
  if (isReceive) titleBadge = 'RECEIVE ACKNOWLEDGEMENT (RETURN FROM VENDOR)';
  else if (isJobInward) titleBadge = 'B2B INWARD JOB SHEET (FROM VENDOR)';
  else if (isJobReturn) titleBadge = 'B2B RETURN DELIVERY (TO VENDOR)';

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const itemsText = mobiles
      .map(
        (m, idx) =>
          `${idx + 1}. ${m.brand} ${m.model} [IMEI: ${m.imei || 'N/A'}] - ${m.repair_problem} (Est/Cost: ₹${
            m.actual_cost || m.estimated_cost || 0
          })`
      )
      .join('\n');

    const summary =
      `*${shop?.name || 'Mobotech mobile care'}*\n` +
      `*Vendor Transaction Receipt: ${transaction.txn_number}*\n` +
      `Type: ${titleBadge}\n` +
      `Date: ${formatInvoiceDate(transaction.txn_date || transaction.created_at)}\n` +
      `Vendor: ${vendor.name} (${vendor.shop_name || 'N/A'}) - Phone: ${vendor.mobile || 'N/A'}\n\n` +
      `*Mobiles List (${mobiles.length}):*\n${itemsText}\n\n` +
      `*Total Cost:* ₹${parseFloat(transaction.total_cost || 0).toFixed(2)}\n` +
      `*Paid Amount:* ₹${parseFloat(transaction.paid_amount || 0).toFixed(2)}\n` +
      `*Notes:* ${transaction.notes || 'None'}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Receipt summary copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const rawPhone = (vendor.whatsapp || vendor.mobile || '').replace(/\D/g, '');
    if (!rawPhone) {
      toast.error('No vendor WhatsApp number on file.');
      return;
    }

    const itemsText = mobiles
      .map(
        (m, idx) =>
          `• *${m.brand} ${m.model}* [IMEI: ${m.imei || 'N/A'}]\n  Problem: ${m.repair_problem}\n  Cost: ₹${
            m.actual_cost || m.estimated_cost || 0
          } | Status: ${m.current_status}`
      )
      .join('\n\n');

    const msg = encodeURIComponent(
      `*${shop?.name || 'Mobotech mobile care'}*\n` +
        `*${titleBadge}*\n` +
        `Transaction #: ${transaction.txn_number}\n` +
        `Date: ${formatInvoiceDate(transaction.txn_date || transaction.created_at)}\n\n` +
        `Dear ${vendor.name} (${vendor.shop_name || 'Vendor'}),\n` +
        `Here is the itemized summary of ${mobiles.length} mobile(s):\n\n` +
        `${itemsText}\n\n` +
        `*Total Charges:* ₹${parseFloat(transaction.total_cost || 0).toFixed(2)}\n` +
        `*Paid Amount:* ₹${parseFloat(transaction.paid_amount || 0).toFixed(2)}\n` +
        (transaction.notes ? `*Notes:* ${transaction.notes}\n\n` : '\n') +
        `Please verify and confirm upon receipt.`
    );

    const intlPhone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Top Floating Action Bar (Hidden on print) */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-700/80 p-3 rounded-2xl shadow-xl print:hidden">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-sky-400" />
          <span className="text-xs sm:text-sm font-bold text-white">
            {transaction.txn_number} Receipt
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
            {mobiles.length} Device{mobiles.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyText}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy Receipt Summary"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Share via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-sky-950/40 transition-all cursor-pointer"
            title="Print Receipt"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Printable Paper Canvas (Clean White Background for High Precision Ink Printing) */}
      <div
        ref={printAreaRef}
        className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-300 max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:rounded-none"
      >
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-800 pb-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight uppercase">
              {shop?.name || 'Mobotech mobile care'}
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              {shop?.tagline || 'Professional Smartphone, Tablet & Chip-Level Repair Lab'}
            </p>
            <div className="text-[11px] text-slate-600 mt-1.5 space-y-0.5">
              <p>{shop?.address || 'Surat, Gujarat, India'}</p>
              <p>
                Phone: <span className="font-mono font-semibold">{shop?.phone || '080000 24439'}</span> | Email:{' '}
                {shop?.email || 'support@mobotech.com'}
              </p>
              {shop?.tax_number && (
                <p className="font-mono text-[10px] font-bold text-slate-800">
                  GSTIN: {shop.tax_number}
                </p>
              )}
            </div>
          </div>

          <div className="text-right flex flex-col items-end shrink-0">
            <div className="px-3 py-1 rounded bg-slate-900 text-white text-[10px] font-bold tracking-wider uppercase mb-2">
              {titleBadge}
            </div>
            <SimpleBarcode value={transaction.txn_number} />
            <div className="font-mono text-sm font-black text-slate-900 mt-1">
              #{transaction.txn_number}
            </div>
            <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              <span>{formatInvoiceDate(transaction.txn_date || transaction.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Info Grid: Vendor & Transaction Context */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-slate-300 text-xs">
          {/* Vendor Details */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
              <span>Vendor / External Lab</span>
              <span className="font-mono text-sky-700">{vendor.vendor_code || 'VND'}</span>
            </div>
            <p className="font-bold text-sm text-slate-900">{vendor.name || 'Vendor'}</p>
            {vendor.shop_name && (
              <p className="font-semibold text-slate-700 text-xs">{vendor.shop_name}</p>
            )}
            <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-600">
              <p>
                Phone / WhatsApp:{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {vendor.mobile || vendor.whatsapp || 'N/A'}
                </span>
              </p>
              {vendor.address && <p>{vendor.address}</p>}
              {vendor.gst_number && (
                <p className="font-mono text-[10px]">GSTIN: {vendor.gst_number}</p>
              )}
            </div>
          </div>

          {/* Movement & Handling Summary */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Transaction Meta
              </div>
              <div className="space-y-1 text-[11px] text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Flow Direction:</span>
                  <span className="font-bold text-slate-900">
                    {isSend || isJobReturn ? 'Outward Dispatch' : 'Inward Delivery'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Mobiles Handled:</span>
                  <span className="font-mono font-bold text-slate-900">{mobiles.length} Unit(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Issued / Handled By:</span>
                  <span className="font-medium text-slate-900">{transaction.created_by || 'Staff'}</span>
                </div>
                {transaction.payment_mode && transaction.payment_mode !== 'NONE' && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Mode:</span>
                    <span className="font-bold text-slate-900">{transaction.payment_mode}</span>
                  </div>
                )}
              </div>
            </div>

            {transaction.notes && (
              <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-600">
                <span className="font-bold">Instructions:</span> {transaction.notes}
              </div>
            )}
          </div>
        </div>

        {/* Multi-Mobile Itemized Table */}
        <div className="py-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center justify-between">
            <span>Itemized Handsets & Diagnosis Breakdown</span>
            <span className="font-normal text-slate-500 text-[11px]">
              {mobiles.length} {mobiles.length === 1 ? 'Mobile' : 'Mobiles'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2 px-2.5 w-8 text-center border-r border-slate-300">#</th>
                  <th className="py-2 px-3 border-r border-slate-300">Device & Model</th>
                  <th className="py-2 px-3 border-r border-slate-300">IMEI / Serial</th>
                  <th className="py-2 px-3 border-r border-slate-300">Reported Problem</th>
                  <th className="py-2 px-3 border-r border-slate-300">Condition / Acc.</th>
                  <th className="py-2 px-3 text-center border-r border-slate-300">Status</th>
                  <th className="py-2 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {mobiles.map((mob, idx) => {
                  const cost = parseFloat(mob.actual_cost || mob.estimated_cost || 0);

                  return (
                    <tr key={mob.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-2.5 text-center font-bold text-slate-500 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-900">
                        {mob.brand} {mob.model}
                        {mob.customer_name && (
                          <div className="text-[10px] text-slate-500 font-normal">
                            Cust: {mob.customer_name}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-[10px] text-slate-800">
                        {mob.imei || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-slate-800 max-w-xs">
                        {mob.repair_problem}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-slate-600 text-[10px]">
                        <div>{mob.condition || 'Used'}</div>
                        {mob.accessories && (
                          <div className="text-slate-500 font-medium">Acc: {mob.accessories}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 text-slate-800 border border-slate-300 uppercase">
                          {mob.repair_result !== 'PENDING' ? mob.repair_result : mob.current_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatIndianCurrency(cost, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Settlement & Signatures */}
        <div className="pt-2 border-t border-slate-300">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
            {/* Terms and notes */}
            <div className="flex-1 text-[10px] text-slate-500 space-y-1">
              <p className="font-bold text-slate-700 uppercase">Important Terms & Conditions:</p>
              <p>
                1. Vendor acknowledges receipt of handsets in the condition stated above.
              </p>
              <p>
                2. Any physical, glass, or liquid damage during transit or repair must be reported immediately.
              </p>
              <p>
                3. Replaced parts / original components must be returned along with completed handsets.
              </p>
            </div>

            {/* Calculations Box */}
            <div className="w-full sm:w-64 bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Charges:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatIndianCurrency(transaction.total_cost || 0, true)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Paid / Settled:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {formatIndianCurrency(transaction.paid_amount || 0, true)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-black text-slate-900">
                <span>Balance:</span>
                <span className="font-mono">
                  {formatIndianCurrency(
                    Math.max(0, (transaction.total_cost || 0) - (transaction.paid_amount || 0)),
                    true
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Signature Areas */}
          <div className="grid grid-cols-2 gap-8 pt-12 text-center text-xs text-slate-700">
            <div>
              <div className="border-t border-dashed border-slate-400 mx-auto w-48 mb-1"></div>
              <p className="font-bold text-slate-900">Authorized Signature</p>
              <p className="text-[10px] text-slate-500">{shop?.name || 'Mobotech mobile care'}</p>
            </div>

            <div>
              <div className="border-t border-dashed border-slate-400 mx-auto w-48 mb-1"></div>
              <p className="font-bold text-slate-900">Vendor / Receiver Signature</p>
              <p className="text-[10px] text-slate-500">{vendor.name || 'Vendor Receiver'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
