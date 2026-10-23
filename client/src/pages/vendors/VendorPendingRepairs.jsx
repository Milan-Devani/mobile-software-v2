import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Wrench,
  Search,
  Filter,
  RefreshCw,
  Phone,
  MessageSquare,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  History,
  Send,
  Building2,
  Calendar,
  X,
  ExternalLink,
  Smartphone,
  Info
} from 'lucide-react';
import VendorNavTabs from '../../components/vendors/VendorNavTabs';
import { vendorService } from '../../services/vendorService';
import SpatialSelect from '../../components/common/SpatialSelect';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Active Statuses' },
  { value: 'PENDING', label: 'Pending / In Queue' },
  { value: 'IN_REPAIR', label: 'In Repair / Work in Progress' },
  { value: 'WAITING_PARTS', label: 'Waiting for Parts / Spares' },
  { value: 'REPAIR_COMPLETED', label: 'Repair Completed' },
  { value: 'READY_FOR_RETURN', label: 'Ready for Collection / Return' },
  { value: 'NOT_REPAIRABLE', label: 'Not Repairable' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const FLOW_OPTIONS = [
  { value: 'ALL', label: 'All Direction Flows' },
  { value: 'SENT_TO_VENDOR', label: 'Sent to Vendor (Outward Lab)' },
  { value: 'VENDOR_JOB_INWARD', label: 'Received from Vendor (Inward B2B)' },
];

export default function VendorPendingRepairs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mobiles, setMobiles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedVendor, setSelectedVendor] = useState(searchParams.get('vendorId') || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'ALL');
  const [selectedFlow, setSelectedFlow] = useState(searchParams.get('flow') || 'SENT_TO_VENDOR');

  // Status Update Modal State
  const [statusModalMobile, setStatusModalMobile] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // History Modal State
  const [historyMobile, setHistoryMobile] = useState(null);

  const fetchVendors = async () => {
    try {
      const res = await vendorService.getVendors({ limit: 100 });
      setVendors(res.vendors || []);
    } catch (err) {
      console.error('Failed to load vendors', err);
    }
  };

  const fetchMobiles = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = {
        limit: 200,
        sortBy: 'created_at',
        sortDir: 'desc',
      };
      if (selectedVendor && selectedVendor !== 'ALL') params.vendorId = selectedVendor;
      if (selectedFlow && selectedFlow !== 'ALL') params.flowType = selectedFlow;
      if (selectedStatus && selectedStatus !== 'ALL') params.status = selectedStatus;
      if (search.trim()) params.search = search.trim();

      const res = await vendorService.getVendorMobiles(params);
      
      // Filter out RETURNED and CANCELLED by default unless specifically selected
      let items = res.mobiles || [];
      if (selectedStatus === 'ALL') {
        items = items.filter((m) => !['RETURNED'].includes(m.current_status));
      }

      setMobiles(items);
    } catch (err) {
      console.error('Failed to load vendor mobiles', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedVendor, selectedFlow, selectedStatus, search]);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    fetchMobiles();
  }, [fetchMobiles]);

  // Update query params in URL
  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (selectedVendor !== 'ALL') params.vendorId = selectedVendor;
    if (selectedStatus !== 'ALL') params.status = selectedStatus;
    if (selectedFlow !== 'SENT_TO_VENDOR') params.flow = selectedFlow;
    setSearchParams(params, { replace: true });
  }, [search, selectedVendor, selectedStatus, selectedFlow, setSearchParams]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    return {
      total: mobiles.length,
      inRepair: mobiles.filter((m) => m.current_status === 'IN_REPAIR').length,
      waitingParts: mobiles.filter((m) => m.current_status === 'WAITING_PARTS').length,
      readyReturn: mobiles.filter((m) => m.current_status === 'READY_FOR_RETURN' || m.current_status === 'REPAIR_COMPLETED').length,
      pending: mobiles.filter((m) => m.current_status === 'PENDING').length,
    };
  }, [mobiles]);

  const handleOpenStatusModal = (mobile) => {
    setStatusModalMobile(mobile);
    setNewStatus(mobile.current_status || 'PENDING');
    setStatusRemarks('');
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!statusModalMobile || !newStatus) return;

    try {
      setUpdatingStatus(true);
      await vendorService.updateMobileStatus(statusModalMobile.id, newStatus, statusRemarks);
      setStatusModalMobile(null);
      await fetchMobiles();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const calculateDaysSince = (dateStr) => {
    if (!dateStr) return 0;
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'PENDING':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">Pending</span>;
      case 'IN_REPAIR':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse">In Repair</span>;
      case 'WAITING_PARTS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">Waiting Parts</span>;
      case 'REPAIR_COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Completed</span>;
      case 'READY_FOR_RETURN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Ready for Return</span>;
      case 'RETURNED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Returned</span>;
      case 'NOT_REPAIRABLE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">Not Repairable</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/30">{st}</span>;
    }
  };

  const vendorSelectOptions = [
    { value: 'ALL', label: 'All Vendors' },
    ...vendors.map((v) => ({
      value: v.id,
      label: `${v.name} (${v.shop_name || 'Vendor'})`,
    })),
  ];

  return (
    <div className="min-h-screen text-slate-100 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Pending Vendor Repairs & Queue
              </h1>
              <p className="text-xs text-slate-400">
                Track all handsets actively dispatched to third-party labs or received from vendors for repair.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMobiles}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-2 text-sm"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => navigate('/vendors/send')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
          >
            <Send className="w-4 h-4" />
            Send Mobiles
          </button>

          <button
            onClick={() => navigate('/vendors/receive')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            <CheckCircle className="w-4 h-4" />
            Receive / Inward
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <VendorNavTabs activeTab="pending" />

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
          <span className="text-xs text-slate-400 font-medium block">Total In Lab</span>
          <span className="text-xl font-bold text-white mt-1 block">{summaryCounts.total}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md">
          <span className="text-xs text-amber-400 font-medium block">Pending Start</span>
          <span className="text-xl font-bold text-amber-300 mt-1 block">{summaryCounts.pending}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 backdrop-blur-md">
          <span className="text-xs text-blue-400 font-medium block">In Repair</span>
          <span className="text-xl font-bold text-blue-300 mt-1 block">{summaryCounts.inRepair}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 backdrop-blur-md">
          <span className="text-xs text-purple-400 font-medium block">Waiting Parts</span>
          <span className="text-xl font-bold text-purple-300 mt-1 block">{summaryCounts.waitingParts}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-md col-span-2 sm:col-span-1">
          <span className="text-xs text-cyan-400 font-medium block">Ready for Return</span>
          <span className="text-xl font-bold text-cyan-300 mt-1 block">{summaryCounts.readyReturn}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Brand, Model, IMEI, Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Vendor Filter */}
          <div>
            <SpatialSelect
              options={vendorSelectOptions}
              value={selectedVendor}
              onChange={setSelectedVendor}
              placeholder="Filter by Vendor"
            />
          </div>

          {/* Status Filter */}
          <div>
            <SpatialSelect
              options={STATUS_OPTIONS}
              value={selectedStatus}
              onChange={setSelectedStatus}
              placeholder="Filter by Status"
            />
          </div>

          {/* Flow Filter */}
          <div>
            <SpatialSelect
              options={FLOW_OPTIONS}
              value={selectedFlow}
              onChange={setSelectedFlow}
              placeholder="Filter by Flow"
            />
          </div>
        </div>
      </div>

      {/* Pending Mobiles Table */}
      <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span>Loading active repair queue...</span>
          </div>
        ) : mobiles.length === 0 ? (
          <div className="p-12 text-center">
            <Smartphone className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No Pending Mobiles Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are currently no active repair devices matching your chosen filters. Send mobiles to vendors to track them here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/70 border-b border-slate-700/70 text-xs text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Device & Identity</th>
                  <th className="py-3 px-4">Vendor Partner</th>
                  <th className="py-3 px-4">Fault & Problem</th>
                  <th className="py-3 px-4">Timeline / Aging</th>
                  <th className="py-3 px-4">Repair Status</th>
                  <th className="py-3 px-4 text-right">Est. Cost</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {mobiles.map((mob) => {
                  const daysInLab = calculateDaysSince(mob.sent_date || mob.created_at);
                  const isLongStay = daysInLab > 7;

                  return (
                    <tr key={mob.id} className="hover:bg-slate-700/30 transition">
                      {/* Device & Identity */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{mob.brand} {mob.model}</span>
                          {mob.flow_type === 'VENDOR_JOB_INWARD' ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              B2B Client Job
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              Outward Sent
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 font-mono">
                          IMEI: {mob.imei || 'N/A'}
                        </div>
                        {mob.customer_name && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Customer: <span className="text-slate-300">{mob.customer_name}</span>
                          </div>
                        )}
                      </td>

                      {/* Vendor Partner */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">
                          {mob.vendor?.name || 'Assigned Vendor'}
                        </div>
                        {mob.vendor?.shop_name && (
                          <div className="text-xs text-slate-400">{mob.vendor.shop_name}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {mob.vendor?.mobile && (
                            <a
                              href={`tel:${mob.vendor.mobile}`}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              {mob.vendor.mobile}
                            </a>
                          )}
                          {mob.vendor?.whatsapp && (
                            <a
                              href={`https://wa.me/${mob.vendor.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${mob.vendor.name}, inquiry regarding pending device ${mob.brand} ${mob.model} (IMEI: ${mob.imei}) sent for repair.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 ml-2"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Fault & Problem */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-xs text-amber-300 font-medium">
                          {mob.repair_problem || 'General Service / Repair'}
                        </div>
                        {mob.condition && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate" title={mob.condition}>
                            Condition: {mob.condition}
                          </div>
                        )}
                        {mob.accessories && (
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate" title={mob.accessories}>
                            Acc: {mob.accessories}
                          </div>
                        )}
                      </td>

                      {/* Timeline / Aging */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Sent: {mob.sent_date || mob.created_at?.split('T')[0]}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs">
                          <Clock className={`w-3.5 h-3.5 ${isLongStay ? 'text-rose-400' : 'text-slate-400'}`} />
                          <span className={isLongStay ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                            {daysInLab} day{daysInLab === 1 ? '' : 's'} in lab
                          </span>
                        </div>
                        {mob.expected_return_date && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Exp: {mob.expected_return_date}
                          </div>
                        )}
                      </td>

                      {/* Repair Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(mob.current_status)}
                        {mob.status_history && mob.status_history.length > 0 && (
                          <button
                            onClick={() => setHistoryMobile(mob)}
                            className="block mt-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                          >
                            <History className="w-3 h-3" />
                            {mob.status_history.length} update(s)
                          </button>
                        )}
                      </td>

                      {/* Est. Cost */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-semibold text-slate-200">
                          ₹{parseFloat(mob.estimated_cost || 0).toLocaleString('en-IN')}
                        </div>
                        {parseFloat(mob.actual_cost || 0) > 0 && (
                          <div className="text-[11px] text-emerald-400 mt-0.5">
                            Actual: ₹{parseFloat(mob.actual_cost).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenStatusModal(mob)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-cyan-300 text-xs font-medium transition flex items-center gap-1 border border-slate-600"
                            title="Update Status"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            Update
                          </button>

                          {mob.flow_type === 'SENT_TO_VENDOR' ? (
                            <button
                              onClick={() => navigate(`/vendors/receive?vendorId=${mob.vendor_id}&mobileId=${mob.id}`)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium transition flex items-center gap-1"
                              title="Receive this handset from vendor"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Receive
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/vendors/receive?tab=return&vendorId=${mob.vendor_id}&mobileId=${mob.id}`)}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-medium transition flex items-center gap-1"
                              title="Return device to vendor"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              Return
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {statusModalMobile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  Update Repair Status
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {statusModalMobile.brand} {statusModalMobile.model} (IMEI: {statusModalMobile.imei || 'N/A'})
                </p>
              </div>
              <button
                onClick={() => setStatusModalMobile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  New Status <span className="text-rose-400">*</span>
                </label>
                <SpatialSelect
                  options={[
                    { value: 'PENDING', label: 'Pending (In Queue)' },
                    { value: 'IN_REPAIR', label: 'In Repair (Work in Progress)' },
                    { value: 'WAITING_PARTS', label: 'Waiting for Parts / Spares' },
                    { value: 'REPAIR_COMPLETED', label: 'Repair Completed' },
                    { value: 'READY_FOR_RETURN', label: 'Ready for Collection / Return' },
                    { value: 'NOT_REPAIRABLE', label: 'Not Repairable' },
                    { value: 'CANCELLED', label: 'Cancelled' },
                  ]}
                  value={newStatus}
                  onChange={setNewStatus}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Remarks / Technician Update
                </label>
                <textarea
                  rows={3}
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="e.g. Display ordered from Delhi, motherboard IC reballed, tested ok..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  This change will be logged in the permanent status history with date, time, and your username.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalMobile(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {updatingStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status History Timeline Modal */}
      {historyMobile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  Status Movement History
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {historyMobile.brand} {historyMobile.model} (IMEI: {historyMobile.imei || 'N/A'})
                </p>
              </div>
              <button
                onClick={() => setHistoryMobile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {!historyMobile.status_history || historyMobile.status_history.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No previous status updates recorded.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-700/60 ml-3 pl-5 space-y-5">
                  {historyMobile.status_history.map((hist, idx) => (
                    <div key={hist.id || idx} className="relative group">
                      <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-cyan-500 ring-4 ring-slate-900" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            {hist.new_status}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            by {hist.changed_by || 'Staff'}
                          </span>
                          <span className="text-[11px] text-slate-500 ml-auto">
                            {new Date(hist.created_at).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        {hist.remarks && (
                          <p className="text-xs text-slate-300 mt-1.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/40">
                            {hist.remarks}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setHistoryMobile(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { VendorPendingRepairs };
