import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Eye,
  Pencil,
  Trash2,
  ArrowUpRight,
  IndianRupee,
  X,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { VendorNavTabs } from '../../components/vendors/VendorNavTabs';
import {
  Card,
  LoadingSpinner,
  EmptyState,
  TableSkeleton,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { VendorModal } from '../../components/vendors/VendorModal';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { SpatialDateFilter } from '../../components/common/SpatialDateFilter';
import { vendorService } from '../../services/vendorService';
import { formatIndianCurrency } from '../../utils/billFormatters';
import { useDebounce } from '../../hooks/useDebounce';

export const VendorList = () => {
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE' | 'WITH_MOBILES' | 'WITH_BALANCE'
  const [datePreset, setDatePreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const debouncedSearch = useDebounce(search, 350);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedVendors, setSelectedVendors] = useState([]);

  // Fetch vendors & overview metrics
  const fetchVendorsData = async () => {
    try {
      setLoading(true);

      const apiStatus =
        statusFilter === 'ACTIVE' || statusFilter === 'INACTIVE'
          ? statusFilter
          : 'ALL';

      const [vendorsRes, statsRes] = await Promise.allSettled([
        vendorService.getVendors({
          search: debouncedSearch,
          status: apiStatus,
          startDate,
          endDate,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
        vendorService.getVendorStats(),
      ]);

      if (vendorsRes.status === 'fulfilled') {
        const res = vendorsRes.value;
        const list = res?.data?.vendors || res?.vendors || [];
        const totalCount =
          res?.data?.total !== undefined
            ? res.data.total
            : res?.total !== undefined
            ? res.total
            : Array.isArray(list)
            ? list.length
            : 0;

        setVendors(list);
        setTotal(totalCount);
      } else {
        toast.error('Failed to load vendors');
      }

      if (statsRes.status === 'fulfilled') {
        const statsData = statsRes.value?.data || statsRes.value;
        if (statsData) setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
      toast.error('Failed to load vendor records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedVendors([]);
    fetchVendorsData();
  }, [debouncedSearch, statusFilter, startDate, endDate, page, pageSize]);

  // Client-side quick filter for 'WITH_MOBILES' or 'WITH_BALANCE'
  const displayedVendors = useMemo(() => {
    if (statusFilter === 'WITH_MOBILES') {
      return vendors.filter((v) => (v.mobiles_currently_at_vendor || 0) > 0);
    }
    if (statusFilter === 'WITH_BALANCE') {
      return vendors.filter((v) => (v.current_balance || 0) > 0);
    }
    return vendors;
  }, [vendors, statusFilter]);

  const toggleSelectVendor = (id) => {
    setSelectedVendors((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVendors = () => {
    if (
      selectedVendors.length === displayedVendors.length &&
      displayedVendors.length > 0
    ) {
      setSelectedVendors([]);
    } else {
      setSelectedVendors(displayedVendors.map((v) => v.id));
    }
  };

  const handleDateFilterChange = ({
    preset,
    startDate: start,
    endDate: end,
  }) => {
    setDatePreset(preset);
    setStartDate(start);
    setEndDate(end);
    setPage(1);
  };

  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vendor, e) => {
    e?.stopPropagation();
    setEditingVendor(vendor);
    setIsModalOpen(true);
  };

  const handleDeleteVendor = (vendor, e) => {
    e?.stopPropagation();
    const activeMobiles = vendor.mobiles_currently_at_vendor || 0;
    const balance = vendor.current_balance || 0;

    let warningNote =
      'This vendor will be removed from your directory. You can re-register them anytime.';
    if (activeMobiles > 0) {
      warningNote = `Warning: This vendor currently has ${activeMobiles} mobile(s) at their lab! Please receive or cancel those phones first.`;
    } else if (Math.abs(balance) > 0) {
      warningNote = `Notice: This vendor has an outstanding balance of ${formatIndianCurrency(
        Math.abs(balance),
        true
      )}. Deleting the vendor will archive their ledger.`;
    }

    Swal.fire({
      title: `Delete Vendor "${vendor.name}"?`,
      text: warningNote,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete Vendor',
      cancelButtonText: 'Cancel',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await vendorService.deleteVendor(vendor.id);
          toast.success(`Vendor "${vendor.name}" deleted successfully.`);
          fetchVendorsData();
        } catch (err) {
          toast.error(
            err.response?.data?.message ||
              err.message ||
              'Failed to delete vendor'
          );
        }
      }
    });
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header: Simple and Welcoming */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-[28px] font-bold text-[var(--spatial-text-title)] tracking-tight">
                Vendor List
              </h1>
              <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5">
                Outside repair shops, motherboard labs, and specialist partners
                you outsource phones to
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={handleOpenAddModal}
          className="shadow-sm font-semibold"
        >
          Add New Vendor
        </Button>
      </div>

      {/* Navigation Sub-Tabs */}
      <VendorNavTabs activeTab="/vendors/list" />

      {/* 4 Summary Insight Cards for Non-Technical Users */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Vendors */}
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setPage(1);
          }}
          className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] hover:border-sky-500/40 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)]">
              Total Vendors
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--spatial-text-title)] mt-2">
            {stats?.total_vendors ?? total ?? 0}
          </div>
          <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1">
            Registered repair shops & labs
          </p>
        </div>

        {/* Card 2: Phones at Labs Now */}
        <div
          onClick={() => navigate('/vendors/pending')}
          className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] hover:border-amber-500/40 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)]">
              Phones at Labs Now
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {stats?.mobiles_currently_at_vendors || 0}
          </div>
          <p className="text-[11px] text-amber-400/80 mt-1 flex items-center gap-1 font-medium">
            <span>Currently in repair</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </div>

        {/* Card 3: Total We Owe (Payable) */}
        <div
          onClick={() => navigate('/vendors/ledger')}
          className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] hover:border-rose-500/40 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)]">
              Total We Owe (Payable)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
            {formatIndianCurrency(stats?.total_payable || 0, true)}
          </div>
          <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1">
            Dues to outside vendors
          </p>
        </div>

        {/* Card 4: Phones Returned Repaired */}
        <div
          onClick={() =>
            navigate(
              '/vendors/transactions?txnType=RECEIVE_FROM_VENDOR'
            )
          }
          className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] hover:border-emerald-500/40 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--spatial-text-muted)]">
              Phones Returned
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {stats?.total_mobiles_received || 0}
          </div>
          <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1">
            Fixed & collected successfully
          </p>
        </div>
      </div>

      {/* Search & Quick Filter Bar */}
      <div className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] space-y-3 relative z-20 shadow-xs">
        {/* Simple Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--spatial-border)] no-scrollbar">
          {[
            { key: 'ALL', label: 'All Vendors' },
            {
              key: 'WITH_MOBILES',
              label: '⚡ Phones at Lab',
              badge: stats?.mobiles_currently_at_vendors,
            },
            {
              key: 'WITH_BALANCE',
              label: '💰 We Owe Money',
            },
            { key: 'ACTIVE', label: 'Active Shops' },
            { key: 'INACTIVE', label: 'Inactive / Paused' },
          ].map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input & Date Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--spatial-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by shop name, contact person, or phone number..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-11 pl-10 pr-9 py-2.5 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <SpatialDateFilter
            preset={datePreset}
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateFilterChange}
          />
        </div>
      </div>

      {/* Main Vendors Table / Directory */}
      <Card
        title={`Registered Repair Shops & Vendors (${displayedVendors.length})`}
        subtitle="Click any row to open full vendor details, phones in repair, and Khata statement"
        bodyClassName="p-0"
      >
        {loading ? (
          <TableSkeleton
            rows={7}
            columns={6}
            showHeader={false}
            showPagination={false}
          />
        ) : displayedVendors.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={
              search
                ? 'No matching vendors found'
                : 'No outside repair shops registered yet'
            }
            description={
              search
                ? `No vendor found matching "${search}". Try searching for another name or clear the search.`
                : 'Add outside repair labs, master technicians, or partner shops you outsource difficult mobile repairs to.'
            }
            actionLabel={search ? 'Clear Search' : '+ Add Your First Vendor'}
            onAction={
              search
                ? () => {
                    setSearch('');
                    setStatusFilter('ALL');
                  }
                : handleOpenAddModal
            }
          />
        ) : (
          <div className="spatial-tab-pane">
            {/* Multi-Selection Action Pill */}
            {selectedVendors.length > 0 && (
              <div className="mx-4 mt-3 mb-1 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs flex items-center justify-between text-sky-400 animate-in fade-in">
                <span className="font-semibold">
                  {selectedVendors.length} of {displayedVendors.length} vendor(s)
                  selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedVendors([])}
                  className="font-bold hover:underline cursor-pointer text-xs"
                >
                  Clear Selection
                </button>
              </div>
            )}

            {/* Table Container */}
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1050px]">
                <thead className="bg-[var(--spatial-table-header-bg)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-bold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="w-12 px-4 py-3.5 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={
                          displayedVendors.length > 0 &&
                          selectedVendors.length === displayedVendors.length
                        }
                        onChange={toggleSelectAllVendors}
                        className="w-4 h-4 rounded text-sky-500 accent-sky-500 cursor-pointer"
                        title="Select All Vendors"
                      />
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap">
                      Shop & Contact Person
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap">
                      Contact & WhatsApp
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap">
                      Workshop Location
                    </th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">
                      Phones at Lab
                    </th>
                    <th className="px-5 py-3.5 text-right whitespace-nowrap">
                      Khata Balance
                    </th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {displayedVendors.map((vendor) => {
                    const balance = vendor.current_balance || 0;
                    const currentlyAtVendor =
                      vendor.mobiles_currently_at_vendor || 0;
                    const isSelected = selectedVendors.includes(vendor.id);
                    const cleanMob = (vendor.mobile || '').replace(/\D/g, '');

                    return (
                      <tr
                        key={vendor.id}
                        onClick={() => navigate(`/vendors/${vendor.id}`)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-sky-500/[0.08] dark:bg-sky-500/[0.12]'
                            : 'hover:bg-[var(--spatial-bg-card-subtle)]'
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
                            onChange={() => toggleSelectVendor(vendor.id)}
                            className="w-4 h-4 rounded text-sky-500 accent-sky-500 cursor-pointer"
                          />
                        </td>

                        {/* 1. Shop & Contact Person */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[var(--spatial-text-title)] group-hover:text-sky-400 transition-colors">
                              {vendor.shop_name || vendor.name}
                            </span>
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                              {vendor.vendor_code || 'VND'}
                            </span>
                          </div>
                          {vendor.shop_name && vendor.name && (
                            <div className="text-xs text-[var(--spatial-text-muted)] mt-0.5 flex items-center gap-1 font-medium">
                              <span>👤 {vendor.name}</span>
                            </div>
                          )}
                          {vendor.notes && (
                            <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic max-w-xs">
                              {vendor.notes}
                            </div>
                          )}
                        </td>

                        {/* 2. Contact & 1-Click WhatsApp */}
                        <td
                          className="px-5 py-3.5 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            {/* Phone call link */}
                            <a
                              href={`tel:${vendor.mobile}`}
                              className="font-mono text-xs font-semibold text-[var(--spatial-text-title)] hover:text-sky-400 flex items-center gap-1.5 transition-colors"
                              title="Click to call"
                            >
                              <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span>{vendor.mobile}</span>
                            </a>

                            {/* Direct WhatsApp button */}
                            {cleanMob && (
                              <a
                                href={`https://wa.me/91${cleanMob}?text=${encodeURIComponent(
                                  `Hello ${vendor.name}, regarding mobile repairs sent to your shop...`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all cursor-pointer"
                                title="Open WhatsApp Chat"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* 3. Workshop Location */}
                        <td className="px-5 py-3.5 max-w-xs text-[var(--spatial-text-muted)] text-xs truncate">
                          {vendor.address ? (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{vendor.address}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* 4. Phones at Lab Now */}
                        <td
                          className="px-5 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => {
                            if (currentlyAtVendor > 0) {
                              e.stopPropagation();
                              navigate(
                                `/vendors/pending?vendorId=${vendor.id}`
                              );
                            }
                          }}
                        >
                          {currentlyAtVendor > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all shadow-xs cursor-pointer"
                              title="Click to see phones currently at this vendor"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>{currentlyAtVendor} at Lab</span>
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--spatial-text-muted)] font-medium">
                              0 Phones
                            </span>
                          )}
                        </td>

                        {/* 5. Khata / Balance */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="font-mono font-bold text-sm text-[var(--spatial-text-title)]">
                            {formatIndianCurrency(Math.abs(balance), true)}
                          </div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase mt-0.5 ${
                              balance > 0
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                                : balance < 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}
                          >
                            {balance > 0
                              ? 'We Owe (Payable)'
                              : balance < 0
                              ? 'Advance / Receivable'
                              : 'Settled (₹0)'}
                          </span>
                        </td>

                        {/* 6. Status */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                              vendor.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                vendor.status === 'ACTIVE'
                                  ? 'bg-emerald-400'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <span>
                              {vendor.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                            </span>
                          </span>
                        </td>

                        {/* 7. Action Buttons (Clear & Ergonomic) */}
                        <td
                          className="px-5 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Primary Quick Action: Send Mobiles */}
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/vendors/send?vendorId=${vendor.id}`)
                              }
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white border border-sky-500/20 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                              title="Outsource phone to this vendor"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Send Phone</span>
                            </button>

                            {/* View Profile */}
                            <button
                              type="button"
                              onClick={() => navigate(`/vendors/${vendor.id}`)}
                              className="p-1.5 rounded-xl text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)] border border-transparent hover:border-[var(--spatial-border)] transition-all cursor-pointer"
                              title="View Vendor Profile & Khata"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(vendor, e)}
                              className="p-1.5 rounded-xl text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)] border border-transparent hover:border-[var(--spatial-border)] transition-all cursor-pointer"
                              title="Edit Vendor Details"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteVendor(vendor, e)}
                              className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                              title="Delete Vendor"
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

      {/* Add / Edit Vendor Modal */}
      <VendorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingVendor={editingVendor}
        existingVendors={vendors}
        onSuccess={() => {
          setIsModalOpen(false);
          setPage(1);
          fetchVendorsData();
        }}
        onSelectExisting={(existing) => {
          handleOpenEditModal(existing);
        }}
      />
    </div>
  );
};

export default VendorList;
