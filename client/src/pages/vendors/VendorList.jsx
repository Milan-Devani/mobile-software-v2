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
import { SpatialPagination } from '../../components/common/SpatialPagination';
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const debouncedSearch = useDebounce(search, 400);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    shop_name: '',
    mobile: '',
    whatsapp: '',
    address: '',
    gst_number: '',
    opening_balance: '0',
    notes: '',
    status: 'ACTIVE',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await vendorService.getVendors({
        search: debouncedSearch,
        status: statusFilter,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      if (res?.data) {
        setVendors(res.data.vendors || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
      toast.error('Failed to load vendor records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [debouncedSearch, statusFilter, page, pageSize]);

  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      shop_name: '',
      mobile: '',
      whatsapp: '',
      address: '',
      gst_number: '',
      opening_balance: '0',
      notes: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vendor, e) => {
    e?.stopPropagation();
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name || '',
      shop_name: vendor.shop_name || '',
      mobile: vendor.mobile || '',
      whatsapp: vendor.whatsapp || vendor.mobile || '',
      address: vendor.address || '',
      gst_number: vendor.gst_number || '',
      opening_balance: String(vendor.opening_balance || 0),
      notes: vendor.notes || '',
      status: vendor.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleSubmitVendor = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) {
      toast.error('Vendor Contact Name and Mobile Number are required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingVendor) {
        await vendorService.updateVendor(editingVendor.id, formData);
        toast.success(`Vendor "${formData.name}" updated!`);
      } else {
        await vendorService.createVendor(formData);
        toast.success(`New vendor "${formData.name}" registered!`);
      }
      setIsModalOpen(false);
      fetchVendors();
    } catch (err) {
      toast.error(err.message || 'Failed to save vendor');
    } finally {
      setSubmitting(false);
    }
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--spatial-text-title)] tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-sky-400" />
            Vendor Master
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
      <div className="spatial-card p-4 rounded-2xl space-y-3">
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

        {/* Search input with h-11 height */}
        <div className="relative max-w-md">
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
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1100px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
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

                    return (
                      <tr
                        key={vendor.id}
                        onClick={() => navigate(`/vendors/${vendor.id}`)}
                        className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer group"
                      >
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
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? `Edit Vendor: ${editingVendor.name}` : 'Register New Vendor / Lab Partner'}
        subtitle="Manage contact coordinates, workshop location, and opening balance"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitVendor} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Contact Person Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Bhai"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Shop / Company / Lab Name
              </label>
              <input
                type="text"
                placeholder="e.g. Shree Sai Chip Level Lab"
                value={formData.shop_name}
                onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Mobile Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 9825123456"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                placeholder="e.g. 9825123456"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                GST Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 24AAACS1234A1Z1"
                value={formData.gst_number}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                step="any"
                disabled={Boolean(editingVendor)} // Cannot alter initial opening balance after creation
                placeholder="0.00 (Positive: We owe vendor, Negative: Vendor owes us)"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Workshop / Lab Address
            </label>
            <input
              type="text"
              placeholder="e.g. Shop 402, Ring Road Electronics Market, Surat"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Notes / Specialization
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Handles CPU reballing, Face ID repair, iPad glass lamination..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--spatial-border)]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              {editingVendor ? 'Save Changes' : 'Register Vendor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
