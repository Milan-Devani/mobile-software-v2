import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Clock,
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
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useDebounce } from '../../hooks/useDebounce';
import { Card, LoadingSpinner, EmptyState, TableSkeleton } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { BulkActionBar } from '../../components/common/BulkActionBar';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { SpatialDateFilter } from '../../components/common/SpatialDateFilter';
import { salesService } from '../../services/salesService';
import { settingsService } from '../../services/settingsService';
import { SameToSameBillPrintable } from '../../components/sales/SameToSameBillPrintable';
import {
  formatIndianCurrency,
  formatInvoiceDate,
  cleanWarrantyText,
  calculatePendingWarranty,
} from '../../utils/billFormatters';

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

  // Lock body scroll and listen for Escape when invoice preview modal is open
  useEffect(() => {
    if (isPrintModalOpen) {
      document.body.classList.add('print-modal-active');
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setIsPrintModalOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.classList.remove('print-modal-active');
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isPrintModalOpen]);

  // URL query state
  const currentStatus = searchParams.get('status') || 'ALL';
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('sortBy') || 'created_at';
  const currentDir = searchParams.get('sortDir') || 'desc';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = parseInt(searchParams.get('pageSize') || '15', 10);
  const currentDatePreset = searchParams.get('datePreset') || 'ALL';
  const currentStartDate = searchParams.get('startDate') || '';
  const currentEndDate = searchParams.get('endDate') || '';

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
      if (currentStartDate) {
        params.startDate = currentStartDate;
      }
      if (currentEndDate) {
        params.endDate = currentEndDate;
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
  }, [currentStatus, currentSearch, currentSort, currentDir, page, pageSize, currentStartDate, currentEndDate]);

  const handleDateFilterChange = ({ preset, startDate, endDate }) => {
    const params = new URLSearchParams(searchParams);
    if (!preset || preset === 'ALL') {
      params.delete('datePreset');
      params.delete('startDate');
      params.delete('endDate');
    } else {
      params.set('datePreset', preset);
      if (startDate) params.set('startDate', startDate);
      else params.delete('startDate');
      if (endDate) params.set('endDate', endDate);
      else params.delete('endDate');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  useEffect(() => {
    settingsService
      .getSettings()
      .then((res) => {
        const shop = res?.shop || res?.data?.shop;
        if (shop) {
          setShopProfile(shop);
        }
      })
      .catch(() => { });
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
          <h1 className="text-2xl sm:text-[28px] font-semibold text-[var(--spatial-text-title)] tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-[#0a84ff] border border-blue-500/20 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            Sales & Quick Billing
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-1 font-normal">
            Browse, search, and manage all retail customer bills and GST tax invoices for phones, parts, and accessories
          </p>
        </div>

        <Button icon={Plus} onClick={() => navigate('/sales/new')}>
          Generate New Bill
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-[#0a84ff] border border-blue-500/20 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">
              Total Bills Generated
            </div>
            <div className="text-2xl font-semibold tracking-tight text-[var(--spatial-text-title)] tabular-nums mt-0.5">
              {total}
            </div>
          </div>
        </div>

        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">
              Total Invoiced Value
            </div>
            <div className="text-2xl font-semibold tracking-tight text-[var(--spatial-text-title)] tabular-nums mt-0.5">
              {formatIndianCurrency(totalSalesRevenue, true)}
            </div>
          </div>
        </div>

        <div className="spatial-card spatial-card-hover p-4 sm:p-5 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">
              GST Tax Tracked
            </div>
            <div className="text-2xl font-semibold tracking-tight text-[var(--spatial-text-title)] tabular-nums mt-0.5">
              {formatIndianCurrency(totalTaxCollected, true)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="spatial-card relative z-20 p-3.5 sm:p-4 rounded-2xl space-y-3">
        {/* Status Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--spatial-border)] no-scrollbar">
          {STATUS_TABS.map((tab) => {
            const active = currentStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStatusChange(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95 ${active
                  ? 'bg-[#0071e3] text-white shadow-sm font-semibold'
                  : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)]'
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input & Sort Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-0.5">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by customer name, phone, bill #, IMEI..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-xs spatial-input rounded-xl"
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--spatial-text-muted)]">
            {/* Spatial Date Filter */}
            <SpatialDateFilter
              preset={currentDatePreset}
              startDate={currentStartDate}
              endDate={currentEndDate}
              onChange={handleDateFilterChange}
              align="right"
            />

            <div className="flex items-center gap-1.5">
              <span className="shrink-0 font-medium">Sort by:</span>
              <div className="w-36 sm:w-40">
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
      </div>

      {/* Bulk Action Bar (when rows are selected) */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        deleteLabel={`Delete (${selectedIds.length})`}
      />

      {/* Main Bills Table Card */}
      <Card
        title={`Matching Sales Bills (${total})`}
        subtitle={`Showing page ${page} of ${Math.max(1, Math.ceil(total / pageSize))}`}
        bodyClassName="p-0"
      >
        {loading ? (
          <TableSkeleton rows={7} columns={11} showHeader={false} showPagination={false} />
        ) : sales.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No sales bills recorded"
            description="No sales match your search or filter criteria. Generate your first retail bill or tax invoice."
            actionLabel="Generate First Bill"
            onAction={() => navigate('/sales/new')}
          />
        ) : (
          <div className="spatial-tab-pane">
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1320px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-medium text-[11px] tracking-wider whitespace-nowrap">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={sales.length > 0 && sales.every((s) => selectedIds.includes(s.id))}
                        onChange={toggleSelectAll}
                        aria-label="Select all on this page"
                        className="w-4 h-4 rounded text-[#0071e3] cursor-pointer accent-[#0071e3]"
                      />
                    </th>
                    <th className="px-5 py-3 whitespace-nowrap">Invoice #</th>
                    <th className="px-5 py-3 whitespace-nowrap">Date</th>
                    <th className="px-5 py-3 whitespace-nowrap">Customer</th>
                    <th className="px-5 py-3 whitespace-nowrap">Customer Phone</th>
                    <th className="px-5 py-3 whitespace-nowrap">Sold Products</th>
                    <th className="px-5 py-3 whitespace-nowrap">Warranty Status</th>
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
                        className={`hover:bg-[var(--spatial-bg-card-subtle)]/70 transition-colors cursor-pointer ${isSelected ? 'bg-blue-500/[0.08]' : ''
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
                            className="w-4 h-4 rounded text-[#0071e3] cursor-pointer accent-[#0071e3]"
                          />
                        </td>

                        {/* 2. Invoice Number */}
                        <td className="px-5 py-3.5 font-semibold text-[#0071e3] dark:text-[#0a84ff] whitespace-nowrap tracking-tight">
                          <div className="flex items-center gap-1.5">
                            <span>#{sale.invoice_no_seq || sale.invoice_number}</span>
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-500/10 border border-blue-500/20 text-[#0071e3] dark:text-[#0a84ff]">
                              BILL
                            </span>
                          </div>
                        </td>

                        {/* 3. Date */}
                        <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] whitespace-nowrap tabular-nums text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--spatial-text-muted)]" />
                            <span>{formatInvoiceDate(sale.invoice_date || sale.created_at)}</span>
                          </div>
                        </td>

                        {/* 4. Customer */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--spatial-text-title)]">
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
                        <td className="px-5 py-3.5 whitespace-nowrap tabular-nums text-[11px] text-[var(--spatial-text-body)]">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-[var(--spatial-text-muted)]" />
                            <span>{sale.customer_phone || '—'}</span>
                          </div>
                        </td>

                        {/* 6. Sold Products (IMEI removed) */}
                        <td className="px-5 py-3.5 max-w-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[var(--spatial-text-title)] truncate">
                                {firstItem.name || firstItem.item_name || 'Item'}
                              </span>
                            </div>

                            {remainingItemsCount > 0 && (
                              <div className="text-[10px] text-[#0071e3] dark:text-[#0a84ff] font-medium">
                                + {remainingItemsCount} more item{remainingItemsCount > 1 ? 's' : ''} (
                                {items.slice(1).map((it) => it.name || it.item_name).join(', ')})
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 7. Warranty StatusPending Warranty (Separate Column) */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {(() => {
                            const warrantyStr = firstItem.warranty;
                            const info = calculatePendingWarranty(warrantyStr, sale.invoice_date || sale.created_at);

                            if (info.status === 'NO_WARRANTY') {
                              return (
                                <span className="text-[11px] text-[var(--spatial-text-muted)] font-normal">
                                  No Warranty
                                </span>
                              );
                            }

                            if (info.status === 'EXPIRED') {
                              return (
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20 w-fit">
                                    <Clock className="w-3 h-3 text-rose-500 shrink-0" />
                                    Expired
                                  </span>
                                  <span className="text-[10px] text-[var(--spatial-text-muted)]">
                                    Total {cleanWarrantyText(warrantyStr)} • Ended {formatInvoiceDate(info.expiryDate)}
                                  </span>
                                </div>
                              );
                            }

                            const isNearExpiry = info.daysLeft <= 15;
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit ${isNearExpiry
                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    }`}
                                >
                                  <ShieldCheck className="w-3 h-3 shrink-0" />
                                  {info.daysLeft} {info.daysLeft === 1 ? 'Day' : 'Days'} Left
                                </span>
                                <span className="text-[10px] text-[var(--spatial-text-muted)]">
                                  Total {cleanWarrantyText(warrantyStr)} • Till {formatInvoiceDate(info.expiryDate)}
                                </span>
                              </div>
                            );
                          })()}
                        </td>

                        {/* 8. Tax Status Badge */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sale.gst_enabled
                              ? 'bg-blue-500/10 text-[#0071e3] dark:text-[#0a84ff] border border-blue-500/20'
                              : 'bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-muted)] border border-[var(--spatial-border)]'
                              }`}
                          >
                            {sale.gst_enabled
                              ? sale.gst_type === 'CGST_SGST'
                                ? 'CGST+SGST 18%'
                                : 'IGST 18%'
                              : 'Retail / Non-GST'}
                          </span>
                        </td>

                        {/* 9. Payment Mode Badge */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            {sale.payment_mode || 'CASH'}
                          </span>
                        </td>

                        {/* 10. Total Amount */}
                        <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-sm text-[var(--spatial-text-title)] whitespace-nowrap">
                          {formatIndianCurrency(sale.total_amount, true)}
                        </td>

                        {/* 11. Actions */}
                        <td
                          className="px-5 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Download PDF Invoice */}
                            <button
                              type="button"
                              onClick={(e) => handleDownloadPdf(e, sale)}
                              className="p-1.5 rounded-lg text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer active:scale-95"
                              title="Download Real Invoice PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* View / Print Bill Modal */}
                            <button
                              type="button"
                              onClick={() => handleOpenPrint(sale)}
                              className="p-1.5 rounded-lg text-[#0071e3] dark:text-[#0a84ff] hover:bg-blue-500/10 transition-all cursor-pointer active:scale-95"
                              title="View & Print Same to Same Bill"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Send Real Invoice PDF directly to Customer */}
                            <button
                              type="button"
                              onClick={(e) => handleShareWhatsApp(e, sale)}
                              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer active:scale-95"
                              title="Send Real Invoice PDF Directly to Customer Number"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            {/* Delete Bill */}
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, sale)}
                              className="p-1.5 rounded-lg text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer active:scale-95"
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

            {/* Pagination Controls */}
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
      {/* SAME TO SAME PRINT / PREVIEW MODAL PORTAL                             */}
      {/* ===================================================================== */}
      {isPrintModalOpen && selectedSale && createPortal(
        <div
          id="print-sale-invoice-portal"
          className="print-modal-portal fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static"
        >
          {/* Click outside backdrop */}
          <div
            className="fixed inset-0 bg-transparent no-print cursor-pointer"
            onClick={() => setIsPrintModalOpen(false)}
          />

          <div
            className="print-modal-card relative w-full max-w-5xl my-4 sm:my-8 bg-white rounded-2xl shadow-2xl border border-slate-300 z-10 overflow-hidden flex flex-col print:border-none print:shadow-none print:m-0 print:p-0 print:max-w-none"
            style={{ colorScheme: 'light', backgroundColor: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="no-print flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    {shopProfile?.name || 'Mobotech mobile care'} — Sales & Quick Billing
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Invoice: #{selectedSale.invoice_no_seq || selectedSale.invoice_number || '26'} • Customer: {selectedSale.customer_name || 'Walk-in Customer'} • Date: {formatInvoiceDate(selectedSale.invoice_date || new Date())}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              >
                <span>✕ Close</span>
              </button>
            </div>

            {/* Document Content */}
            <div
              className="p-3 sm:p-6 overflow-y-auto max-h-[82vh] bg-slate-100 print:max-h-none print:overflow-visible print:p-0 print:bg-white flex flex-col items-center"
              style={{ colorScheme: 'light', backgroundColor: '#f1f5f9' }}
            >
              <SameToSameBillPrintable
                sale={selectedSale}
                shop={shopProfile}
                isPreview={false}
                onPrint={() => window.print()}
                onClose={() => setIsPrintModalOpen(false)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
