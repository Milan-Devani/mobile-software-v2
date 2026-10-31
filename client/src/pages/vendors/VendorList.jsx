import React, { useState, useEffect } from 'react';
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
  CreditCard,
  X,
  ShieldCheck,
  CheckCircle2,
  IndianRupee,
  Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { VendorNavTabs } from '../../components/vendors/VendorNavTabs';
import { Card, LoadingSpinner, EmptyState, TableSkeleton } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { VendorModal } from '../../components/vendors/VendorModal';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { SpatialDateFilter } from '../../components/common/SpatialDateFilter';
import { vendorService } from '../../services/vendorService';
import { formatIndianCurrency } from '../../utils/billFormatters';
import { useDebounce } from '../../hooks/useDebounce';

export const VendorList = () => {
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const debouncedSearch = useDebounce(search, 400);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedVendors, setSelectedVendors] = useState([]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await vendorService.getVendors({
        search: debouncedSearch,
        status: statusFilter,
        startDate,
        endDate,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

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
    } catch (err) {
      console.error('Failed to load vendors:', err);
      toast.error('Failed to load vendor records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedVendors([]);
    fetchVendors();
  }, [debouncedSearch, statusFilter, startDate, endDate, page, pageSize]);

  const toggleSelectVendor = (id) => {
    setSelectedVendors((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVendors = () => {
    if (selectedVendors.length === vendors.length) {
      setSelectedVendors([]);
    } else {
      setSelectedVendors(vendors.map((v) => v.id));
    }
  };

  const handleDateFilterChange = ({ preset, startDate: start, endDate: end }) => {
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
    Swal.fire({
      title: `Delete Vendor "${vendor.name}"?`,
      text: 'Make sure no active mobiles are currently outsourced to this vendor.',
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
          toast.success(`Vendor "${vendor.name}" removed successfully.`);
          fetchVendors();
        } catch (err) {
          toast.error(err.response?.data?.message || err.message || 'Failed to delete vendor');
        }
      }
    });
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--spatial-text-title)] tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-sky-400" />
            Vendor List
          </h1>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
            Manage authorized service centers, motherboard labs, chip-level partners, and contact profiles
          </p>
        </div>

        <Button icon={Plus} onClick={handleOpenAddModal}>
          Add New Vendor
        </Button>
      </div>

      {/* Navigation Sub-Tabs */}
      <VendorNavTabs activeTab="/vendors/list" />

      {/* Search & Filter Bar with Ergonomic h-11 Height */}
      <div className="spatial-card p-4 rounded-2xl space-y-3 relative z-20">
        {/* Status Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--spatial-border)] no-scrollbar">
          {[
            { key: 'ALL', label: 'All Vendors' },
            { key: 'ACTIVE', label: 'Active Partners' },
            { key: 'INACTIVE', label: 'Inactive / Archived' },
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

        {/* Search input with h-11 height and SpatialDateFilter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vendor name, shop name, phone, code, or GSTIN..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-11 pl-10 pr-9 py-2.5 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-all shadow-xs"
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

      {/* Vendors Table / Cards */}
      <Card
        title={`Registered Vendors (${total})`}
        subtitle={`Showing page ${page} of ${Math.max(1, Math.ceil(total / pageSize))}`}
        bodyClassName="p-0"
      >
        {loading ? (
          <TableSkeleton rows={7} columns={6} showHeader={false} showPagination={false} />
        ) : vendors.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No vendors found"
            description="Register your first repair vendor or specialized chip-level lab."
            actionLabel="Add New Vendor"
            onAction={handleOpenAddModal}
          />
        ) : (
          <div className="spatial-tab-pane">
            {selectedVendors.length > 0 && (
              <div className="mx-4 mt-3 mb-1 p-2.5 rounded-xl bg-apple-blue/10 border border-apple-blue/30 text-xs flex items-center justify-between text-apple-blue animate-in fade-in">
                <span className="font-semibold">
                  {selectedVendors.length} of {vendors.length} vendor(s) selected
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
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1100px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="w-12 px-4 py-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={vendors.length > 0 && selectedVendors.length === vendors.length}
                        onChange={toggleSelectAllVendors}
                        className="w-4 h-4 rounded text-sky-500 accent-sky-500 cursor-pointer"
                        title="Select All Vendors"
                      />
                    </th>
                    <th className="px-5 py-3 whitespace-nowrap">Vendor Code</th>
                    <th className="px-5 py-3 whitespace-nowrap">Vendor Name & Shop</th>
                    <th className="px-5 py-3 whitespace-nowrap">Contact Numbers</th>
                    <th className="px-5 py-3 whitespace-nowrap">Address / City</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">At Lab Now</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Sent / Rcvd</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Outstanding Balance</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Status</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {vendors.map((vendor) => {
                    const balance = vendor.current_balance || 0;
                    const currentlyAtVendor = vendor.mobiles_currently_at_vendor || 0;
                    const isSelected = selectedVendors.includes(vendor.id);

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

                        {/* 1. Code */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded-md bg-apple-blue/10 text-apple-blue border border-apple-blue/20">
                            {vendor.vendor_code || 'VND'}
                          </span>
                        </td>

                        {/* 2. Name & Shop */}
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-[var(--spatial-text-title)] group-hover:text-sky-400 transition-colors">
                            {vendor.name}
                          </div>
                          {vendor.shop_name && (
                            <div className="text-[11px] text-[var(--spatial-text-muted)] mt-0.5">
                              {vendor.shop_name}
                            </div>
                          )}
                          {vendor.gst_number && (
                            <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                              GST: {vendor.gst_number}
                            </div>
                          )}
                        </td>

                        {/* 3. Contact Numbers */}
                        <td className="px-5 py-3.5 font-mono text-[11px] text-[var(--spatial-text-body)] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-[var(--spatial-text-muted)]" />
                            <span>{vendor.mobile}</span>
                          </div>
                          {vendor.whatsapp && vendor.whatsapp !== vendor.mobile && (
                            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] mt-0.5">
                              <MessageCircle className="w-3 h-3" />
                              <span>{vendor.whatsapp}</span>
                            </div>
                          )}
                        </td>

                        {/* 4. Address */}
                        <td className="px-5 py-3.5 max-w-xs text-[var(--spatial-text-muted)] text-[11px] truncate">
                          {vendor.address || '—'}
                        </td>

                        {/* 5. Mobiles Currently with Vendor */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          {currentlyAtVendor > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              {currentlyAtVendor} At Lab
                            </span>
                          ) : (
                            <span className="text-[11px] text-[var(--spatial-text-muted)]">0 Handsets</span>
                          )}
                        </td>

                        {/* 6. Sent / Received Cumulative */}
                        <td className="px-5 py-3.5 text-center font-mono text-[11px] text-[var(--spatial-text-body)] whitespace-nowrap">
                          <span className="text-sky-400 font-bold">{vendor.total_mobiles_sent || 0}</span> Sent
                          <span className="mx-1 text-slate-500">/</span>
                          <span className="text-emerald-400 font-bold">{vendor.total_mobiles_received || 0}</span> Recv
                        </td>

                        {/* 7. Balance Badge */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="font-mono font-bold text-sm text-[var(--spatial-text-title)]">
                            {formatIndianCurrency(Math.abs(balance), true)}
                          </div>
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase mt-0.5 ${
                              balance > 0
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : balance < 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-500/10 text-slate-400'
                            }`}
                          >
                            {balance > 0 ? 'Payable (We Owe)' : balance < 0 ? 'Receivable' : 'Settled'}
                          </span>
                        </td>

                        {/* 8. Status */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              vendor.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}
                          >
                            {vendor.status}
                          </span>
                        </td>

                        {/* 9. Action Buttons */}
                        <td
                          className="px-5 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Send Mobiles */}
                            <button
                              type="button"
                              onClick={() => navigate(`/vendors/send?vendorId=${vendor.id}`)}
                              className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 border border-transparent hover:border-sky-500/20 transition-all cursor-pointer"
                              title="Send Mobiles to Vendor"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>

                            {/* View Profile */}
                            <button
                              type="button"
                              onClick={() => navigate(`/vendors/${vendor.id}`)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                              title="View Vendor Profile & History"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit Vendor */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(vendor, e)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit Vendor Information"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Delete Vendor */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteVendor(vendor, e)}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
          fetchVendors();
        }}
        onSelectExisting={(existing) => {
          handleOpenEditModal(existing);
        }}
      />
    </div>
  );
};
