import React from 'react';
import { Smartphone, Printer, CheckCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';

export const InvoicePrintable = ({ invoice, job, shop }) => {
  if (!invoice || !job) return null;

  const handlePrint = () => {
    window.print();
  };

  const items = invoice.items || [];
  const payments = job.payments || [];

  return (
    <div className="bg-white p-6 sm:p-8 max-w-4xl mx-auto text-slate-800 print:p-0 print:max-w-full">
      {/* Top action toolbar (hidden on print) */}
      <div className="no-print flex items-center justify-between pb-6 mb-6 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tax Invoice & Warranty Certificate</h2>
          <p className="text-xs text-slate-500">Official repair receipt for customer</p>
        </div>
        <Button icon={Printer} onClick={handlePrint}>
          Print Invoice
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
              <p className="text-xs text-slate-500">{shop?.tagline || 'Mobile & Tablet Repair Service Center'}</p>
              <p className="text-xs text-slate-600 mt-1">{shop?.address}</p>
              <p className="text-xs text-slate-600">Tel: {shop?.phone} • Email: {shop?.email}</p>
              {shop?.tax_number && (
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">Tax / Business ID: {shop.tax_number}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-mono font-bold tracking-wider">
              OFFICIAL INVOICE
            </span>
            <p className="text-base font-bold font-mono text-slate-900 mt-1">{invoice.invoice_number}</p>
            <p className="text-xs font-mono text-slate-500 mt-0.5">Ref: {job.job_number}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Date: {new Date(invoice.issued_at || invoice.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* 2-Column: Billed To & Device Info */}
        <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200 text-xs">
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px] text-primary-700">Billed To (Customer)</h4>
            <div className="space-y-1">
              <p><strong className="text-slate-900 text-sm">{job.customer?.full_name}</strong></p>
              <p><span className="text-slate-500">Phone:</span> {job.customer?.phone}</p>
              {job.customer?.email && <p><span className="text-slate-500">Email:</span> {job.customer?.email}</p>}
              {job.customer?.address && <p><span className="text-slate-500">Address:</span> {job.customer?.address}</p>}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px] text-primary-700">Repaired Device</h4>
            <div className="space-y-1">
              <p><strong className="text-slate-900 text-sm">{job.device?.brand} {job.device?.model}</strong></p>
              <p><span className="text-slate-500">IMEI:</span> <span className="font-mono">{job.device?.imei || 'N/A'}</span></p>
              <p><span className="text-slate-500">Color:</span> {job.device?.color || 'N/A'}</p>
              <p><span className="text-slate-500">Resolved Issue:</span> {job.customer_complaint}</p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <th className="py-2.5">Item / Service Description</th>
                <th className="py-2.5 text-center">Type</th>
                <th className="py-2.5 text-center">Qty</th>
                <th className="py-2.5 text-right">Unit Price</th>
                <th className="py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="py-2.5 font-medium text-slate-900">{item.item_name}</td>
                  <td className="py-2.5 text-center">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600">
                      {item.item_type}
                    </span>
                  </td>
                  <td className="py-2.5 text-center">{item.quantity}</td>
                  <td className="py-2.5 text-right font-mono">${Number(item.unit_price).toFixed(2)}</td>
                  <td className="py-2.5 text-right font-mono font-semibold text-slate-900">
                    ${Number(item.total_price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown & Payments */}
        <div className="border-t-2 border-slate-200 pt-4 grid grid-cols-2 gap-6 text-xs">
          <div>
            <h5 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px]">Payment Breakdown</h5>
            {payments.length > 0 ? (
              <div className="space-y-1.5">
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between p-2 bg-slate-50 rounded border border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-800">{p.payment_method}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{new Date(p.paid_at).toLocaleDateString()} {p.transaction_reference ? `• Ref: ${p.transaction_reference}` : ''}</p>
                    </div>
                    <span className="font-bold font-mono text-emerald-700">${Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic">No payments recorded</p>
            )}

            <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-[11px] text-emerald-800">
                <strong className="block font-bold">Warranty Guarantee</strong>
                {invoice.warranty_period || '90 Days Hardware Warranty'} on replaced components.
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount Applied:</span>
                <span className="font-mono font-medium">-${Number(invoice.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Sales Tax ({invoice.tax_rate}%):</span>
              <span className="font-mono font-medium">${Number(invoice.tax_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Invoice Amount:</span>
              <span className="font-mono">${Number(invoice.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Amount Paid:</span>
              <span className="font-mono">${Number(invoice.paid_amount).toFixed(2)}</span>
            </div>
            <div className={`flex justify-between font-bold text-sm pt-2 border-t border-slate-200 ${
              invoice.balance_due > 0 ? 'text-rose-600' : 'text-emerald-700'
            }`}>
              <span>Balance Remaining:</span>
              <span className="font-mono">${Number(invoice.balance_due).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="pt-6 mt-6 border-t border-slate-200 text-center text-[10px] text-slate-500">
          <p className="font-semibold text-slate-700">{invoice.notes || 'Thank you for choosing TechFix Pro for your mobile device repair services!'}</p>
          <p className="mt-1">For warranty inquiries or technical support, please contact {shop?.phone} or {shop?.email}.</p>
        </div>
      </div>
    </div>
  );
};
