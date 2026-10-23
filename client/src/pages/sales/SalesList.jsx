import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  Trash2,
  Eye,
  Smartphone,
  Package,
  Calendar,
  CreditCard,
  IndianRupee,
  Share2,
  X,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Building,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useDebounce } from '../../hooks/useDebounce';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { BulkActionBar } from '../../components/common/BulkActionBar';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { salesService } from '../../services/salesService';
import { settingsService } from '../../services/settingsService';
import { SameToSameBillPrintable } from '../../components/sales/SameToSameBillPrintable';
import { formatIndianCurrency, formatInvoiceDate } from '../../utils/billFormatters';

const STATUS_TABS = [
  { key: 'ALL', label: 'All Bills' },
  { key: 'WITH_GST', label: 'GST Tax Invoices' },
  { key: 'NON_GST', label: 'Retail Bills' },
  { key: 'CASH', label: 'Cash Sales' },
  { key: 'UPI', label: 'UPI / Digital' },
  { key: 'CARD', label: 'Card Sales' },
];

export const SalesList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [shopProfile, setShopProfile] = useState(null);

  // Selected sale for viewing / printing modal
  const [selectedSale, setSelectedSale] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // URL query state
  const currentStatus = searchParams.get('status') || 'ALL';
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('sortBy') || 'created_at';
  const currentDir = searchParams.get('sortDir') || 'desc';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = parseInt(searchParams.get('pageSize') || '15', 10);

  const [searchInput, setSearchInput] = useState(currentSearch);
  const debouncedSearch = useDebounce(searchInput, 500);

  // Sync external search changes to local searchInput
  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  // Debounced search sync to URL
  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed !== currentSearch) {
      const params = new URLSearchParams(searchParams);
      if (trimmed) {
        params.set('search', trimmed);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      setSearchParams(params);
    }
  }, [debouncedSearch]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        sortBy: currentSort,
        sortDir: currentDir,
      };
      if (currentStatus !== 'ALL') {
        params.status = currentStatus;
      }
      if (currentSearch) {
        params.search = currentSearch;
      }

      const res = await salesService.getSales(params);
      const list = res?.data?.sales || res?.sales || [];
      const totalCount = res?.data?.total !== undefined ? res.data.total : (res?.total !== undefined ? res.total : (Array.isArray(list) ? list.length : 0));
      setSales(list);
      setTotal(totalCount);
    } catch (err) {
      console.error('Failed to load sales list:', err);
      toast.error('Failed to load sales bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [currentStatus, currentSearch, currentSort, currentDir, page, pageSize]);

  useEffect(() => {
    settingsService
      .getSettings()
      .then((res) => {
        if (res?.data?.shop) {
          setShopProfile(res.data.shop);
        }
      })
      .catch(() => {});
  }, []);

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  const handlePageSizeChange = (newSize) => {
    const params = new URLSearchParams(searchParams);
    params.set('pageSize', String(newSize));
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleStatusChange = (status) => {
    const params = new URLSearchParams(searchParams);
    if (status === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed !== currentSearch) {
      const params = new URLSearchParams(searchParams);
      if (trimmed) {
        params.set('search', trimmed);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      setSearchParams(params);
    }
  };

  const toggleSelectAll = () => {
    const pageIds = sales.map((s) => s.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...pageIds]));
      setSelectedIds(merged);
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDelete = (e, sale) => {
    e.stopPropagation();
    Swal.fire({
      title: 'Delete this Sales Bill?',
      text: `Are you sure you want to permanently delete Invoice #${sale.invoice_no_seq || sale.invoice_number} for ${sale.customer_name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete Bill',
      cancelButtonText: 'Cancel',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await salesService.deleteSale(sale.id);
          toast.success(`Invoice #${sale.invoice_no_seq || sale.invoice_number} deleted successfully.`);
          setSales((prev) => prev.filter((s) => s.id !== sale.id));
          setTotal((prev) => Math.max(0, prev - 1));
          setSelectedIds((prev) => prev.filter((id) => id !== sale.id));
        } catch (err) {
          toast.error(err.message || 'Failed to delete sale');
        }
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Swal.fire({
      title: `Delete ${selectedIds.length} Sales Bill(s)?`,
      text: 'All selected customer bills, tax summaries, and warranty audit records will be permanently removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Yes, Delete (${selectedIds.length}) Bills`,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await salesService.bulkDeleteSales(selectedIds);
          toast.success(res.message || `Deleted ${selectedIds.length} bills`);
          setSelectedIds([]);
          fetchSales();
        } catch (err) {
          toast.error(err.message || 'Failed to delete bills');
        }
      }
    });
  };

  const handleOpenPrint = (sale) => {
    setSelectedSale(sale);
    setIsPrintModalOpen(true);
  };

  const handleDownloadPdf = async (e, sale) => {
    e.stopPropagation();
    try {
      toast.loading('Generating invoice PDF...', { id: 'pdf-toast' });
      await salesService.downloadSalePdf(sale.id, sale.invoice_no_seq || sale.invoice_number);
      toast.success('Invoice PDF downloaded successfully!', { id: 'pdf-toast' });
    } catch (err) {
      toast.error('Failed to download invoice PDF', { id: 'pdf-toast' });
    }
  };

  const handleShareWhatsApp = async (e, sale) => {
    e.stopPropagation();
    const phone = sale.customer_phone || 'customer';
    try {
      toast.loading(`Sending original invoice PDF to ${phone}...`, { id: 'send-inv-toast' });
      const res = await salesService.sendSaleInvoice(sale.id);
      toast.success(res.message || `Real invoice PDF sent automatically to ${phone}!`, { id: 'send-inv-toast' });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send invoice PDF', { id: 'send-inv-toast' });
    }
  };

  // Stats calculation
  const totalSalesRevenue = sales.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0);
  const totalTaxCollected = sales.reduce((sum, s) => sum + (parseFloat(s.total_tax) || 0), 0);

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--spatial-text-title)] tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-sky-400" />
            Sales & Quick Billing
          </h1>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
            Browse, search, and manage all retail customer bills and GST tax invoices for phones, parts, and accessories
          </p>
        </div>

        <Button icon={Plus} onClick={() => navigate('/sales/new')}>
          Generate New Bill
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="spatial-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-sky-500/15 text-sky-400">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase tracking-wider">
              Total Bills Generated
            </div>
            <div className="text-xl font-bold font-mono text-[var(--spatial-text-title)] mt-0.5">
              {total}
            </div>
          </div>
        </div>

        <div className="spatial-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase tracking-wider">
              Total Invoiced Value
            </div>
            <div className="text-xl font-bold font-mono text-[var(--spatial-text-title)] mt-0.5">
              {formatIndianCurrency(totalSalesRevenue, true)}
            </div>
          </div>
        </div>

        <div className="spatial-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase tracking-wider">
              GST Tax Tracked
            </div>
            <div className="text-xl font-bold font-mono text-[var(--spatial-text-title)] mt-0.5">
              {formatIndianCurrency(totalTaxCollected, true)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (Exact same layout & design as JobList.jsx) */}
      <div className="spatial-card p-4 rounded-2xl space-y-3">
        {/* Status Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--spatial-border)] no-scrollbar">
          {STATUS_TABS.map((tab) => {
            const active = currentStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStatusChange(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-950/20'
                    : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input & Sort Bar with ergonomic h-11 height */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone, bill #, IMEI..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-11 pl-10 pr-9 py-2.5 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-xs"
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
          </form>

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
                  { value: 'total_amount:desc', label: 'Highest Amount' },
                  { value: 'total_amount:asc', label: 'Lowest Amount' },
                  { value: 'customer_name:asc', label: 'Customer A-Z' },
                ]}
                size="sm"
                searchable={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (when rows are selected) */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        deleteLabel={`Delete (${selectedIds.length})`}
      />

      {/* Main Bills Table Card (Exact same design and functionality as Repair Job Sheets table) */}
      <Card
        title={`Matching Sales Bills (${total})`}
        subtitle={`Showing page ${page} of ${Math.max(1, Math.ceil(total / pageSize))}`}
        bodyClassName="p-0"
      >
        {loading ? (
          <LoadingSpinner label="Fetching sales ledger from database..." />
        ) : sales.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No sales bills recorded"
            description="No sales match your search or filter criteria. Generate your first retail bill or tax invoice."
            actionLabel="Generate First Bill"
            onAction={() => navigate('/sales/new')}
          />
        ) : (
          <div>
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1250px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={sales.length > 0 && sales.every((s) => selectedIds.includes(s.id))}
                        onChange={toggleSelectAll}
                        aria-label="Select all on this page"
                        className="w-4 h-4 rounded text-sky-500 cursor-pointer accent-sky-500"
                      />
                    </th>
                    <th className="px-5 py-3 whitespace-nowrap">Invoice #</th>
                    <th className="px-5 py-3 whitespace-nowrap">Date</th>
                    <th className="px-5 py-3 whitespace-nowrap">Customer</th>
                    <th className="px-5 py-3 whitespace-nowrap">Customer Phone</th>
                    <th className="px-5 py-3 whitespace-nowrap">Sold Products & IMEIs</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Tax Status</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Payment</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Total Amount</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {sales.map((sale) => {
                    const isSelected = selectedIds.includes(sale.id);
                    const items = sale.items || [];
                    const firstItem = items[0] || {};
                    const remainingItemsCount = Math.max(0, items.length - 1);

                    return (
                      <tr
                        key={sale.id}
                        onClick={() => handleOpenPrint(sale)}
                        className={`hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer ${
                          isSelected ? 'bg-sky-500/10' : ''
                        }`}
                      >
                        {/* 1. Checkbox */}
                        <td
                          className="w-10 px-4 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(sale.id)}
                            aria-label={`Select invoice #${sale.invoice_no_seq || sale.invoice_number}`}
                            className="w-4 h-4 rounded text-sky-500 cursor-pointer accent-sky-500"
                          />
                        </td>

                        {/* 2. Invoice Number */}
                        <td className="px-5 py-3.5 font-mono font-bold text-sky-400 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>#{sale.invoice_no_seq || sale.invoice_number}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 border border-sky-500/20 text-sky-400">
                              BILL
                            </span>
                          </div>
                        </td>

                        {/* 3. Date */}
                        <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] whitespace-nowrap font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--spatial-text-muted)]" />
                            <span>{formatInvoiceDate(sale.invoice_date || sale.created_at)}</span>
                          </div>
                        </td>

                        {/* 4. Customer */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[var(--spatial-text-title)]">
                              {sale.customer_name || 'Walk-in Customer'}
                            </span>
                          </div>
                          {sale.place_of_supply && (
                            <div className="text-[10px] text-[var(--spatial-text-muted)] mt-0.5">
                              {sale.place_of_supply}
                            </div>
                          )}
                        </td>

                        {/* 5. Customer Phone */}
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-[11px] text-[var(--spatial-text-body)]">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-[var(--spatial-text-muted)]" />
                            <span>{sale.customer_phone || '—'}</span>
                          </div>
                        </td>

                        {/* 6. Sold Products, IMEI, & Warranty badges */}
                        <td className="px-5 py-3.5 max-w-md">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-[var(--spatial-text-title)] truncate">
                                {firstItem.name || firstItem.item_name || 'Item'}
                              </span>
                              {firstItem.imei && (
                                <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-sky-300 border border-sky-500/30">
                                  IMEI: {firstItem.imei}
                                </span>
                              )}
                              {firstItem.warranty && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  {firstItem.warranty}
                                </span>
                              )}
                            </div>

                            {remainingItemsCount > 0 && (
                              <div className="text-[10px] text-sky-400 font-medium">
                                + {remainingItemsCount} more item{remainingItemsCount > 1 ? 's' : ''} (
                                {items.slice(1).map((it) => it.name || it.item_name).join(', ')})
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 7. Tax Status Badge */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sale.gst_enabled
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}
                          >
                            {sale.gst_enabled
                              ? sale.gst_type === 'CGST_SGST'
                                ? 'CGST+SGST 18%'
                                : 'IGST 18%'
                              : 'Retail / Non-GST'}
                          </span>
                        </td>

                        {/* 8. Payment Mode Badge */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            {sale.payment_mode || 'CASH'}
                          </span>
                        </td>

                        {/* 9. Total Amount */}
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-sm text-[var(--spatial-text-title)] whitespace-nowrap">
                          {formatIndianCurrency(sale.total_amount, true)}
                        </td>

                        {/* 10. Actions */}
                        <td
                          className="px-5 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Download PDF Invoice */}
                            <button
                              type="button"
                              onClick={(e) => handleDownloadPdf(e, sale)}
                              className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-all cursor-pointer"
                              title="Download Real Invoice PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* View / Print Bill Modal */}
                            <button
                              type="button"
                              onClick={() => handleOpenPrint(sale)}
                              className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 border border-transparent hover:border-sky-500/20 transition-all cursor-pointer"
                              title="View & Print Same to Same Bill"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Send Real Invoice PDF directly to Customer */}
                            <button
                              type="button"
                              onClick={(e) => handleShareWhatsApp(e, sale)}
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all cursor-pointer"
                              title="Send Real Invoice PDF Directly to Customer Number"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            {/* Delete Bill */}
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, sale)}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                              title="Delete Sales Bill"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (Exact matching JobList.jsx) */}
            <div className="p-4 border-t border-[var(--spatial-border)]">
              <SpatialPagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          </div>
        )}
      </Card>

      {/* ===================================================================== */}
      {/* SAME TO SAME PRINT / PREVIEW MODAL                                   */}
      {/* ===================================================================== */}
      {isPrintModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative max-w-4xl w-full my-8 animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-rose-400 flex items-center gap-1.5 text-xs font-bold cursor-pointer print:hidden transition-colors"
            >
              <X className="w-4 h-4" /> Close
            </button>
            <SameToSameBillPrintable
              sale={selectedSale}
              shop={shopProfile}
              isPreview={false}
              onPrint={() => window.print()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
