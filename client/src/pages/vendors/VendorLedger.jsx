import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Download,
  Printer,
  PlusCircle,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  Phone,
  ShieldCheck,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import VendorNavTabs from '../../components/vendors/VendorNavTabs';
import { vendorService } from '../../services/vendorService';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { VendorPaymentModal } from '../../components/vendors/VendorPaymentModal';
import { formatIndianCurrency } from '../../utils/billFormatters';

export default function VendorLedger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const printRef = useRef(null);

  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState(searchParams.get('vendorId') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [searchTerm, setSearchTerm] = useState('');

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Load vendors list
  const loadVendors = async () => {
    try {
      const res = await vendorService.getVendors({ limit: 100 });
      const list = res.vendors || [];
      setVendors(list);
      if (!selectedVendorId && list.length > 0) {
        setSelectedVendorId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load vendors', err);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  // Fetch ledger statement for selected vendor
  const fetchLedger = useCallback(async () => {
    if (!selectedVendorId) return;
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await vendorService.getVendorLedger(selectedVendorId, params);
      setStatement(res.data || res);
    } catch (err) {
      console.error('Failed to fetch vendor ledger', err);
    } finally {
      setLoading(false);
    }
  }, [selectedVendorId, startDate, endDate]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Sync URL query params
  useEffect(() => {
    const params = {};
    if (selectedVendorId) params.vendorId = selectedVendorId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    setSearchParams(params, { replace: true });
  }, [selectedVendorId, startDate, endDate, setSearchParams]);

  // Filter entries based on search term
  const filteredEntries = useMemo(() => {
    if (!statement || !statement.entries) return [];
    if (!searchTerm.trim()) return statement.entries;
    const term = searchTerm.toLowerCase();
    return statement.entries.filter(
      (entry) =>
        (entry.description || '').toLowerCase().includes(term) ||
        (entry.reference_no || '').toLowerCase().includes(term) ||
        (entry.entry_type || '').toLowerCase().includes(term) ||
        (entry.payment_mode || '').toLowerCase().includes(term)
    );
  }, [statement, searchTerm]);

  // Active vendor profile
  const activeVendor = useMemo(() => {
    return vendors.find((v) => v.id === selectedVendorId) || statement?.vendor || null;
  }, [vendors, selectedVendorId, statement]);

  // Vendor options for SpatialSelect
  const vendorOptions = useMemo(() => {
    return vendors.map((v) => ({
      value: v.id,
      label: `${v.name} (${v.shop_name || 'Vendor'})`,
      badge: v.current_balance > 0 ? `Payable ₹${v.current_balance}` : v.current_balance < 0 ? `Receivable ₹${Math.abs(v.current_balance)}` : 'Nil Bal',
    }));
  }, [vendors]);

  // Quick date filters
  const setQuickDate = (type) => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (type === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (type === 'TODAY') {
      const nowStr = format(today);
      setStartDate(nowStr);
      setEndDate(nowStr);
    } else if (type === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(format(firstDay));
      setEndDate(format(today));
    } else if (type === 'LAST_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(format(firstDay));
      setEndDate(format(lastDay));
    }
  };

  // CSV Export
  const exportToCSV = () => {
    if (!filteredEntries || filteredEntries.length === 0) return;

    const headers = ['Date', 'Reference No', 'Description', 'Payment Mode', 'Debit (Rs)', 'Credit (Rs)', 'Running Balance (Rs)'];
    const rows = filteredEntries.map((e) => [
      `"${e.date || ''}"`,
      `"${e.reference_no || ''}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      `"${e.payment_mode || '-'}"`,
      e.debit || 0,
      e.credit || 0,
      e.running_balance || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Vendor_Ledger_${activeVendor?.name || 'Statement'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-apple-blue/10 border border-apple-blue/20 text-apple-blue flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--spatial-text-title)] flex items-center gap-2">
                Vendor Accounting Ledger
              </h1>
              <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5">
                Full debit & credit transaction ledger, repair charges, payments, and running balances
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchLedger}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[var(--spatial-bg-card)] hover:bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-body)] border border-[var(--spatial-border)] transition-all active:scale-95 flex items-center gap-2 text-sm cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-apple-blue' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={exportToCSV}
            disabled={!filteredEntries.length}
            className="px-3.5 py-2.5 rounded-xl bg-[var(--spatial-bg-card)] hover:bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-body)] border border-[var(--spatial-border)] transition-all active:scale-95 flex items-center gap-2 text-sm font-medium disabled:opacity-50 cursor-pointer"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!filteredEntries.length}
            className="px-3.5 py-2.5 rounded-xl bg-[var(--spatial-bg-card)] hover:bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-body)] border border-[var(--spatial-border)] transition-all active:scale-95 flex items-center gap-2 text-sm font-medium disabled:opacity-50 cursor-pointer"
            title="Print Statement"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <Button
            variant="primary"
            size="sm"
            icon={PlusCircle}
            onClick={() => setPaymentModalOpen(true)}
          >
            Record Payment / Voucher
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <VendorNavTabs activeTab="ledger" />

      {/* Filter and Vendor Select Bar */}
      <div className="spatial-card p-4 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Vendor Selector */}
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Select Vendor Account
            </label>
            <SpatialSelect
              options={vendorOptions}
              value={selectedVendorId}
              onChange={setSelectedVendorId}
              searchable={true}
              placeholder="Search or Select Vendor..."
            />
          </div>

          {/* Date Range Start */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl spatial-input text-xs sm:text-sm font-mono"
            />
          </div>

          {/* Date Range End */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl spatial-input text-xs sm:text-sm font-mono"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="md:col-span-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setQuickDate('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                !startDate && !endDate
                  ? 'bg-apple-blue text-white shadow-xs'
                  : 'bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] border border-[var(--spatial-border)]'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setQuickDate('TODAY')}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] border border-[var(--spatial-border)] transition-all whitespace-nowrap cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => setQuickDate('THIS_MONTH')}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] border border-[var(--spatial-border)] transition-all whitespace-nowrap cursor-pointer"
            >
              This Month
            </button>
            <button
              onClick={() => setQuickDate('LAST_MONTH')}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] border border-[var(--spatial-border)] transition-all whitespace-nowrap cursor-pointer"
            >
              Last Month
            </button>
          </div>
        </div>

        {/* Search within ledger */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--spatial-text-muted)]" />
          <input
            type="text"
            placeholder="Search by description, reference number, transaction type, or payment mode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl spatial-input text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Selected Vendor Profile Header Card */}
      {activeVendor && (
        <div className="spatial-card p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-apple-blue/10 border border-apple-blue/20 flex items-center justify-center text-apple-blue font-bold text-lg">
              {activeVendor.name ? activeVendor.name.charAt(0).toUpperCase() : 'V'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[var(--spatial-text-title)]">{activeVendor.name}</h2>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-apple-blue/10 text-apple-blue border border-apple-blue/20">
                  {activeVendor.code || 'VENDOR'}
                </span>
              </div>
              <div className="text-xs text-[var(--spatial-text-muted)] mt-0.5 flex items-center gap-3 flex-wrap">
                {activeVendor.shop_name && <span>{activeVendor.shop_name}</span>}
                {activeVendor.mobile && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-[var(--spatial-text-muted)]" />
                    {activeVendor.mobile}
                  </span>
                )}
                {activeVendor.gst_number && (
                  <span className="font-mono text-[11px]">GST: {activeVendor.gst_number}</span>
                )}
              </div>
            </div>
          </div>

          {/* Current Live Balance Banner */}
          <div className="flex items-center gap-4">
            <div className="text-left md:text-right">
              <span className="text-[11px] text-[var(--spatial-text-muted)] uppercase tracking-wider block font-semibold">
                Current Net Position
              </span>
              <div className="text-2xl font-bold font-mono tabular-nums mt-0.5">
                {activeVendor.current_balance > 0 ? (
                  <span className="text-amber-500 flex items-center gap-1.5">
                    ₹{parseFloat(activeVendor.current_balance).toLocaleString('en-IN')}{' '}
                    <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold">
                      Payable (We Owe)
                    </span>
                  </span>
                ) : activeVendor.current_balance < 0 ? (
                  <span className="text-emerald-500 flex items-center gap-1.5">
                    ₹{Math.abs(parseFloat(activeVendor.current_balance)).toLocaleString('en-IN')}{' '}
                    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                      Receivable (Vendor Owes Us)
                    </span>
                  </span>
                ) : (
                  <span className="text-[var(--spatial-text-muted)] text-lg">₹0.00 (Balanced / Settled)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="spatial-card p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] text-[var(--spatial-text-muted)] font-semibold uppercase tracking-wider block">Opening Balance</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--spatial-text-title)] mt-1.5">
            ₹{parseFloat(statement?.opening_balance || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[var(--spatial-text-muted)] mt-1 block">Account start position</span>
        </div>

        <div className="spatial-card p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-apple-blue font-semibold uppercase tracking-wider">Total Debits</span>
            <ArrowUpRight className="w-4 h-4 text-apple-blue" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-apple-blue mt-1.5">
            ₹{parseFloat(statement?.total_debit || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[var(--spatial-text-muted)] mt-1 block">Payments made / billed services</span>
        </div>

        <div className="spatial-card p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-500 font-semibold uppercase tracking-wider">Total Credits</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-500 mt-1.5">
            ₹{parseFloat(statement?.total_credit || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[var(--spatial-text-muted)] mt-1 block">Repair charges / funds received</span>
        </div>

        <div className="spatial-card p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] text-[var(--spatial-text-muted)] font-semibold uppercase tracking-wider block">Closing Period Balance</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--spatial-text-title)] mt-1.5">
            ₹{parseFloat(statement?.closing_balance || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[var(--spatial-text-muted)] mt-1 block">Calculated running total</span>
        </div>
      </div>

      {/* Ledger Entries Table */}
      <div className="spatial-card p-0 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--spatial-text-muted)] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-apple-blue" />
            <span>Computing vendor accounting ledger statement...</span>
          </div>
        ) : !selectedVendorId ? (
          <div className="p-12 text-center text-[var(--spatial-text-muted)]">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-[var(--spatial-text-muted)]" />
            <p>Please select a vendor account above to view their financial ledger.</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-[var(--spatial-text-muted)]">
            <FileText className="w-12 h-12 mx-auto mb-3 text-[var(--spatial-text-muted)]" />
            <h3 className="text-base font-semibold text-[var(--spatial-text-title)]">No Ledger Entries Found</h3>
            <p className="text-xs text-[var(--spatial-text-muted)] mt-1 max-w-sm mx-auto">
              There are no debit or credit transactions recorded for this vendor within the selected period.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto table-scrollbar w-full pb-2">
            <table className="w-full text-left text-xs min-w-[950px]">
              <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type / Ref No</th>
                  <th className="py-3 px-4">Description / Particulars</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4 text-right">Debit (₹)</th>
                  <th className="py-3 px-4 text-right">Credit (₹)</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--spatial-border)]">
                {filteredEntries.map((entry, idx) => {
                  const isDebit = parseFloat(entry.debit) > 0;
                  const isCredit = parseFloat(entry.credit) > 0;
                  const runningBal = parseFloat(entry.running_balance || 0);

                  return (
                    <tr key={entry.id || idx} className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 text-xs font-mono text-[var(--spatial-text-muted)] whitespace-nowrap">
                        {entry.date}
                      </td>

                      {/* Type / Ref */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-apple-blue">
                          {entry.reference_no || '-'}
                        </div>
                        <span className="text-[10px] uppercase font-bold text-[var(--spatial-text-muted)]">
                          {entry.entry_type?.replace(/_/g, ' ') || 'TRANSACTION'}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-md">
                        <div className="text-[var(--spatial-text-title)] text-xs font-medium">{entry.description}</div>
                        {entry.notes && (
                          <div className="text-[11px] text-[var(--spatial-text-muted)] mt-0.5 italic">
                            Notes: {entry.notes}
                          </div>
                        )}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        {entry.payment_mode && entry.payment_mode !== 'NONE' ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-title)] border border-[var(--spatial-border)]">
                            {entry.payment_mode}
                          </span>
                        ) : (
                          <span className="text-[var(--spatial-text-muted)]">-</span>
                        )}
                      </td>

                      {/* Debit */}
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-apple-blue whitespace-nowrap">
                        {isDebit ? `₹${parseFloat(entry.debit).toLocaleString('en-IN')}` : '-'}
                      </td>

                      {/* Credit */}
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-emerald-500 whitespace-nowrap">
                        {isCredit ? `₹${parseFloat(entry.credit).toLocaleString('en-IN')}` : '-'}
                      </td>

                      {/* Running Balance */}
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                        {runningBal > 0 ? (
                          <span className="text-amber-500">
                            ₹{runningBal.toLocaleString('en-IN')} <span className="text-[10px] font-normal">Cr (Payable)</span>
                          </span>
                        ) : runningBal < 0 ? (
                          <span className="text-emerald-500">
                            ₹{Math.abs(runningBal).toLocaleString('en-IN')} <span className="text-[10px] font-normal">Dr (Receivable)</span>
                          </span>
                        ) : (
                          <span className="text-[var(--spatial-text-muted)] font-normal">₹0.00</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Voucher Modal */}
      <VendorPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        vendors={vendors}
        selectedVendorId={selectedVendorId}
        onPaymentRecorded={() => {
          loadVendors();
          fetchLedger();
        }}
      />
    </div>
  );
}

export { VendorLedger };
