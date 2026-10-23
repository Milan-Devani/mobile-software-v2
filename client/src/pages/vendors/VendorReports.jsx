import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Building2,
  Smartphone,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  CreditCard,
  IndianRupee,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import VendorNavTabs from '../../components/vendors/VendorNavTabs';
import { vendorService } from '../../services/vendorService';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { formatIndianCurrency } from '../../utils/billFormatters';

export default function VendorReports() {
  const navigate = useNavigate();

  // Active Report Subtab
  const [activeReportTab, setActiveReportTab] = useState('overview'); // 'overview' | 'mobile_history' | 'vendor_wise' | 'balances'

  // Data
  const [vendors, setVendors] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedVendorId, setSelectedVendorId] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [flowFilter, setFlowFilter] = useState('ALL');
  const [imeiSearch, setImeiSearch] = useState('');

  // Fetch vendors
  const fetchVendors = async () => {
    try {
      const res = await vendorService.getVendors({ limit: 100 });
      setVendors(res.vendors || []);
    } catch (err) {
      console.error('Failed to load vendors', err);
    }
  };

  // Fetch report data
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedVendorId && selectedVendorId !== 'ALL') params.vendorId = selectedVendorId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
      if (flowFilter && flowFilter !== 'ALL') params.flowType = flowFilter;

      const res = await vendorService.getVendorReports(params);
      setReportData(res.data || res);
    } catch (err) {
      console.error('Failed to load vendor reports', err);
    } finally {
      setLoading(false);
    }
  }, [selectedVendorId, startDate, endDate, statusFilter, flowFilter]);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Quick Date Helpers
  const handleQuickDate = (preset) => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'THIS_MONTH') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(format(first));
      setEndDate(format(today));
    } else if (preset === 'LAST_MONTH') {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(format(first));
      setEndDate(format(last));
    }
  };

  // Filtered Mobiles for Mobile History tab
  const filteredMobiles = useMemo(() => {
    if (!reportData || !reportData.mobiles) return [];
    if (!imeiSearch.trim()) return reportData.mobiles;
    const term = imeiSearch.toLowerCase().trim();
    return reportData.mobiles.filter(
      (m) =>
        (m.imei || '').toLowerCase().includes(term) ||
        (m.brand || '').toLowerCase().includes(term) ||
        (m.model || '').toLowerCase().includes(term) ||
        (m.customer_name || '').toLowerCase().includes(term) ||
        (m.repair_problem || '').toLowerCase().includes(term)
    );
  }, [reportData, imeiSearch]);

  // Vendor-wise breakdown computed from report data
  const vendorBreakdown = useMemo(() => {
    if (!vendors.length) return [];
    const mobiles = reportData?.mobiles || [];
    const payments = reportData?.payments || [];

    return vendors.map((v) => {
      const vMobiles = mobiles.filter((m) => m.vendor_id === v.id);
      const sent = vMobiles.filter((m) => m.flow_type === 'SENT_TO_VENDOR').length;
      const returned = vMobiles.filter((m) => m.current_status === 'RETURNED').length;
      const pending = vMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status)).length;
      const totalRepairCost = vMobiles.reduce((acc, m) => acc + (parseFloat(m.actual_cost) || 0), 0);
      const vPayments = payments.filter((p) => p.vendor_id === v.id);
      const totalPaid = vPayments
        .filter((p) => p.payment_type === 'PAYMENT_TO_VENDOR')
        .reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

      return {
        ...v,
        total_sent: sent,
        total_returned: returned,
        pending_count: pending,
        total_repair_cost: totalRepairCost,
        total_paid: totalPaid,
      };
    });
  }, [vendors, reportData]);

  // CSV Export Function
  const exportToCSV = () => {
    let headers = [];
    let rows = [];
    let filename = `Vendor_Report_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeReportTab === 'mobile_history' || activeReportTab === 'overview') {
      filename = `Vendor_Mobiles_Report_${new Date().toISOString().split('T')[0]}.csv`;
      headers = [
        'Device Brand & Model',
        'IMEI / Serial',
        'Customer Name',
        'Vendor Name',
        'Flow Direction',
        'Status',
        'Sent Date',
        'Received/Returned Date',
        'Problem',
        'Est. Cost (Rs)',
        'Actual Cost (Rs)',
        'Repair Result',
      ];
      rows = filteredMobiles.map((m) => [
        `"${m.brand} ${m.model}"`,
        `"${m.imei || ''}"`,
        `"${m.customer_name || ''}"`,
        `"${m.vendor?.name || ''}"`,
        `"${m.flow_type}"`,
        `"${m.current_status}"`,
        `"${m.sent_date || ''}"`,
        `"${m.returned_date || m.received_date || ''}"`,
        `"${(m.repair_problem || '').replace(/"/g, '""')}"`,
        m.estimated_cost || 0,
        m.actual_cost || 0,
        `"${m.repair_result || ''}"`,
      ]);
    } else if (activeReportTab === 'balances') {
      filename = `Vendor_Outstanding_Balances_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Vendor Name', 'Shop Name', 'Mobile', 'GSTIN', 'Opening Balance', 'Current Net Balance (Rs)', 'Position'];
      rows = vendors.map((v) => [
        `"${v.name}"`,
        `"${v.shop_name || ''}"`,
        `"${v.mobile || ''}"`,
        `"${v.gst_number || ''}"`,
        v.opening_balance || 0,
        v.current_balance || 0,
        v.current_balance > 0 ? 'Payable (We Owe)' : v.current_balance < 0 ? 'Receivable (Vendor Owes Us)' : 'Balanced',
      ]);
    } else {
      filename = `Vendor_Performance_Summary_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Vendor Name', 'Shop Name', 'Total Sent', 'Total Returned', 'Currently Pending', 'Total Repair Cost (Rs)', 'Total Paid (Rs)', 'Current Balance (Rs)'];
      rows = vendorBreakdown.map((v) => [
        `"${v.name}"`,
        `"${v.shop_name || ''}"`,
        v.total_sent,
        v.total_returned,
        v.pending_count,
        v.total_repair_cost,
        v.total_paid,
        v.current_balance || 0,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Vendor Reports & Analytics
              </h1>
              <p className="text-xs text-slate-400">
                Detailed metrics on repair volumes, handset turnaround, IMEI audit histories, and balance positions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-2 text-sm"
            title="Refresh Report"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={exportToCSV}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-2 text-sm font-medium"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Export Excel/CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-2 text-sm font-medium"
            title="Print Report"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <VendorNavTabs activeTab="reports" />

      {/* Filter and Date Bar */}
      <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Vendor */}
          <div className="lg:col-span-4">
            <label className="block text-xs font-medium text-slate-400 mb-1">Filter Vendor</label>
            <SpatialSelect
              options={vendorSelectOptions}
              value={selectedVendorId}
              onChange={setSelectedVendorId}
              searchable={true}
              placeholder="All Vendors"
            />
          </div>

          {/* Start Date */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* End Date */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Direction Flow */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Flow Direction</label>
            <SpatialSelect
              options={[
                { value: 'ALL', label: 'All Directions' },
                { value: 'SENT_TO_VENDOR', label: 'Sent to Vendor (Outward)' },
                { value: 'VENDOR_JOB_INWARD', label: 'Received (Inward B2B)' },
              ]}
              value={flowFilter}
              onChange={setFlowFilter}
            />
          </div>

          {/* Date Presets */}
          <div className="lg:col-span-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => handleQuickDate('ALL')}
              className={`px-2 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                !startDate && !endDate ? 'bg-cyan-500 text-white' : 'bg-slate-700/60 text-slate-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleQuickDate('THIS_MONTH')}
              className="px-2 py-2 rounded-lg text-xs font-medium bg-slate-700/60 text-slate-300 whitespace-nowrap"
            >
              This Month
            </button>
            <button
              onClick={() => handleQuickDate('LAST_MONTH')}
              className="px-2 py-2 rounded-lg text-xs font-medium bg-slate-700/60 text-slate-300 whitespace-nowrap"
            >
              Last Month
            </button>
          </div>
        </div>
      </div>

      {/* Report Sub-Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-700/60 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveReportTab('overview')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeReportTab === 'overview'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Executive Overview
        </button>

        <button
          onClick={() => setActiveReportTab('mobile_history')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeReportTab === 'mobile_history'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Mobile Repair History & IMEI Audit
        </button>

        <button
          onClick={() => setActiveReportTab('vendor_wise')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeReportTab === 'vendor_wise'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Vendor-wise Performance
        </button>

        <button
          onClick={() => setActiveReportTab('balances')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeReportTab === 'balances'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Outstanding Balances & Dues
        </button>
      </div>

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeReportTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
              <span className="text-xs text-slate-400 font-medium">Total Handsets Handled</span>
              <div className="text-2xl font-bold text-white mt-1">
                {reportData?.metrics?.total_mobiles || 0}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Devices tracked in period</span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 backdrop-blur-md">
              <span className="text-xs text-blue-400 font-medium">Total Dispatched (Sent)</span>
              <div className="text-2xl font-bold text-blue-300 mt-1">
                {reportData?.metrics?.sent_count || 0}
              </div>
              <span className="text-[11px] text-blue-400/80 mt-1 block">Outward repair assignments</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md">
              <span className="text-xs text-emerald-400 font-medium">Received / Returned</span>
              <div className="text-2xl font-bold text-emerald-300 mt-1">
                {reportData?.metrics?.returned_count || 0}
              </div>
              <span className="text-[11px] text-emerald-400/80 mt-1 block">Successfully processed back</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md">
              <span className="text-xs text-amber-400 font-medium">Currently in Lab (Pending)</span>
              <div className="text-2xl font-bold text-amber-300 mt-1">
                {reportData?.metrics?.pending_count || 0}
              </div>
              <span className="text-[11px] text-amber-400/80 mt-1 block">Awaiting completion / return</span>
            </div>
          </div>

          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
              <span className="text-xs text-slate-400 font-medium">Total Incurred Repair Cost</span>
              <div className="text-2xl font-bold text-cyan-300 mt-1">
                ₹{parseFloat(reportData?.metrics?.total_actual_cost || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Charges billed by vendor labs</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
              <span className="text-xs text-slate-400 font-medium">Total Disbursed Payments</span>
              <div className="text-2xl font-bold text-emerald-300 mt-1">
                ₹{parseFloat(reportData?.metrics?.total_paid_to_vendors || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Payments made to vendors</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
              <span className="text-xs text-slate-400 font-medium">B2B Funds Received</span>
              <div className="text-2xl font-bold text-purple-300 mt-1">
                ₹{parseFloat(reportData?.metrics?.total_received_from_vendors || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Collected for vendor inward repairs</span>
            </div>
          </div>

          {/* Quick Vendor Summary Table */}
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md overflow-hidden">
            <div className="p-4 border-b border-slate-700/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Vendor Performance Summary</h3>
              <button
                onClick={() => setActiveReportTab('vendor_wise')}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                View Complete Breakdown <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/70 border-b border-slate-700/70 text-xs text-slate-400 uppercase">
                  <tr>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4 text-center">Total Sent</th>
                    <th className="py-3 px-4 text-center">Returned</th>
                    <th className="py-3 px-4 text-center">In Lab</th>
                    <th className="py-3 px-4 text-right">Repair Cost</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {vendorBreakdown.slice(0, 6).map((v) => (
                    <tr key={v.id} className="hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{v.name}</div>
                        <div className="text-xs text-slate-400">{v.shop_name || 'Vendor'}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{v.total_sent}</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-400">{v.total_returned}</td>
                      <td className="py-3 px-4 text-center font-mono text-amber-400">{v.pending_count}</td>
                      <td className="py-3 px-4 text-right font-mono">₹{v.total_repair_cost.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {v.current_balance > 0 ? (
                          <span className="text-amber-400">₹{parseFloat(v.current_balance).toLocaleString('en-IN')} Cr</span>
                        ) : v.current_balance < 0 ? (
                          <span className="text-emerald-400">₹{Math.abs(parseFloat(v.current_balance)).toLocaleString('en-IN')} Dr</span>
                        ) : (
                          <span className="text-slate-400">₹0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: MOBILE REPAIR HISTORY & IMEI AUDIT */}
      {activeReportTab === 'mobile_history' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by IMEI Number, Serial, Device Brand, Model, or Customer Name..."
              value={imeiSearch}
              onChange={(e) => setImeiSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md overflow-hidden">
            {filteredMobiles.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Smartphone className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p>No handsets found matching your search criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/70 border-b border-slate-700/70 text-xs text-slate-400 uppercase">
                    <tr>
                      <th className="py-3 px-4">Device & IMEI</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Vendor</th>
                      <th className="py-3 px-4">Fault / Problem</th>
                      <th className="py-3 px-4">Sent Date</th>
                      <th className="py-3 px-4">Return Date</th>
                      <th className="py-3 px-4">Status & Result</th>
                      <th className="py-3 px-4 text-right">Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {filteredMobiles.map((mob) => (
                      <tr key={mob.id} className="hover:bg-slate-700/30">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{mob.brand} {mob.model}</div>
                          <div className="text-xs font-mono text-cyan-400">IMEI: {mob.imei || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300">
                          {mob.customer_name || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs font-medium text-slate-200">{mob.vendor?.name || 'Vendor'}</div>
                          <div className="text-[11px] text-slate-400">{mob.vendor?.shop_name}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs text-xs text-amber-300">
                          {mob.repair_problem}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-300 whitespace-nowrap">
                          {mob.sent_date || mob.created_at?.split('T')[0]}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-300 whitespace-nowrap">
                          {mob.returned_date || mob.received_date || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                            {mob.current_status}
                          </span>
                          {mob.repair_result && mob.repair_result !== 'PENDING' && (
                            <span className="block text-[10px] text-emerald-400 mt-0.5 font-medium">
                              Result: {mob.repair_result}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <div className="text-white font-semibold">
                            ₹{parseFloat(mob.actual_cost || mob.estimated_cost || 0).toLocaleString('en-IN')}
                          </div>
                          {parseFloat(mob.actual_cost || 0) > 0 && (
                            <div className="text-[10px] text-emerald-400">Actual</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: VENDOR-WISE PERFORMANCE */}
      {activeReportTab === 'vendor_wise' && (
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/70 border-b border-slate-700/70 text-xs text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Vendor Partner</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4 text-center">Total Sent</th>
                  <th className="py-3 px-4 text-center">Returned</th>
                  <th className="py-3 px-4 text-center">In Lab</th>
                  <th className="py-3 px-4 text-right">Incurred Cost</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {vendorBreakdown.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-700/30">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{v.name}</div>
                      <div className="text-xs text-slate-400">{v.shop_name}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      <div>{v.mobile || '-'}</div>
                      {v.gst_number && <div className="text-[10px] text-slate-500">GST: {v.gst_number}</div>}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium">{v.total_sent}</td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-400 font-medium">{v.total_returned}</td>
                    <td className="py-3 px-4 text-center font-mono text-amber-400 font-bold">{v.pending_count}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-200">₹{v.total_repair_cost.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">₹{v.total_paid.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {v.current_balance > 0 ? (
                        <span className="text-amber-400">₹{parseFloat(v.current_balance).toLocaleString('en-IN')} Cr</span>
                      ) : v.current_balance < 0 ? (
                        <span className="text-emerald-400">₹{Math.abs(parseFloat(v.current_balance)).toLocaleString('en-IN')} Dr</span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: OUTSTANDING BALANCES & DUES */}
      {activeReportTab === 'balances' && (
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/70 border-b border-slate-700/70 text-xs text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Vendor Partner</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Opening Bal (₹)</th>
                  <th className="py-3 px-4 text-right">Net Current Balance (₹)</th>
                  <th className="py-3 px-4">Financial Status</th>
                  <th className="py-3 px-4 text-center">Ledger Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {vendors.map((v) => {
                  const bal = parseFloat(v.current_balance || 0);
                  const isPayable = bal > 0;
                  const isReceivable = bal < 0;

                  return (
                    <tr key={v.id} className="hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{v.name}</div>
                        <div className="text-xs text-slate-400">{v.shop_name}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300">
                        {v.mobile}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        ₹{parseFloat(v.opening_balance || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-base">
                        {isPayable ? (
                          <span className="text-amber-400">₹{bal.toLocaleString('en-IN')}</span>
                        ) : isReceivable ? (
                          <span className="text-emerald-400">₹{Math.abs(bal).toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isPayable ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Payable (We Owe Vendor)
                          </span>
                        ) : isReceivable ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Receivable (Vendor Owes Us)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
                            Settled / Nil Balance
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => navigate(`/vendors/ledger?vendorId=${v.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-medium transition"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export { VendorReports };
