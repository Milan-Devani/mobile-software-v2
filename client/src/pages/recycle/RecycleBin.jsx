import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  RotateCcw,
  Search,
  X,
  AlertTriangle,
  Clock,
  Filter,
  Wrench,
  Receipt,
  Building2,
  Users,
  Package,
  Calendar,
  Smartphone,
  Info,
  ShieldAlert,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, TableSkeleton, EmptyState } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { useDebounce } from '../../hooks/useDebounce';
import { recycleBinService } from '../../services/recycleBinService';
import { formatInvoiceDate } from '../../utils/billFormatters';

const TABS = [
  { id: 'ALL', label: 'All Items', icon: Trash2 },
  { id: 'job', label: 'Repair Jobs', icon: Wrench },
  { id: 'sale', label: 'Sales & Quick Billing', icon: Receipt },
  { id: 'vendor', label: 'Vendor Management', icon: Building2 },
  { id: 'customer', label: 'Customer Directory', icon: Users },
  { id: 'part', label: 'Parts & Inventory', icon: Package },
];

const ENTITY_CONFIG = {
  job: {
    label: 'Repair Job',
    icon: Wrench,
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-500 dark:text-blue-400',
    badgeBorder: 'border-blue-500/20',
  },
  sale: {
    label: 'Sales Invoice',
    icon: Receipt,
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    badgeBorder: 'border-emerald-500/20',
  },
  vendor: {
    label: 'Vendor Partner',
    icon: Building2,
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-600 dark:text-purple-400',
    badgeBorder: 'border-purple-500/20',
  },
  vendor_mobile: {
    label: 'Vendor Handset',
    icon: Smartphone,
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-500 dark:text-indigo-400',
    badgeBorder: 'border-indigo-500/20',
  },
  customer: {
    label: 'Customer',
    icon: Users,
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-600 dark:text-amber-400',
    badgeBorder: 'border-amber-500/20',
  },
  part: {
    label: 'Part & Stock',
    icon: Package,
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-600 dark:text-cyan-400',
    badgeBorder: 'border-cyan-500/20',
  },
};

