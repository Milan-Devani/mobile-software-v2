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
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{customer?.full_name}</h2>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {customer?.customer_code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Member since {new Date(customer?.created_at).toLocaleDateString()}
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
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
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
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Repairs</p>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats.total_repairs || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Active Repairs</p>
          <p className="text-2xl font-black text-primary-600 mt-1 font-mono">{stats.active_repairs || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Completed</p>
          <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{stats.completed_repairs || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Pending Balance</p>
          <p className="text-2xl font-black text-rose-600 mt-1 font-mono">${stats.pending_payments?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Spent</p>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">${stats.total_spent?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      {/* Customer Info & Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <Card title="Contact Information" className="md:col-span-1">
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500 text-[11px]">Type / Gender:</span>
              <span className="font-semibold text-slate-800">
                {customer?.user_type || 'End User'} • <span className="capitalize">{customer?.gender || 'male'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Primary Phone</p>
                  <p className="font-mono font-semibold text-slate-900">{customer?.phone}</p>
                </div>
              </div>
            </div>

            {customer?.whatsapp_number && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Primary WhatsApp</p>
                    <p className="font-mono font-semibold text-slate-900">{customer.whatsapp_number}</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${customer.whatsapp_number.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[10px]"
                >
                  Chat
                </a>
              </div>
            )}

            {/* Alternate Contacts */}
            {customer?.alternate_phone && (
              <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Alternate Phone</p>
                  <p className="font-mono font-semibold text-slate-900">{customer.alternate_phone}</p>
                </div>
              </div>
            )}

            {customer?.alternate_whatsapp && (
              <div className="flex items-center justify-between p-2 bg-emerald-50/70 border border-emerald-200/80 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-emerald-800 text-[10px] uppercase font-bold">Alt WhatsApp (In-Repair)</p>
                    <p className="font-mono font-bold text-emerald-950">{customer.alternate_whatsapp}</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${customer.alternate_whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-[10px] shadow-2xs"
                  title="Direct chat while customer's phone is held in repair"
                >
                  Chat Alt
                </a>
              </div>
            )}

            {customer?.email && (
              <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Email (Mail ID)</p>
                  <p className="font-semibold text-slate-900 truncate max-w-xs">{customer.email}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 pt-1 border-t border-slate-100">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Address</p>
                <p className="font-semibold text-slate-900">
                  {customer?.address || 'No address provided'}
                  {customer?.city ? `, ${customer.city}` : ''}
                  {customer?.state ? `, ${customer.state} ${customer.postal_code || ''}` : ''}
                </p>
              </div>
            </div>

            {customer?.notes && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 mt-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Customer Notes</p>
                <p className="text-slate-700 italic">{customer.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Devices Registered Card */}
        <Card title={`Customer Devices (${devices.length})`} className="md:col-span-2">
          {devices.length === 0 ? (
            <p className="text-slate-400 text-xs italic py-4 text-center">No devices registered under this customer yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {devices.map((device) => (
                <div key={device.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 text-primary-600">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-slate-900 text-xs">{device.brand} {device.model}</h5>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">IMEI: {device.imei || 'Not recorded'}</p>
                    <p className="text-[11px] text-slate-500">{device.color || ''} {device.storage_capacity ? `• ${device.storage_capacity}` : ''}</p>
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
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px] whitespace-nowrap">
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
                <tbody className="divide-y divide-slate-100">
                  {jobs
                    .slice((jobPage - 1) * jobPageSize, jobPage * jobPageSize)
                    .map((job) => (
                      <tr
                        key={job.id}
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5 font-mono font-bold text-primary-600 whitespace-nowrap">
                          {job.job_number}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                          {job.device?.brand} {job.device?.model}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate whitespace-nowrap" title={job.customer_complaint}>
                          {job.customer_complaint || '—'}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <Badge status={job.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-700 whitespace-nowrap">
                          ₹{Number(job.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-emerald-600 font-semibold whitespace-nowrap">
                          ₹{Number(job.paid_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold whitespace-nowrap">
                          {job.balance_due > 0 ? (
                            <span className="text-rose-600">₹{Number(job.balance_due).toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-400">₹0</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                          {new Date(job.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/jobs/${job.id}`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
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
