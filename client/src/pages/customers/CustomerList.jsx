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
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { customerService } from '../../services/customerService';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSameAsPhone, setAddSameAsPhone] = useState(true);
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

  const fetchCustomers = async (query = '') => {
    try {
      setLoading(true);
      const res = await customerService.getCustomers({ search: query, limit: 100 });
      setCustomers(res.customers || []);
      setTotal(res.total || 0);
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers(search);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const onAddSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const payload = {
        ...data,
        whatsapp_number: addSameAsPhone ? data.phone : (data.whatsapp_number || data.phone),
      };
      const created = await customerService.createCustomer(payload);
      toast.success(`Customer "${created.full_name}" registered!`);
      setIsAddModalOpen(false);
      reset();
      setAddSameAsPhone(true);
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
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--spatial-text-title)] tracking-tight">Customer Directory</h2>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
            Manage client profiles, contact information, and repair histories
          </p>
        </div>
        <Button icon={Plus} onClick={() => setIsAddModalOpen(true)}>
          Add Customer
        </Button>
      </div>

      <Card
        title={`All Customers (${total})`}
        action={
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs spatial-input rounded-xl w-48 sm:w-64"
            />
          </div>
        }
        bodyClassName="p-0"
      >
        {loading ? (
          <LoadingSpinner label="Fetching customer directory..." />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="Get started by registering a new customer or adjusting your search term."
            actionLabel="Add Customer"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Customer Name</th>
                  <th className="px-5 py-3">Phone & WhatsApp</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--spatial-border)]">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-400">
                      {c.customer_code || 'CUST'}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[var(--spatial-text-title)]">
                      {c.full_name}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[var(--spatial-text-title)] font-medium">{c.phone}</span>
                          {c.whatsapp_number && (
                            <span className="p-0.5 rounded bg-emerald-500/10 text-emerald-400" title="Primary WhatsApp">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        {(c.alternate_whatsapp || c.alternate_phone) && (
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                            <span className="bg-emerald-500/10 px-1 rounded border border-emerald-400/20">
                              Alt WP: {c.alternate_whatsapp || c.alternate_phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] font-mono">
                      {c.email || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--spatial-text-muted)]">
                      {c.city ? `${c.city}${c.state ? `, ${c.state}` : ''}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${c.id}`);
                          }}
                          className="p-1.5 text-[var(--spatial-text-muted)] hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                          title="View Customer Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomerForEdit(c);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-[var(--spatial-text-muted)] hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
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
                ))}
              </tbody>
            </table>
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
                <select
                  {...register('gender')}
                  className="w-full px-2.5 py-2 spatial-input rounded-xl text-xs capitalize"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <select
                  {...register('user_type')}
                  className="w-full px-2.5 py-2 spatial-input rounded-xl text-xs"
                >
                  <option value="End User">End User</option>
                  <option value="Dealer">Dealer</option>
                  <option value="Corporate">Corporate</option>
                </select>
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

          {/* Alternate Phone & Alternate WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[var(--spatial-bg-card-subtle)] border border-emerald-400/30 rounded-xl">
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
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Internal Notes</label>
            <textarea
              rows={2}
              placeholder="Any special customer notes or preferences..."
              {...register('notes')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