export const RecycleBin = () => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({
    total: 0,
    jobs: 0,
    sales: 0,
    vendors: 0,
    customers: 0,
    parts: 0,
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const debouncedSearch = useDebounce(search, 350);

  // Fetch Recycle Bin items
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await recycleBinService.getItems({
        type: activeTab,
        search: debouncedSearch.trim(),
      });
      const data = res?.data || {};
      setItems(data.items || []);
      setTotalCount(data.total || 0);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to load recycle bin items:', err);
      toast.error('Failed to load recycle bin records.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch]);

  useEffect(() => {
    setSelectedIds([]);
    setPage(1);
    fetchItems();
  }, [fetchItems]);

  // Selection logic
  const isAllSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Restore single
  const handleRestoreSingle = async (item, e) => {
    e?.stopPropagation();
    if (!window.confirm(`Restore "${item.title}" back to active records?`)) return;

    try {
      setActionLoading(true);
      const res = await recycleBinService.restoreItem(item.id);
      toast.success(res?.message || 'Item restored successfully.');
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
      await fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to restore item.');
    } finally {
      setActionLoading(false);
    }
  };

  // Restore bulk
  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!window.confirm(`Restore ${count} selected item(s) back to their active sections?`)) return;

    try {
      setActionLoading(true);
      const res = await recycleBinService.bulkRestore(selectedIds);
      toast.success(res?.message || `${count} item(s) restored.`);
      setSelectedIds([]);
      await fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to restore items.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete permanently single
  const handleDeletePermanentlySingle = async (item, e) => {
    e?.stopPropagation();
    if (
      !window.confirm(
        `PERMANENTLY DELETE "${item.title}"?\n\nThis record will be permanently erased immediately and CANNOT be recovered.`
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await recycleBinService.permanentlyDelete(item.id);
      toast.success(res?.message || 'Item permanently deleted.');
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
      await fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete permanently.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete permanently bulk
  const handleBulkPermanentlyDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (
      !window.confirm(
        `PERMANENTLY DELETE ${count} SELECTED RECORD(S)?\n\nThese items will be permanently erased and CANNOT be recovered.`
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await recycleBinService.bulkPermanentlyDelete(selectedIds);
      toast.success(res?.message || `${count} item(s) permanently erased.`);
      setSelectedIds([]);
      await fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to permanently delete.');
    } finally {
      setActionLoading(false);
    }
  };

  // Empty Recycle Bin
  const handleEmptyRecycleBin = async () => {
    const targetLabel = activeTab === 'ALL' ? 'ALL items' : `all ${activeTab} records`;
    if (
      !window.confirm(
        `EMPTY RECYCLE BIN (${targetLabel.toUpperCase()})?\n\nAll matching records will be permanently erased immediately. This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await recycleBinService.emptyRecycleBin(activeTab);
      toast.success(res?.message || 'Recycle bin emptied.');
      setSelectedIds([]);
      await fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to empty recycle bin.');
    } finally {
      setActionLoading(false);
    }
  };

  // Pagination slice
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

  // Tab Badge helper
  const getTabCount = (tabId) => {
    switch (tabId) {
      case 'ALL':
        return counts.total;
      case 'job':
        return counts.jobs;
      case 'sale':
        return counts.sales;
      case 'vendor':
        return counts.vendors;
      case 'customer':
        return counts.customers;
      case 'part':
        return counts.parts;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-[var(--spatial-text-title)] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            Recycle Bin
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5 font-normal">
            Safely restore deleted Repair Jobs, Sales Invoices, Vendors, Customers, and Stock. Records are automatically permanently erased after 30 days.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {counts.total > 0 && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={handleEmptyRecycleBin}
              disabled={actionLoading || loading}
            >
              Empty Recycle Bin
            </Button>
          )}
        </div>
      </div>

      {/* 30-Day Retention Policy Notice Banner */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start sm:items-center justify-between gap-3 text-xs text-amber-500 dark:text-amber-400">
        <div className="flex items-center gap-2.5 min-w-0">
          <Clock className="w-4 h-4 shrink-0 text-amber-500 mt-0.5 sm:mt-0" />
          <span className="font-medium">
            <strong>30-Day Auto Purge:</strong> Any record moved to the Recycle Bin stays here for exactly 30 days so you can recover it anytime. After 30 days, it is automatically and permanently purged from the database.
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-[var(--spatial-border)]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = getTabCount(tab.id);
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30 shadow-xs'
                  : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-hover)] border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5 stroke-[2]" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  isActive
                    ? 'bg-rose-500/20 text-rose-500 font-bold'
                    : 'bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-muted)]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter / Search Bar */}
      <div className="spatial-card p-3.5 sm:p-4 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search deleted jobs, invoices, vendors, customers, parts by name, phone, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-9 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all shadow-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <Card
        title={`Deleted Records (${totalCount})`}
        subtitle={
          activeTab === 'ALL'
            ? 'All items currently in the recycle bin'
            : `Showing deleted ${TABS.find((t) => t.id === activeTab)?.label || 'records'}`
        }
        bodyClassName="p-0"
      >
        {loading ? (
          <TableSkeleton rows={7} columns={6} showHeader={false} showPagination={false} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title="Recycle bin is clean and empty"
            description={
              search
                ? `No deleted items matched your search "${search}".`
                : 'There are no deleted records in this category. Whenever you delete jobs, sales, vendors, customers, or parts, they will safely appear here.'
            }
          />
        ) : (
          <div className="spatial-tab-pane">
            {/* Selection Banner */}
            {selectedIds.length > 0 && (
              <div className="mx-4 mt-3 mb-1 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs flex items-center justify-between text-rose-500 animate-in fade-in">
                <span className="font-semibold">
                  {selectedIds.length} of {items.length} item(s) selected
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBulkRestore}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1 font-bold text-emerald-500 hover:text-emerald-400 cursor-pointer text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                    title="Restore selected items"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore Selected ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkPermanentlyDelete}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1 font-bold text-rose-500 hover:text-rose-400 cursor-pointer text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                    title="Permanently delete selected items immediately"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Permanently ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="font-bold hover:underline cursor-pointer text-xs"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    {/* Checkbox Header */}
                    <th className="w-12 px-4 py-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded text-rose-500 accent-rose-500 cursor-pointer"
                        title="Select All Mobiles"
                      />
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">Record & Summary</th>
                    <th className="px-4 py-3 whitespace-nowrap">Original Module</th>
                    <th className="px-4 py-3 whitespace-nowrap">Deleted Date & By</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Auto-Purge In</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {paginatedItems.map((item) => {
                    const cfg = ENTITY_CONFIG[item.entity_type] || {
                      label: item.entity_type || 'Record',
                      icon: Trash2,
                      badgeBg: 'bg-slate-500/10',
                      badgeText: 'text-slate-400',
                      badgeBorder: 'border-slate-500/20',
                    };
                    const Icon = cfg.icon;
                    const isSelected = selectedIds.includes(item.id);

                    // Retention indicator styling
                    const days = item.days_remaining ?? 30;
                    const purgeBadge =
                      days <= 5
                        ? 'bg-rose-500/15 text-rose-500 border-rose-500/30 animate-pulse font-bold'
                        : days <= 15
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 font-medium'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20';

                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleSelectOne(item.id)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-rose-500/10 dark:bg-rose-500/15'
                            : 'hover:bg-[var(--spatial-bg-card-hover)]'
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="w-12 px-4 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(item.id)}
                            className="w-4 h-4 rounded text-rose-500 accent-rose-500 cursor-pointer"
                          />
                        </td>

                        {/* Title & Subtitle */}
                        <td className="px-4 py-3.5 max-w-md">
                          <div className="font-bold text-[var(--spatial-text-title)] text-xs truncate">
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div className="text-[11px] text-[var(--spatial-text-muted)] mt-0.5 truncate">
                              {item.subtitle}
                            </div>
                          )}
                        </td>

                        {/* Original Module Badge */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}
                          >
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Deleted Date & User */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-xs text-[var(--spatial-text-title)] font-mono">
                            {formatInvoiceDate(item.deleted_at)}
                          </div>
                          <div className="text-[11px] text-[var(--spatial-text-muted)] mt-0.5">
                            by {item.deleted_by || 'Staff'}
                          </div>
                        </td>

                        {/* Auto-Purge Remaining */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono border ${purgeBadge}`}
                            title={`Will be permanently removed automatically on ${formatInvoiceDate(item.purge_at)}`}
                          >
                            <Clock className="w-3 h-3" />
                            {days} days left
                          </span>
                        </td>

                        {/* Actions: Restore & Permanent Delete */}
                        <td
                          className="px-4 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleRestoreSingle(item, e)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded-lg text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all font-semibold text-xs flex items-center gap-1 cursor-pointer"
                              title="Restore back to active section"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeletePermanentlySingle(item, e)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                              title="Permanently delete immediately"
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

            {/* Pagination */}
            {items.length > pageSize && (
              <div className="p-4 border-t border-[var(--spatial-border)]">
                <SpatialPagination
                  currentPage={page}
                  totalItems={items.length}
                  pageSize={pageSize}
                  onPageChange={(p) => setPage(p)}
                  onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(1);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
export default RecycleBin;

