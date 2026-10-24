import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Receipt,
  Search,
  Printer,
  Share2,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Plus,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorNavTabs } from '../../components/vendors/VendorNavTabs';
import { Card, LoadingSpinner, EmptyState, TableSkeleton } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { VendorReceiptPrintable } from '../../components/vendors/VendorReceiptPrintable';
import { vendorService } from '../../services/vendorService';
import { settingsService } from '../../services/settingsService';
import { formatIndianCurrency, formatInvoiceDate } from '../../utils/billFormatters';
import { useDebounce } from '../../hooks/useDebounce';

const TYPE_TABS = [
  { key: 'ALL', label: 'All Transactions' },
  { key: 'SEND_TO_VENDOR', label: 'Mobiles Sent (Outward)' },
  { key: 'RECEIVE_FROM_VENDOR', label: 'Mobiles Received (Inward)' },
  { key: 'VENDOR_JOB_INWARD', label: 'Vendor B2B Jobs (Inward)' },
  { key: 'VENDOR_JOB_RETURN', label: 'Vendor B2B Returns (Outward)' },
];

export const VendorTransactionsList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentType = searchParams.get('txnType') || 'ALL';
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('sortBy') || 'created_at';
  const currentDir = searchParams.get('sortDir') || 'desc';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = parseInt(searchParams.get('pageSize') || '15', 10);

  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shopProfile, setShopProfile] = useState(null);

  const [searchInput, setSearchInput] = useState(currentSearch);
  const debouncedSearch = useDebounce(searchInput, 400);

  // Selected Transaction for Printable Receipt Modal
  const [selectedTxn, setSelectedTxn] = useState(null);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed !== currentSearch) {
      const params = new URLSearchParams(searchParams);
      if (trimmed) params.set('search', trimmed);
      else params.delete('search');
      params.set('page', '1');
      setSearchParams(params);
    }
  }, [debouncedSearch]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        sortBy: currentSort,
        sortDir: currentDir,
      };
      if (currentType !== 'ALL') params.txnType = currentType;
      if (currentSearch) params.search = currentSearch;

      const res = await vendorService.getVendorTransactions(params);
      if (res?.data) {
        setTransactions(res.data.transactions || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
      toast.error('Failed to load vendor transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [currentType, currentSearch, currentSort, currentDir, page, pageSize]);

  useEffect(() => {
    settingsService.getSettings().then((res) => {
      if (res?.data?.shop) setShopProfile(res.data.shop);
    }).catch(() => {});
  }, []);

  const handleTypeChange = (type) => {
    const params = new URLSearchParams(searchParams);
    if (type === 'ALL') params.delete('txnType');
    else params.set('txnType', type);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleShareWhatsApp = (e, txn) => {
    e.stopPropagation();
    const vendor = txn.vendor || {};
    const rawPhone = (vendor.whatsapp || vendor.mobile || '').replace(/\D/g, '');
    if (!rawPhone) {
      toast.error('No vendor WhatsApp number on file.');
      return;
    }

    const itemsText = (txn.mobiles || [])
      .map(
        (m, idx) =>
          `• ${m.brand} ${m.model} [IMEI: ${m.imei || 'N/A'}] - ${m.repair_problem}`
      )
      .join('\n');

    const msg = encodeURIComponent(
      `*${shopProfile?.name || 'Mobotech mobile care'}*\n` +
        `*Vendor Transaction Receipt #${txn.txn_number}*\n` +
        `Date: ${formatInvoiceDate(txn.txn_date || txn.created_at)}\n` +
        `Type: ${txn.txn_type.replace(/_/g, ' ')}\n\n` +
        `*Items Handled:*\n${itemsText}\n\n` +
        `*Total Charges:* ₹${parseFloat(txn.total_cost || 0).toFixed(2)}\n` +
        `*Paid:* ₹${parseFloat(txn.paid_amount || 0).toFixed(2)}\n`
    );

    const intlPhone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--spatial-text-title)] tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-apple-blue" />
            Vendor Transactions
          </h1>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
            Browse and search all dispatch chalans, receive return acknowledgements, and B2B batches
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={ArrowDownLeft}
            onClick={() => navigate('/vendors/receive')}
          >
            Receive from Vendor
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={ArrowUpRight}
            onClick={() => navigate('/vendors/send')}
          >
            Send Mobiles to Vendor
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <VendorNavTabs activeTab="/vendors/transactions" />

      {/* Filter and Search Bar with Ergonomic h-11 Height */}
      <div className="spatial-card p-4 rounded-2xl space-y-3">
        {/* Status Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--spatial-border)] no-scrollbar">
          {TYPE_TABS.map((tab) => {
            const active = currentType === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTypeChange(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-apple-blue text-white shadow-xs'
                    : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input with h-11 height & Sort By */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by transaction #, vendor name, IMEI, model..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-11 pl-10 pr-9 py-2.5 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-all shadow-xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  const params = new URLSearchParams(searchParams);
                  params.delete('search');
                  params.set('page', '1');
                  setSearchParams(params);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--spatial-text-muted)]">
            <span className="shrink-0 font-medium">Sort by:</span>
            <div className="w-40">
              <SpatialSelect
                value={`${currentSort}:${currentDir}`}
                onChange={(val) => {
                  const [sortBy, sortDir] = val.split(':');
                  const params = new URLSearchParams(searchParams);
                  params.set('sortBy', sortBy);
                  params.set('sortDir', sortDir);
                  params.set('page', '1');
                  setSearchParams(params);
                }}
                options={[
                  { value: 'created_at:desc', label: 'Newest First' },
                  { value: 'created_at:asc', label: 'Oldest First' },
                  { value: 'total_cost:desc', label: 'Highest Amount' },
                  { value: 'total_cost:asc', label: 'Lowest Amount' },
                ]}
                size="sm"
                searchable={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Transactions Table */}
      <Card
        title={`Vendor Transactions (${total})`}
        subtitle={`Showing page ${page} of ${Math.max(1, Math.ceil(total / pageSize))}`}
        bodyClassName="p-0"
      >
        {loading ? (
          <TableSkeleton rows={7} columns={6} showHeader={false} showPagination={false} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions found"
            description="No transactions match your search or filter criteria."
            actionLabel="Send Mobiles to Vendor"
            onAction={() => navigate('/vendors/send')}
          />
        ) : (
          <div className="spatial-tab-pane">
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1050px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="px-5 py-3 whitespace-nowrap">Txn Number</th>
                    <th className="px-5 py-3 whitespace-nowrap">Date</th>
                    <th className="px-5 py-3 whitespace-nowrap">Vendor Name & Lab</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Direction / Type</th>
                    <th className="px-5 py-3 whitespace-nowrap">Handsets Included</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Total Cost</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Paid Now</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {transactions.map((txn) => {
                    const isOutward = txn.txn_type === 'SEND_TO_VENDOR' || txn.txn_type === 'VENDOR_JOB_RETURN';
                    const mobilesList = txn.mobiles || [];
                    const firstMobile = mobilesList[0] || {};
                    const remainingCount = Math.max(0, mobilesList.length - 1);

                    return (
                      <tr
                        key={txn.id}
                        onClick={() => setSelectedTxn(txn)}
                        className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer group"
                      >
                        {/* 1. Txn Number */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded-md bg-apple-blue/10 text-apple-blue border border-apple-blue/20">
                            #{txn.txn_number}
                          </span>
                        </td>

                        {/* 2. Date */}
                        <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] whitespace-nowrap font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--spatial-text-muted)]" />
                            <span>{formatInvoiceDate(txn.txn_date || txn.created_at)}</span>
                          </div>
                        </td>

                        {/* 3. Vendor */}
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-[var(--spatial-text-title)]">
                            {txn.vendor?.name || 'Vendor'}
                          </div>
                          {txn.vendor?.shop_name && (
                            <div className="text-[11px] text-[var(--spatial-text-muted)] mt-0.5">
                              {txn.vendor?.shop_name}
                            </div>
                          )}
                        </td>

                        {/* 4. Type Badge */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              isOutward
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {isOutward ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                            {txn.txn_type.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* 5. Mobiles List Summary */}
                        <td className="px-5 py-3.5 max-w-sm">
                          {mobilesList.length === 0 ? (
                            <span className="text-[var(--spatial-text-muted)]">No items recorded</span>
                          ) : (
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-[var(--spatial-text-title)] truncate">
                                  {firstMobile.brand} {firstMobile.model}
                                </span>
                                {firstMobile.imei && (
                                  <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-slate-800 text-sky-300">
                                    {firstMobile.imei}
                                  </span>
                                )}
                              </div>
                              {remainingCount > 0 && (
                                <div className="text-[10px] text-sky-400 font-medium mt-0.5">
                                  + {remainingCount} more handset{remainingCount > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 6. Total Cost */}
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-sm text-[var(--spatial-text-title)] whitespace-nowrap">
                          {formatIndianCurrency(txn.total_cost || 0, true)}
                        </td>

                        {/* 7. Paid Amount */}
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {formatIndianCurrency(txn.paid_amount || 0, true)}
                        </td>

                        {/* 8. Actions */}
                        <td
                          className="px-5 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedTxn(txn)}
                              className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 border border-transparent hover:border-sky-500/20 transition-all cursor-pointer"
                              title="Print / View Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleShareWhatsApp(e, txn)}
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all cursor-pointer"
                              title="Share on WhatsApp"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-[var(--spatial-border)]">
              <SpatialPagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={(p) => {
                  const params = new URLSearchParams(searchParams);
                  params.set('page', String(p));
                  setSearchParams(params);
                }}
                onPageSizeChange={(s) => {
                  const params = new URLSearchParams(searchParams);
                  params.set('pageSize', String(s));
                  params.set('page', '1');
                  setSearchParams(params);
                }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Printable Receipt Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative max-w-4xl w-full my-8">
            <VendorReceiptPrintable
              transaction={selectedTxn}
              shop={shopProfile}
              onClose={() => setSelectedTxn(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
