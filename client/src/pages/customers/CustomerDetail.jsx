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
  MessageCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { customerService } from '../../services/customerService';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
    return <LoadingSpinner label="Loading customer profile..." />;
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

        <Button
          icon={Plus}
          onClick={() => navigate(`/jobs/new?customer_id=${customer.id}`)}
        >
          Create Repair Job
        </Button>
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
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Primary Phone</p>
                <p className="font-semibold text-slate-900">{customer?.phone}</p>
              </div>
            </div>

            {customer?.whatsapp_number && (
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">WhatsApp</p>
                  <p className="font-semibold text-slate-900">{customer.whatsapp_number}</p>
                </div>
              </div>
            )}

            {customer?.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Email</p>
                  <p className="font-semibold text-slate-900 truncate max-w-xs">{customer.email}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3">Job Number</th>
                  <th className="px-5 py-3">Device & Model</th>
                  <th className="px-5 py-3">Reported Issue</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Estimate</th>
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-primary-600">
                      {job.job_number}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {job.device?.brand} {job.device?.model}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                      {job.customer_complaint}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={job.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                      ${Number(job.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-emerald-600 font-semibold">
                      ${Number(job.paid_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold">
                      {job.balance_due > 0 ? (
                        <span className="text-rose-600">${Number(job.balance_due).toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">$0.00</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-center">
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
        )}
      </Card>
    </div>
  );
};
