import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Eye,
  MessageCircle,
  FileText,
  Pencil,
  Trash2,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useDebounce } from '../../hooks/useDebounce';
import { customerService } from '../../services/customerService';
import { Card, LoadingSpinner, EmptyState, TableSkeleton } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { BulkActionBar } from '../../components/common/BulkActionBar';

const customerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  gender: z.string().default('male'),
  user_type: z.string().default('End User'),
  phone: z.string().min(6, 'Valid phone number required'),
  whatsapp_number: z.string().optional(),
  alternate_phone: z.string().optional(),
  alternate_whatsapp: z.string().optional(),
  email: z.string().min(1, 'Email address (Mail ID) is required').email('Valid email address required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  notes: z.string().optional(),
});

export const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSameAsPhone, setAddSameAsPhone] = useState(true);
  const [addHasAltPhone, setAddHasAltPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleDeleteCustomer = (e, customer) => {
    e.stopPropagation();
    Swal.fire({
      title: `Delete Customer ${customer.full_name}?`,
      text: 'Are you sure you want to delete this customer? All their associated repair jobs, quotes, and records will also be permanently deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete Customer',
      cancelButtonText: 'Cancel',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await customerService.deleteCustomer(customer.id, true);
          setCustomers((prev) => prev.filter((item) => item.id !== customer.id));
          setTotal((prev) => Math.max(0, prev - 1));
          toast.success(`Customer "${customer.full_name}" was deleted.`);
        } catch (err) {
          toast.error(err.message || 'Failed to delete customer');
        }
      }
    });
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      full_name: '',
      gender: 'male',
      user_type: 'End User',
      phone: '',
      whatsapp_number: '',
      alternate_phone: '',
      alternate_whatsapp: '',
      email: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      notes: '',
    },
  });

  const fetchCustomers = async (query = debouncedSearch, pageNum = page, sizeNum = pageSize) => {
    try {
      setLoading(true);
      const res = await customerService.getCustomers({
        search: query,
        limit: sizeNum,
        offset: (pageNum - 1) * sizeNum,
      });
      setCustomers(res.customers || []);
      setTotal(res.total || 0);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(debouncedSearch, page, pageSize);
  }, [debouncedSearch, page, pageSize]);

  const toggleSelectAll = () => {
    const pageIds = customers.map((c) => c.id);
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

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Swal.fire({
      title: `Delete ${selectedIds.length} Customer(s)?`,
      text: 'Are you sure you want to delete the selected customers? Their associated repair jobs and records will also be removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Yes, Delete (${selectedIds.length}) Customers`,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await customerService.bulkDeleteCustomers(selectedIds, true);
          toast.success(res.message || `Deleted ${selectedIds.length} customers`);
          setSelectedIds([]);
          fetchCustomers(search, page, pageSize);
        } catch (err) {
          toast.error(err.message || 'Failed to delete customers');
        }
      }
    });
  };

  const onAddSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const payload = {
        ...data,
        whatsapp_number: addSameAsPhone ? data.phone : (data.whatsapp_number || data.phone),
        alternate_phone: addHasAltPhone ? (data.alternate_phone || '') : '',
        alternate_whatsapp: addHasAltPhone ? (data.alternate_whatsapp || '') : '',
      };
      const created = await customerService.createCustomer(payload);
      toast.success(`Customer "${created.full_name}" registered!`);
      setIsAddModalOpen(false);
      reset();
      setAddSameAsPhone(true);
      setAddHasAltPhone(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--spatial-text-title)] tracking-tight">Customer Directory</h2>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
            Manage client profiles, contact information, and service histories
          </p>
        </div>
        <Button icon={Plus} onClick={() => setIsAddModalOpen(true)}>
          Add Customer
        </Button>
      </div>

      {/* Bulk Action Bar (when rows are selected) */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        deleteLabel={`Delete (${selectedIds.length})`}
      />

      <Card
        title={`All Customers (${total})`}
        subtitle={`Showing page ${page} of ${Math.max(1, Math.ceil(total / pageSize))}`}
        action={
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, phone, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 pr-7 py-1.5 text-xs spatial-input rounded-xl w-52 sm:w-72"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        }
        bodyClassName="p-0"
      >
        {loading ? (
          <TableSkeleton rows={7} columns={5} showHeader={false} showPagination={false} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="Get started by registering a new customer or adjusting your search term."
            actionLabel="Add Customer"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="spatial-tab-pane">
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1000px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={customers.length > 0 && customers.every((c) => selectedIds.includes(c.id))}
                        onChange={toggleSelectAll}
                        aria-label="Select all on this page"
                        className="w-4 h-4 rounded text-apple-blue cursor-pointer accent-apple-blue"
                      />
                    </th>
                    <th className="px-5 py-3 whitespace-nowrap">Code</th>
                    <th className="px-5 py-3 whitespace-nowrap">Customer Name</th>
                    <th className="px-5 py-3 whitespace-nowrap">Phone & WhatsApp</th>
                    <th className="px-5 py-3 whitespace-nowrap">Email</th>
                    <th className="px-5 py-3 whitespace-nowrap">Location</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {customers.map((c) => {
                    const isSelected = selectedIds.includes(c.id);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/customers/${c.id}`)}
                        className={`hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer ${
                          isSelected ? 'bg-apple-blue/8' : ''
                        }`}
                      >
                        <td
                          className="w-10 px-4 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(c.id)}
                            aria-label={`Select customer ${c.full_name}`}
                            className="w-4 h-4 rounded text-apple-blue cursor-pointer accent-apple-blue"
                          />
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded-md bg-apple-blue/10 text-apple-blue border border-apple-blue/20">
                            {c.customer_code || 'CUST'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-[var(--spatial-text-title)] whitespace-nowrap">
                          {c.full_name}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="font-mono text-[var(--spatial-text-title)] font-medium">{c.phone}</span>
                            {c.whatsapp_number && (
                              <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" title="Primary WhatsApp">
                                <MessageCircle className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {(c.alternate_whatsapp || c.alternate_phone) && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 whitespace-nowrap">
                                Alt: {c.alternate_whatsapp || c.alternate_phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] font-mono whitespace-nowrap">
                          {c.email || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] whitespace-nowrap">
                          {c.city ? `${c.city}${c.state ? `, ${c.state}` : ''}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => navigate(`/customers/${c.id}`)}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-apple-blue hover:bg-apple-blue/10 rounded-lg transition-all active:scale-90"
                              title="View Customer Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCustomerForEdit(c);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all active:scale-90"
                              title="Edit Customer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteCustomer(e, c)}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Delete Customer"
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
            <SpatialPagination
              currentPage={page}
              pageSize={pageSize}
              totalItems={total}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              pageSizeOptions={[10, 15, 20]}
            />
          </div>
        )}
      </Card>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Customer"
        subtitle="Register customer details & alternate WhatsApp for repair updates"
      >
        <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-3.5">
          {/* Note Callout */}
          <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-xl text-[11px] text-amber-300 leading-snug">
            <strong>⚠️ Note:</strong> Since customer leaves their phone for repair, make sure to collect an <strong>Alternate WhatsApp Number</strong> so they can receive status alerts while their phone is in the shop.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Milan Devani"
                {...register('full_name')}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
              />
              {errors.full_name && (
                <p className="text-[11px] text-rose-400 mt-1">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Gender & User Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <SpatialSelect
                  value={watch('gender') || 'male'}
                  onChange={(val) => setValue('gender', val, { shouldValidate: true })}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
                <SpatialSelect
                  value={watch('user_type') || 'End User'}
                  onChange={(val) => setValue('user_type', val, { shouldValidate: true })}
                  options={[
                    { value: 'End User', label: 'End User' },
                    { value: 'Dealer', label: 'Dealer' },
                    { value: 'Corporate', label: 'Corporate' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                placeholder="Primary phone number"
                {...register('phone')}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
              />
              {errors.phone && (
                <p className="text-[11px] text-rose-400 mt-1">{errors.phone.message}</p>
              )}
              <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-[var(--spatial-text-body)] select-none">
                <input
                  type="checkbox"
                  checked={addSameAsPhone}
                  onChange={(e) => setAddSameAsPhone(e.target.checked)}
                  className="w-4 h-4 text-sky-500 rounded border-slate-300"
                />
                <span className="font-medium">WhatsApp number is same as Phone</span>
              </label>
            </div>
            {!addSameAsPhone && (
              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Primary WhatsApp Number *
                </label>
                <input
                  type="tel"
                  placeholder="Enter separate WhatsApp number"
                  {...register('whatsapp_number')}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
                />
                {errors.whatsapp_number && (
                  <p className="text-[11px] text-rose-400 mt-1">{errors.whatsapp_number.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Checkbox for Alternate Phone Number */}
          <div className="pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--spatial-text-title)] select-none font-medium">
              <input
                type="checkbox"
                checked={addHasAltPhone}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAddHasAltPhone(checked);
                  if (!checked) {
                    setValue('alternate_phone', '');
                    setValue('alternate_whatsapp', '');
                  }
                }}
                className="w-4 h-4 text-[#0071e3] rounded accent-[#0071e3] cursor-pointer"
              />
              <span>Add Alternate Phone Number (In-Repair Contact)</span>
            </label>
          </div>

          {/* Alternate Phone & Alternate WhatsApp */}
          {addHasAltPhone && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[var(--spatial-bg-card-subtle)] border border-emerald-400/30 rounded-2xl animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Alternate Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="Secondary phone"
                  {...register('alternate_phone')}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                  Alternate WhatsApp (In-Repair)
                </label>
                <input
                  type="tel"
                  placeholder="Active WP number while phone in shop"
                  {...register('alternate_whatsapp')}
                  className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Email Address (Mail ID) *
            </label>
            <input
              type="email"
              placeholder="customer@example.com"
              {...register('email')}
              className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
            />
            {errors.email && (
              <p className="text-[11px] text-rose-400 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Address
            </label>
            <input
              type="text"
              placeholder="123 Main St"
              {...register('address')}
              className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">City</label>
              <input
                type="text"
                placeholder="City"
                {...register('city')}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">State</label>
              <input
                type="text"
                placeholder="State"
                {...register('state')}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">Postal Code</label>
              <input
                type="text"
                placeholder="Zip"
                {...register('postal_code')}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">Internal Notes</label>
            <textarea
              rows={2}
              placeholder="Any special customer notes or preferences..."
              {...register('notes')}
              className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--spatial-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isSubmitting}>
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      {isEditModalOpen && selectedCustomerForEdit && (
        <CustomerEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedCustomerForEdit(null);
          }}
          customer={selectedCustomerForEdit}
          onSave={(updated) => {
            setCustomers((prev) =>
              prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
            );
          }}
        />
      )}
    </div>
  );
};
