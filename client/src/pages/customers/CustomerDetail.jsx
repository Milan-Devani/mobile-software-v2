import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Smartphone,
  Wrench,
  Clock,
  CheckCircle2,
  DollarSign,
  Plus,
  ArrowLeft,
  Calendar,
  Eye,
  MessageCircle,
  Pencil,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { customerService } from '../../services/customerService';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';
import { SpatialPagination } from '../../components/common/SpatialPagination';

export const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [jobPage, setJobPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(10);

  const handleDeleteCustomer = () => {
    Swal.fire({
      title: `Delete Customer ${data?.customer?.full_name}?`,
      text: 'Are you sure you want to permanently delete this customer? All their registered devices, repair job sheets, quotes, and payment records will also be removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete Customer',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await customerService.deleteCustomer(data.customer.id, true);
          toast.success(`Customer "${data?.customer?.full_name}" was deleted.`);
          navigate('/customers');
        } catch (err) {
          toast.error(err.message || 'Failed to delete customer');
        }
      }
    });
  };

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const res = await customerService.getCustomerById(id);
      setData(res);
    } catch (err) {
      toast.error('Customer not found');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  if (loading) {
    return <LoadingSpinner fullPage label="Loading customer profile..." />;
  }

  const customer = data?.customer;
  const devices = data?.devices || [];
  const jobs = data?.jobs || [];
  const stats = data?.stats || {};

  return (
    <div className="space-y-6">
      {/* Top back button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] bg-[var(--spatial-bg-card)] hover:bg-[var(--spatial-bg-card-subtle)] rounded-xl transition-all border border-[var(--spatial-border)] active:scale-95 cursor-pointer"
            title="Back to Customers"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--spatial-text-title)] tracking-tight">{customer?.full_name}</h2>
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-apple-blue/10 text-apple-blue border border-apple-blue/20">
                {customer?.customer_code}
              </span>
            </div>
            <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
              Customer profile • Registered {new Date(customer?.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            icon={Pencil}
            onClick={() => setIsEditModalOpen(true)}
          >
            Edit Customer
          </Button>
          <Button
            variant="ghost"
            className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
            icon={Trash2}
            onClick={handleDeleteCustomer}
            title="Permanently Delete Customer"
          >
            Delete
          </Button>
          <Button
            icon={Plus}
            onClick={() => navigate(`/jobs/new?customer_id=${customer.id}`)}
          >
            Create Repair Job
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="spatial-card p-4 rounded-2xl flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Total Repairs</p>
          <p className="text-2xl font-bold text-[var(--spatial-text-title)] mt-2 font-mono tabular-nums">{stats.total_repairs || 0}</p>
        </div>
        <div className="spatial-card p-4 rounded-2xl flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Active Repairs</p>
          <p className="text-2xl font-bold text-apple-blue mt-2 font-mono tabular-nums">{stats.active_repairs || 0}</p>
        </div>
        <div className="spatial-card p-4 rounded-2xl flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-bold text-emerald-500 mt-2 font-mono tabular-nums">{stats.completed_repairs || 0}</p>
        </div>
        <div className="spatial-card p-4 rounded-2xl flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Pending Balance</p>
          <p className="text-2xl font-bold text-rose-500 mt-2 font-mono tabular-nums">₹{stats.pending_payments?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="spatial-card p-4 rounded-2xl flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">Total Spent</p>
          <p className="text-2xl font-bold text-[var(--spatial-text-title)] mt-2 font-mono tabular-nums">₹{stats.total_spent?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      {/* Customer Info & Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <Card title="Contact Information" className="md:col-span-1">
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--spatial-border)]">
              <span className="text-[var(--spatial-text-muted)] text-[11px]">Type / Gender:</span>
              <span className="font-semibold text-[var(--spatial-text-title)]">
                {customer?.user_type || 'End User'} • <span className="capitalize">{customer?.gender || 'male'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[var(--spatial-text-muted)] shrink-0" />
                <div>
                  <p className="text-[var(--spatial-text-muted)] text-[10px] uppercase font-bold">Primary Phone</p>
                  <p className="font-mono font-semibold text-[var(--spatial-text-title)]">{customer?.phone}</p>
                </div>
              </div>
            </div>

            {customer?.whatsapp_number && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[var(--spatial-text-muted)] text-[10px] uppercase font-bold">Primary WhatsApp</p>
                    <p className="font-mono font-semibold text-[var(--spatial-text-title)]">{customer.whatsapp_number}</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${customer.whatsapp_number.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 font-semibold text-[10px] transition-colors"
                >
                  Chat
                </a>
              </div>
            )}

            {/* Alternate Contacts */}
            {customer?.alternate_phone && (
              <div className="flex items-center gap-3 pt-2 border-t border-[var(--spatial-border)]">
                <Phone className="w-4 h-4 text-[var(--spatial-text-muted)] shrink-0" />
                <div>
                  <p className="text-[var(--spatial-text-muted)] text-[10px] uppercase font-bold">Alternate Phone</p>
                  <p className="font-mono font-semibold text-[var(--spatial-text-title)]">{customer.alternate_phone}</p>
                </div>
              </div>
            )}

            {customer?.alternate_whatsapp && (
              <div className="flex items-center justify-between p-2.5 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-bold">Alt WhatsApp (In-Repair)</p>
                    <p className="font-mono font-bold text-[var(--spatial-text-title)]">{customer.alternate_whatsapp}</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${customer.alternate_whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 font-semibold text-[10px] transition-colors shadow-xs"
                  title="Direct chat while customer's phone is held in repair"
                >
                  Chat Alt
                </a>
              </div>
            )}

            {customer?.email && (
              <div className="flex items-center gap-3 pt-2 border-t border-[var(--spatial-border)]">
                <Mail className="w-4 h-4 text-[var(--spatial-text-muted)] shrink-0" />
                <div>
                  <p className="text-[var(--spatial-text-muted)] text-[10px] uppercase font-bold">Email (Mail ID)</p>
                  <p className="font-semibold text-[var(--spatial-text-title)] truncate max-w-xs">{customer.email}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 pt-2 border-t border-[var(--spatial-border)]">
              <MapPin className="w-4 h-4 text-[var(--spatial-text-muted)] shrink-0 mt-0.5" />
              <div>
                <p className="text-[var(--spatial-text-muted)] text-[10px] uppercase font-bold">Address</p>
                <p className="font-medium text-[var(--spatial-text-title)]">
                  {customer?.address || 'No address provided'}
                  {customer?.city ? `, ${customer.city}` : ''}
                  {customer?.state ? `, ${customer.state} ${customer.postal_code || ''}` : ''}
                </p>
              </div>
            </div>

            {customer?.notes && (
              <div className="p-3 bg-[var(--spatial-bg-card-subtle)] rounded-xl border border-[var(--spatial-border)] mt-2">
                <p className="text-[10px] uppercase font-bold text-[var(--spatial-text-muted)] mb-1">Customer Notes</p>
                <p className="text-[var(--spatial-text-body)] italic text-xs">{customer.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Devices Registered Card */}
        <Card title={`Customer Devices (${devices.length})`} className="md:col-span-2">
          {devices.length === 0 ? (
            <p className="text-[var(--spatial-text-muted)] text-xs italic py-4 text-center">No devices registered under this customer yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {devices.map((device) => (
                <div key={device.id} className="p-3.5 bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] rounded-xl flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-apple-blue/10 border border-apple-blue/20 flex items-center justify-center text-apple-blue shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-[var(--spatial-text-title)] text-xs">{device.brand} {device.model}</h5>
                    <p className="text-[11px] text-[var(--spatial-text-muted)] font-mono mt-0.5">IMEI: {device.imei || 'Not recorded'}</p>
                    <p className="text-[11px] text-[var(--spatial-text-muted)]">{device.color || ''} {device.storage_capacity ? `• ${device.storage_capacity}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Repair History Table */}
      <Card
        title={`Repair History (${jobs.length})`}
        subtitle="Complete record of all service tickets and job sheets"
        bodyClassName="p-0"
      >
        {jobs.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No repair history for this customer"
            description="When this customer brings in a mobile device, create a Job Sheet to track the repair."
            actionLabel="Create First Job Sheet"
            onAction={() => navigate(`/jobs/new?customer_id=${customer.id}`)}
          />
        ) : (
          <div>
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="px-5 py-3 whitespace-nowrap">Job Number</th>
                    <th className="px-5 py-3 whitespace-nowrap">Device & Model</th>
                    <th className="px-5 py-3 whitespace-nowrap">Reported Issue</th>
                    <th className="px-5 py-3 whitespace-nowrap">Status</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Estimate</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Paid</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Balance</th>
                    <th className="px-5 py-3 whitespace-nowrap">Date</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {jobs
                    .slice((jobPage - 1) * jobPageSize, jobPage * jobPageSize)
                    .map((job) => (
                      <tr
                        key={job.id}
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded-md bg-apple-blue/10 text-apple-blue border border-apple-blue/20">
                            {job.job_number}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-[var(--spatial-text-title)] whitespace-nowrap">
                          {job.device?.brand} {job.device?.model}
                        </td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] max-w-xs truncate whitespace-nowrap" title={job.customer_complaint}>
                          {job.customer_complaint || '—'}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <Badge status={job.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono tabular-nums text-[var(--spatial-text-title)] whitespace-nowrap">
                          ₹{Number(job.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono tabular-nums text-emerald-500 font-semibold whitespace-nowrap">
                          ₹{Number(job.paid_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                          {job.balance_due > 0 ? (
                            <span className="text-rose-500">₹{Number(job.balance_due).toLocaleString()}</span>
                          ) : (
                            <span className="text-[var(--spatial-text-muted)] font-normal">₹0</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] whitespace-nowrap font-mono text-[11px]">
                          {new Date(job.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/jobs/${job.id}`);
                            }}
                            className="p-1.5 text-[var(--spatial-text-muted)] hover:text-apple-blue hover:bg-apple-blue/10 rounded-lg transition-all active:scale-90"
                            title="View Job Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {jobs.length > 0 && (
              <SpatialPagination
                currentPage={jobPage}
                totalPages={Math.ceil(jobs.length / jobPageSize) || 1}
                totalItems={jobs.length}
                pageSize={jobPageSize}
                pageSizeOptions={[10, 15, 20, 50]}
                onPageChange={setJobPage}
                onPageSizeChange={(newSize) => {
                  setJobPageSize(newSize);
                  setJobPage(1);
                }}
              />
            )}
          </div>
        )}
      </Card>

      {/* Edit Customer Modal */}
      {isEditModalOpen && customer && (
        <CustomerEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          customer={customer}
          onSave={(updated) => {
            setData((prev) => ({
              ...prev,
              customer: { ...prev.customer, ...updated },
            }));
            toast.success('Customer profile updated successfully!');
          }}
        />
      )}
    </div>
  );
};
