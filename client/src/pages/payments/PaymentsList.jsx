import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Search,
  ExternalLink,
  Trash2,
  RefreshCw,
  Wallet,
  Receipt,
  ArrowUpDown,
  Filter,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useDebounce } from '../../hooks/useDebounce';
import { paymentService } from '../../services/paymentService';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { BulkActionBar } from '../../components/common/BulkActionBar';

export const PaymentsList = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [stats, setStats] = useState({
    totalAmount: 0,
    cashTotal: 0,
    cardTotal: 0,
    upiTotal: 0,
  });

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await paymentService.getPayments({
        method: methodFilter,
        search: debouncedSearch,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      setPayments(res.payments || []);
      setTotal(res.total ?? (res.payments ? res.payments.length : 0));
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      toast.error('Failed to load payments ledger');
    } finally {
      setLoading(false);
    }
  }, [methodFilter, debouncedSearch, page, pageSize]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Reset page to 1 when filters change
  const handleFilterChange = (newMethod) => {
    setMethodFilter(newMethod);
    setPage(1);
    setSelectedIds([]);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
    setSelectedIds([]);
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = payments.map((p) => p.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    } else {
      const pageIdSet = new Set(payments.map((p) => p.id));
      setSelectedIds(selectedIds.filter((id) => !pageIdSet.has(id)));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllCurrentPageSelected =
    payments.length > 0 && payments.every((p) => selectedIds.includes(p.id));

  // Single delete
  const handleDeletePayment = async (payment) => {
    const result = await Swal.fire({
      title: 'Delete Payment Record?',
      text: `Remove receipt "${payment.payment_number}" ($${Number(payment.amount).toFixed(2)})? The job balance will be automatically recalculated.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      background: 'var(--spatial-card-bg, #0f172a)',
      color: 'var(--spatial-text-title, #f8fafc)',
    });

    if (result.isConfirmed) {
      try {
        await paymentService.deletePayment(payment.id);
        toast.success(`Payment ${payment.payment_number} deleted`);
        setSelectedIds((prev) => prev.filter((id) => id !== payment.id));
        fetchPayments();
      } catch (err) {
        toast.error(err.message || 'Failed to delete payment');
      }
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: `Delete ${selectedIds.length} Payment Receipts?`,
      text: 'This will permanently remove the selected payment records and recalculate all corresponding job balances.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Delete ${selectedIds.length} Payments`,
      cancelButtonText: 'Cancel',
      background: 'var(--spatial-card-bg, #0f172a)',
      color: 'var(--spatial-text-title, #f8fafc)',
    });

    if (result.isConfirmed) {
      try {
        setIsBulkDeleting(true);
        const res = await paymentService.bulkDeletePayments(selectedIds);
        toast.success(res.message || `Deleted ${selectedIds.length} payments`);
        setSelectedIds([]);
        fetchPayments();
      } catch (err) {
        toast.error(err.message || 'Failed to delete selected payments');
      } finally {
        setIsBulkDeleting(false);
      }
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--spatial-text-title)] tracking-tight">
            Payment Ledger & Receipts
          </h2>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
            Historical ledger of all payments collected for repairs, deposits, and component sales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={RefreshCw}
            size="sm"
            onClick={fetchPayments}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="spatial-card p-4 rounded-2xl">
          <p className="text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase tracking-wider">
            Filtered Total
          </p>
          <p className="text-2xl font-bold text-[var(--spatial-text-title)] font-mono tabular-nums mt-1">
            ₹{Number(stats.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1">
            {total} total transaction{total === 1 ? '' : 's'}
          </p>
        </div>
        <div className="spatial-card p-4 rounded-2xl border-emerald-500/20 bg-emerald-500/5">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Cash Collected
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
            ₹{Number(stats.cashTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="spatial-card p-4 rounded-2xl border-apple-blue/20 bg-apple-blue/5">
          <p className="text-[11px] font-bold text-apple-blue uppercase tracking-wider">
            Card Transactions
          </p>
          <p className="text-2xl font-bold text-apple-blue font-mono tabular-nums mt-1">
            ₹{Number(stats.cardTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="spatial-card p-4 rounded-2xl border-purple-500/20 bg-purple-500/5">
          <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            UPI / QR Digital
          </p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums mt-1">
            ₹{Number(stats.upiTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="spatial-card p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search receipt #, job ticket, customer, ref..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-8 pr-8 py-2 text-xs spatial-input rounded-xl"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
                setSelectedIds([]);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={methodFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-3 py-2 spatial-input rounded-xl text-xs font-semibold"
          >
            <option value="ALL">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Credit / Debit Card</option>
            <option value="UPI">UPI / QR Digital</option>
            <option value="BANK_TRANSFER">Bank Wire</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <Card
        title={`All Transactions (${total})`}
        subtitle="Manage receipts, audit transaction logs, and review customer settlements"
        bodyClassName="p-0"
      >
        {loading && payments.length === 0 ? (
          <LoadingSpinner label="Fetching payments ledger..." />
        ) : payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments recorded"
            description="When customers pay deposits or settle repair balances, receipts will show here."
          />
        ) : (
          <div>
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1100px]">
                <thead className="bg-[var(--spatial-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={handleSelectAll}
                        className="rounded border-[var(--spatial-border)] text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                        title="Select all on this page"
                      />
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">Receipt / Ref</th>
                    <th className="px-4 py-3 whitespace-nowrap">Job Ticket</th>
                    <th className="px-4 py-3 whitespace-nowrap">Customer</th>
                    <th className="px-4 py-3 whitespace-nowrap">Device</th>
                    <th className="px-4 py-3 whitespace-nowrap">Method</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Amount</th>
                    <th className="px-4 py-3 whitespace-nowrap">Date & Time</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {payments.map((p) => {
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-sky-500/10'
                            : 'hover:bg-[var(--spatial-card-subtle)]'
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(p.id)}
                            className="rounded border-[var(--spatial-border)] text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-[var(--spatial-text-title)] whitespace-nowrap">
                          {p.payment_number}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => navigate(`/jobs/${p.job_id}`)}
                            className="font-mono font-bold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 whitespace-nowrap"
                            title="View Job Ticket"
                          >
                            <span>{p.job_number}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-[var(--spatial-text-title)] whitespace-nowrap">
                          {p.customer_name}
                        </td>
                        <td className="px-4 py-3.5 text-[var(--spatial-text-body)] whitespace-nowrap">
                          {p.device_model}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--spatial-card-subtle)] border border-[var(--spatial-border)] text-[var(--spatial-text-body)]">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                          ₹{Number(p.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-[var(--spatial-text-muted)] font-mono text-[11px] whitespace-nowrap">
                          {new Date(p.paid_at || p.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/jobs/${p.job_id}`)}
                              className="p-1 text-[var(--spatial-text-muted)] hover:text-sky-400 hover:bg-sky-500/10 rounded transition-colors"
                              title="View Ticket"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(p)}
                              className="p-1 text-[var(--spatial-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title="Delete Payment Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Spatial Pagination */}
            <SpatialPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              pageSizeOptions={[10, 15, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
        )}
      </Card>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onDelete={handleBulkDelete}
        isDeleting={isBulkDeleting}
        itemLabel="payment"
      />
    </div>
  );
};
export default PaymentsList;
