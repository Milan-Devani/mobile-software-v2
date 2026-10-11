import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  DollarSign,
  Search,
  Calendar,
  ExternalLink,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jobService } from '../../services/jobService';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';

export const PaymentsList = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('ALL');
  const navigate = useNavigate();

  const fetchAllPayments = async () => {
    try {
      setLoading(true);
      // Fetch all jobs to gather payments
      const res = await jobService.getJobs({ limit: 500 });
      const collected = [];
      for (const j of res.jobs || []) {
        if (Array.isArray(j.payments)) {
          for (const p of j.payments) {
            collected.push({
              ...p,
              job_number: j.job_number,
              customer_name: j.customer?.full_name,
              device_model: `${j.device?.brand || ''} ${j.device?.model || ''}`,
            });
          }
        }
      }
      collected.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
      setPayments(collected);
    } catch (err) {
      toast.error('Failed to load payments ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPayments();
  }, []);

  const filtered = payments.filter((p) => {
    return methodFilter === 'ALL' || p.payment_method === methodFilter;
  });

  const totalAmount = filtered.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const cashTotal = payments.filter((p) => p.payment_method === 'CASH').reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const cardTotal = payments.filter((p) => p.payment_method === 'CARD').reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const upiTotal = payments.filter((p) => p.payment_method === 'UPI').reduce((acc, p) => acc + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payment Ledger & Receipts</h2>
        <p className="text-xs text-slate-500 mt-1">
          Historical ledger of all payments collected for repairs and component sales
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Filtered Total</p>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">${totalAmount.toFixed(2)}</p>
          <p className="text-[11px] text-slate-400 mt-1">{filtered.length} transactions</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Cash Collected</p>
          <p className="text-2xl font-black text-emerald-600 font-mono mt-1">${cashTotal.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Card Transactions</p>
          <p className="text-2xl font-black text-primary-600 font-mono mt-1">${cardTotal.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-500 uppercase">UPI / QR Digital</p>
          <p className="text-2xl font-black text-indigo-600 font-mono mt-1">${upiTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Table */}
      <Card
        title={`All Transactions (${filtered.length})`}
        action={
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
          >
            <option value="ALL">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Credit / Debit Card</option>
            <option value="UPI">UPI / QR</option>
            <option value="BANK_TRANSFER">Bank Wire</option>
            <option value="OTHER">Other</option>
          </select>
        }
        bodyClassName="p-0"
      >
        {loading ? (
          <LoadingSpinner label="Fetching payments ledger..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments recorded"
            description="When customers pay deposits or settle repair balances, receipts will show here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3">Receipt / Ref</th>
                  <th className="px-5 py-3">Job Ticket</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Device</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-700">{p.payment_number}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => navigate(`/jobs/${p.job_id}`)}
                        className="font-mono font-bold text-primary-600 hover:underline flex items-center gap-1"
                      >
                        <span>{p.job_number}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{p.customer_name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.device_model}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600">
                      ${Number(p.amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono">
                      {new Date(p.paid_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
