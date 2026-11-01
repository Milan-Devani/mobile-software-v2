import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Smartphone,
  Plus,
  Trash2,
  Building2,
  Save,
  ArrowLeft,
  Calendar,
  Search,
  X,
  Eye,
  Phone,
  Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorNavTabs } from '../../components/vendors/VendorNavTabs';
import { Card, FormSkeleton, EmptyState, TableSkeleton } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { SpatialDateFilter } from '../../components/common/SpatialDateFilter';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { VendorReceiptPrintable } from '../../components/vendors/VendorReceiptPrintable';
import { VendorModal } from '../../components/vendors/VendorModal';
import { vendorService } from '../../services/vendorService';
import { settingsService } from '../../services/settingsService';
import { formatIndianCurrency, formatInvoiceDate } from '../../utils/billFormatters';
import { useDebounce } from '../../hooks/useDebounce';
import { SpatialDrawer } from '../../components/common/SpatialDrawer';

const STATUS_META = {
  PENDING: {
    label: 'Pending / In Queue',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  IN_REPAIR: {
    label: 'In Repair',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  WAITING_PARTS: {
    label: 'Waiting Parts',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
  },
  REPAIR_COMPLETED: {
    label: 'Repair Completed',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  READY_FOR_RETURN: {
    label: 'Ready for Collection',
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/20',
  },
  RETURNED: {
    label: 'Returned to Shop',
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
  },
  NOT_REPAIRABLE: {
    label: 'Not Repairable',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
  },
};

export const VendorReceiveMobiles = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedVendorId = searchParams.get('vendorId') || '';

  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);

  // Vendor & Inward Meta for Drawer Form
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState(preselectedVendorId);
  const [txnDate, setTxnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [shopProfile, setShopProfile] = useState(null);

  // Mobile Handsets from other repair shop for Drawer Form
  // Exactly 6 fields: Brand, Model, IMEI / Serial Number, Customer Name (Optional), Fault / Repair Problem, Physical Condition
  const [b2bMobiles, setB2bMobiles] = useState([
    {
      id: 'b2b-1',
      brand: '',
      model: '',
      imei: '',
      customer_name: '',
      repair_problem: '',
      condition: 'Normal Wear',
    },
  ]);

  // Saved result modal for print / WhatsApp
  const [savedResult, setSavedResult] = useState(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');

  // -------------------------------------------------------------
  // TABLE STATE: Received Mobiles (B2B Inward)
  // -------------------------------------------------------------
  const [receivedMobiles, setReceivedMobiles] = useState([]);
  const [totalReceived, setTotalReceived] = useState(0);
  const [receivedLoading, setReceivedLoading] = useState(false);
  const [selectedMobileIds, setSelectedMobileIds] = useState([]);

  // Table Filters
  const [search, setSearch] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const debouncedSearch = useDebounce(search, 400);

  // Initial load: vendors and shop profile
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingInit(true);
        const [vendorsRes, settingsRes] = await Promise.allSettled([
          vendorService.getVendors({ limit: 150, status: 'ACTIVE' }),
          settingsService.getSettings(),
        ]);

        if (vendorsRes.status === 'fulfilled') {
          const list = vendorsRes.value?.data?.vendors || vendorsRes.value?.vendors || [];
          if (list.length > 0) {
            setVendors(list);
            if (!vendorId) {
              setVendorId(list[0].id);
            }
          }
        }
        if (settingsRes.status === 'fulfilled') {
          const shop = settingsRes.value?.data?.shop || settingsRes.value?.shop;
          if (shop) setShopProfile(shop);
        }
      } catch (err) {
        console.error('Failed to init receive page:', err);
      } finally {
        setLoadingInit(false);
      }
    };

    init();
  }, []);

  // Fetch received mobiles with filters and pagination
  const fetchReceivedMobiles = useCallback(async () => {
    try {
      setReceivedLoading(true);
      const params = {
        flowType: 'VENDOR_JOB_INWARD',
        limit: pageSize,
        offset: (page - 1) * pageSize,
        sortBy: 'created_at',
        sortDir: 'desc',
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedVendorFilter && selectedVendorFilter !== 'ALL') {
        params.vendorId = selectedVendorFilter;
      }
      if (selectedStatusFilter && selectedStatusFilter !== 'ALL') {
        params.status = selectedStatusFilter;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await vendorService.getVendorMobiles(params);
      const list = res?.data?.mobiles || res?.mobiles || [];
      const totalCount =
        res?.data?.total !== undefined
          ? res.data.total
          : res?.total !== undefined
            ? res.total
            : list.length;

      setReceivedMobiles(list);
      setTotalReceived(totalCount);
    } catch (err) {
      console.error('Failed to load received mobiles:', err);
      toast.error('Failed to load received mobiles');
    } finally {
      setReceivedLoading(false);
    }
  }, [
    debouncedSearch,
    selectedVendorFilter,
    selectedStatusFilter,
    startDate,
    endDate,
    page,
    pageSize,
  ]);

  // Refetch table data when filters, pagination, or debounced search change
  useEffect(() => {
    setSelectedMobileIds([]);
    fetchReceivedMobiles();
  }, [fetchReceivedMobiles]);

  const activeVendor = vendors.find((v) => v.id === vendorId);

  // -------------------------------------------------------------
  // Checkbox & Row Selection
  // -------------------------------------------------------------
  const isAllSelected =
    receivedMobiles.length > 0 && selectedMobileIds.length === receivedMobiles.length;

  const toggleSelectMobile = (id) => {
    setSelectedMobileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMobileIds([]);
    } else {
      setSelectedMobileIds(receivedMobiles.map((m) => m.id));
    }
  };

  // -------------------------------------------------------------
  // Delete Actions
  // -------------------------------------------------------------
  const handleDeleteSelected = async () => {
    if (selectedMobileIds.length === 0) return;
    const count = selectedMobileIds.length;
    const isAll = count === receivedMobiles.length;
    const confirmMessage = isAll
      ? `Delete ALL ${count} selected inward handset record(s)? This action cannot be undone.`
      : `Delete ${count} selected inward handset record(s)? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setReceivedLoading(true);
      const res = await vendorService.deleteVendorMobiles(selectedMobileIds);
      toast.success(res?.message || `${count} inward mobile record(s) deleted.`);
      setSelectedMobileIds([]);
      if (receivedMobiles.length === count && page > 1) {
        setPage((curr) => curr - 1);
      }
      await fetchReceivedMobiles();
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Failed to delete handsets'
      );
    } finally {
      setReceivedLoading(false);
    }
  };

  const handleDeleteSingle = async (mob, e) => {
    e?.stopPropagation();
    if (
      !window.confirm(
        `Delete inward handset "${mob.brand} ${mob.model}" (IMEI: ${mob.imei || 'N/A'})? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setReceivedLoading(true);
      const res = await vendorService.deleteVendorMobiles([mob.id]);
      toast.success(res?.message || 'Handset record deleted.');
      setSelectedMobileIds((prev) => prev.filter((id) => id !== mob.id));
      await fetchReceivedMobiles();
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Failed to delete handset'
      );
    } finally {
      setReceivedLoading(false);
    }
  };

  const handleViewReceipt = async (mob, e) => {
    e?.stopPropagation();
    const txnId = mob.send_txn_id || mob.return_txn_id;
    if (!txnId) {
      toast.error('No receipt record linked to this mobile.');
      return;
    }
    try {
      const res = await vendorService.getTransactionById(txnId);
      const txn = res?.data?.transaction || res?.data || res?.transaction;
      if (txn) {
        setSavedResult(txn);
      } else {
        toast.error('Receipt details not found');
      }
    } catch (err) {
      toast.error('Failed to load receipt details');
    }
  };

  // -------------------------------------------------------------
  // Handset Row Management for Intake Drawer Form
  // -------------------------------------------------------------
  const handleAddB2bRow = () => {
    setB2bMobiles((prev) => [
      ...prev,
      {
        id: `b2b-${Date.now()}`,
        brand: '',
        model: '',
        imei: '',
        customer_name: '',
        repair_problem: '',
        condition: 'Normal Wear',
      },
    ]);
  };

  const handleUpdateB2bMobile = (index, field, value) => {
    setB2bMobiles((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveB2bRow = (index) => {
    if (b2bMobiles.length <= 1) {
      toast.error('At least one mobile handset is required.');
      return;
    }
    setB2bMobiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      toast.error('Please select the origin repair shop / vendor.');
      return;
    }

    const validMobiles = b2bMobiles.filter(
      (m) => m.brand.trim() || m.model.trim() || m.repair_problem.trim() || m.imei.trim()
    );

    if (validMobiles.length === 0) {
      toast.error('Please enter details for at least one mobile.');
      return;
    }

    // Validate required fields
    for (let i = 0; i < validMobiles.length; i++) {
      const m = validMobiles[i];
      if (!m.brand.trim() || !m.model.trim()) {
        toast.error(`Mobile #${i + 1}: Brand and Model are required.`);
        return;
      }
      if (!m.repair_problem.trim()) {
        toast.error(`Mobile #${i + 1}: Fault / Repair Problem is required.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await vendorService.recordVendorJobInward({
        vendor_id: vendorId,
        txn_date: txnDate,
        notes: paidAmount > 0
          ? `${notes}${notes ? '\n' : ''}Advance received: ₹${paidAmount} via ${paymentMode}.`
          : notes,
        mobiles: validMobiles.map((m) => ({
          brand: m.brand.trim(),
          model: m.model.trim(),
          imei: m.imei.trim(),
          customer_name: m.customer_name.trim(),
          repair_problem: m.repair_problem.trim(),
          condition: m.condition.trim() || 'Normal Wear',
          accessories: 'Device Only',
          estimated_cost: 0,
        })),
      });

      if (res.success) {
        toast.success(`Logged ${validMobiles.length} handset(s) from other shop under #${res.data.txn_number}`);
        setSavedResult(res.data);
        setIsDrawerOpen(false);
        setPaidAmount('');
        await fetchReceivedMobiles();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to log inward client repairs from other shop');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit) {
    return <FormSkeleton fields={5} />;
  }

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/vendors')}
            className="p-2 rounded-xl text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] transition-all cursor-pointer active:scale-95"
            title="Back to vendor dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-semibold text-[var(--spatial-text-title)] tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              Receive Mobiles From Other Shops
            </h1>
            <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5 font-normal">
              Record handsets that other mobile repair shops could not fix and sent to our shop for repair
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsDrawerOpen(true)}
          >
            Receive Mobile
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <VendorNavTabs activeTab="/vendors/receive" />

      {/* Filter & Search Bar */}
      <div className="spatial-card p-4 rounded-2xl space-y-3 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Brand, Model, IMEI, Customer, Origin..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-11 pl-10 pr-9 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Origin Shop / Vendor Filter */}
          <div>
            <SpatialSelect
              value={selectedVendorFilter}
              onChange={(val) => {
                setSelectedVendorFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Origin Repair Shops' },
                ...vendors.map((v) => ({
                  value: v.id,
                  label: `${v.name} (${v.shop_name || 'Repair Shop'})`,
                  badge: v.vendor_code,
                })),
              ]}
              searchable
            />
          </div>

          {/* Status Filter */}
          <div>
            <SpatialSelect
              value={selectedStatusFilter}
              onChange={(val) => {
                setSelectedStatusFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Repair Statuses' },
                { value: 'PENDING', label: 'Pending / In Queue' },
                { value: 'IN_REPAIR', label: 'In Repair' },
                { value: 'WAITING_PARTS', label: 'Waiting for Parts' },
                { value: 'REPAIR_COMPLETED', label: 'Repair Completed' },
                { value: 'READY_FOR_RETURN', label: 'Ready for Collection' },
                { value: 'RETURNED', label: 'Returned to Shop' },
                { value: 'NOT_REPAIRABLE', label: 'Not Repairable' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              searchable={false}
            />
          </div>

          {/* Date Filter */}
          <div>
            <SpatialDateFilter
              preset={datePreset}
              startDate={startDate}
              endDate={endDate}
              onChange={({ preset, startDate: start, endDate: end }) => {
                setDatePreset(preset);
                setStartDate(start);
                setEndDate(end);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Received Mobiles Table Card */}
      <Card
        title={`Received Mobiles From Other Shops (${totalReceived})`}
        subtitle={`Showing page ${page} of ${Math.max(1, Math.ceil(totalReceived / pageSize))}`}
        action={
          <div className="flex items-center gap-2">
            {isAllSelected && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={handleDeleteSelected}
              >
                Delete All ({selectedMobileIds.length})
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsDrawerOpen(true)}
            >
              Receive Mobile
            </Button>
          </div>
        }
        bodyClassName="p-0"
      >
        {receivedLoading ? (
          <TableSkeleton rows={7} columns={7} showHeader={false} showPagination={false} />
        ) : receivedMobiles.length === 0 ? (
          <EmptyState
            icon={Smartphone}
            title="No received mobiles found"
            description="You have not received any handsets from other shops matching these filters."
            actionLabel="Receive Mobile"
            onAction={() => setIsDrawerOpen(true)}
          />
        ) : (
          <div className="spatial-tab-pane">
            {/* Row Selection Notification Banner */}
            {selectedMobileIds.length > 0 && (
              <div className="mx-4 mt-3 mb-1 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                <span className="font-semibold">
                  {selectedMobileIds.length} of {receivedMobiles.length} handset(s) selected
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="inline-flex items-center gap-1.5 font-bold text-rose-500 hover:text-rose-400 cursor-pointer text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                    title="Delete all selected inward handset records"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isAllSelected
                      ? `Delete All (${selectedMobileIds.length})`
                      : `Delete Selected (${selectedMobileIds.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMobileIds([])}
                    className="font-bold hover:underline cursor-pointer text-xs"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1050px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    {/* Checkbox Header */}
                    <th className="w-12 px-4 py-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                        title="Select All Mobiles"
                      />
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">Handset & Model</th>
                    <th className="px-4 py-3 whitespace-nowrap">Origin Repair Shop</th>
                    <th className="px-4 py-3 whitespace-nowrap">Problem & Condition</th>
                    <th className="px-4 py-3 whitespace-nowrap">Received Date & Receipt #</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {receivedMobiles.map((mob) => {
                    const statusMeta = STATUS_META[mob.current_status] || {
                      label: mob.current_status || 'Pending',
                      bg: 'bg-slate-500/10',
                      text: 'text-slate-400',
                      border: 'border-slate-500/20',
                    };
                    const isSelected = selectedMobileIds.includes(mob.id);

                    return (
                      <tr
                        key={mob.id}
                        onClick={() => toggleSelectMobile(mob.id)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
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
                            onChange={() => toggleSelectMobile(mob.id)}
                            className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                          />
                        </td>

                        {/* Handset & Model */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-[var(--spatial-text-title)] text-xs">
                            {mob.brand} {mob.model}
                          </div>
                          {mob.imei && (
                            <div className="font-mono text-[11px] text-sky-400 mt-0.5">
                              IMEI: {mob.imei}
                            </div>
                          )}
                          {mob.customer_name && (
                            <div className="text-[11px] text-[var(--spatial-text-muted)] mt-0.5">
                              Client: {mob.customer_name}
                            </div>
                          )}
                        </td>

                        {/* Origin Repair Shop */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-[var(--spatial-text-title)] text-xs">
                            {mob.vendor?.name || 'Origin Repair Shop'}
                          </div>
                          {mob.vendor?.shop_name && (
                            <div className="text-[11px] text-[var(--spatial-text-muted)] mt-0.5">
                              {mob.vendor.shop_name}
                            </div>
                          )}
                          {mob.vendor?.mobile && (
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={`tel:${mob.vendor.mobile}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] text-apple-blue hover:underline flex items-center gap-1 font-mono"
                              >
                                <Phone className="w-3 h-3" />
                                {mob.vendor.mobile}
                              </a>
                            </div>
                          )}
                        </td>

                        {/* Problem & Condition */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <div className="text-xs font-semibold text-amber-500">
                            {mob.repair_problem}
                          </div>
                          {mob.condition && (
                            <div
                              className="text-[11px] text-[var(--spatial-text-muted)] mt-0.5 truncate"
                              title={mob.condition}
                            >
                              Condition: {mob.condition}
                            </div>
                          )}
                        </td>

                        {/* Received Date & Receipt # */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-xs text-[var(--spatial-text-title)]">
                            {formatInvoiceDate(mob.received_date || mob.created_at)}
                          </div>
                          {mob.send_txn?.txn_number && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold inline-block mt-1">
                              #{mob.send_txn.txn_number}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="px-4 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {mob.send_txn_id && (
                              <button
                                type="button"
                                onClick={(e) => handleViewReceipt(mob, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all cursor-pointer"
                                title="View Inward Intake Receipt"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSingle(mob, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                              title="Delete this inward mobile record"
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
            <div className="p-4 border-t border-[var(--spatial-border)]">
              <SpatialPagination
                currentPage={page}
                totalItems={totalReceived}
                pageSize={pageSize}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* =================================================================== */}
      {/* RIGHT SIDEBAR (DRAWER): INWARD HANDSET INTAKE FORM                 */}
      {/* =================================================================== */}
      <SpatialDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Receive Mobiles From Other Shops"
        subtitle="Register an inward repair intake"
        width="wide"
      >
        <form onSubmit={handleSubmit} className="space-y-6 p-1">
          {/* SECTION 1: ORIGIN REPAIR SHOP & INWARD DATE */}
          <Card
            title="1. Origin Repair Shop & Inward Date"
            subtitle="Select the other mobile repair shop that brought or sent these devices to us"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase">
                    Origin Repair Shop / Vendor <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddVendorOpen(true)}
                    className="text-xs font-semibold text-sky-500 hover:text-sky-400 cursor-pointer"
                  >
                    + Create Vendor
                  </button>
                </div>
                <SpatialSelect
                  value={vendorId}
                  onChange={(val) => setVendorId(val)}
                  options={vendors.map((v) => ({
                    value: v.id,
                    label: `${v.name} (${v.shop_name || 'Repair Shop'})`,
                    subtitle: `Phone: ${v.mobile} • Code: ${v.vendor_code}`,
                    badge: v.vendor_code,
                  }))}
                  placeholder="-- Select Origin Repair Shop --"
                  searchable
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Received Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={txnDate}
                  onChange={(e) => setTxnDate(e.target.value)}
                  className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {activeVendor && (
              <div className="mt-4 p-3 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[var(--spatial-text-title)]">{activeVendor.name}</span>
                    <p className="text-[11px] text-[var(--spatial-text-muted)]">
                      {activeVendor.shop_name} • Phone: {activeVendor.mobile} • {activeVendor.address}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[var(--spatial-text-muted)] uppercase block">Current Outstanding</span>
                  <span className="font-mono font-bold text-sm text-[var(--spatial-text-title)]">
                    {formatIndianCurrency(Math.abs(activeVendor.current_balance || 0), true)}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-1">
                    {(activeVendor.current_balance || 0) > 0 ? '(Payable)' : '(Receivable)'}
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* SECTION 2: MULTIPLE MOBILE HANDSET ENTRY (6 CLEAN FIELDS) */}
          <Card
            title="2. Multiple Mobile Handset Entry"
            subtitle="Enter handsets other repair shops could not fix and sent to us for repair"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={handleAddB2bRow}
              >
                Add Another Mobile
              </Button>
            }
          >
            <div className="space-y-4">
              {b2bMobiles.map((mob, idx) => (
                <div
                  key={mob.id || idx}
                  className="p-4 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] hover:border-emerald-500/30 transition-all space-y-3 relative group"
                >
                  {/* Row Header with Item Number & Remove */}
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--spatial-border)]">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold font-mono text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider">
                        Mobile #{idx + 1}
                      </span>
                    </div>

                    {b2bMobiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveB2bRow(idx)}
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove this mobile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Row 1: Brand, Model, IMEI / Serial Number, Customer Name (Optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {/* 1. Brand */}
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                        Brand *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Apple, Samsung"
                        value={mob.brand}
                        onChange={(e) => handleUpdateB2bMobile(idx, 'brand', e.target.value)}
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* 2. Model */}
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                        Model *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. iPhone 13 Pro Max"
                        value={mob.model}
                        onChange={(e) => handleUpdateB2bMobile(idx, 'model', e.target.value)}
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* 3. IMEI / Serial Number */}
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                        IMEI / Serial Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 356789123456789"
                        value={mob.imei}
                        onChange={(e) => handleUpdateB2bMobile(idx, 'imei', e.target.value)}
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono text-[var(--spatial-text-title)] focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* 4. Customer Name (Optional) */}
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                        Customer Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ronak Panchal"
                        value={mob.customer_name}
                        onChange={(e) => handleUpdateB2bMobile(idx, 'customer_name', e.target.value)}
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Row 2: Fault / Repair Problem, Physical Condition */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 5. Fault / Repair Problem */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                        Fault / Repair Problem *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dead phone, No Audio IC, CPU dry solder, Face ID failure"
                        value={mob.repair_problem}
                        onChange={(e) => handleUpdateB2bMobile(idx, 'repair_problem', e.target.value)}
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-medium text-[var(--spatial-text-title)] focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* 6. Physical Condition */}
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                        Physical Condition
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Normal Wear, Scratches, Back glass broken"
                        value={mob.condition}
                        onChange={(e) => handleUpdateB2bMobile(idx, 'condition', e.target.value)}
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Handset count summary */}
            <div className="mt-4 pt-3 border-t border-[var(--spatial-border)] flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={handleAddB2bRow}
              >
                + Add Another Mobile Handset
              </Button>

              <div className="text-right text-xs">
                <span className="text-[var(--spatial-text-muted)]">Total Handsets in Intake:</span>
                <span className="ml-2 font-mono font-bold text-sm text-emerald-400">
                  {b2bMobiles.length}
                </span>
              </div>
            </div>
          </Card>

          {/* SECTION 3: ADVANCE PAYMENT & SPECIAL INSTRUCTIONS */}
          <Card title="3. Advance Payment & Special Instructions" subtitle="Record an optional advance and any instructions from the origin shop">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Advance Payment (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 px-3 spatial-input rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Payment Mode
                </label>
                <SpatialSelect
                  value={paymentMode}
                  onChange={setPaymentMode}
                  searchable={false}
                  options={[
                    { value: 'CASH', label: 'Cash' },
                    { value: 'UPI', label: 'UPI' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Special Instructions
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for this repair intake"
                  className="w-full h-11 px-3 spatial-input rounded-xl text-xs"
                />
              </div>
            </div>
          </Card>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--spatial-border)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDrawerOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              icon={Save}
              loading={submitting}
            >
              Save & Issue Inward Receipt ({b2bMobiles.length} Mobiles)
            </Button>
          </div>
        </form>
      </SpatialDrawer>

      <VendorModal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        existingVendors={vendors}
        onSuccess={(newVendor) => {
          setVendors((prev) => [newVendor, ...prev.filter((vendor) => vendor.id !== newVendor.id)]);
          setVendorId(newVendor.id);
          setIsAddVendorOpen(false);
        }}
      />

      {/* Result Modal for Print & WhatsApp */}
      {savedResult && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative max-w-4xl w-full my-auto mx-auto">
            <VendorReceiptPrintable
              transaction={savedResult}
              shop={shopProfile}
              onClose={() => {
                setSavedResult(null);
                navigate('/vendors/transactions');
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
