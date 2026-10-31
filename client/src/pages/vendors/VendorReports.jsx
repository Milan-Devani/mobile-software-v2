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
import { SpatialDateFilter } from '../../components/common/SpatialDateFilter';
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
  const [datePreset, setDatePreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [flowFilter, setFlowFilter] = useState('ALL');
  const [imeiSearch, setImeiSearch] = useState('');

  // Fetch vendors
  const fetchVendors = async () => {
    try {
      const res = await vendorService.getVendors({ limit: 100 });
      setVendors(res?.data?.vendors || res?.vendors || []);
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

  // Date filter handler
  const handleDateFilterChange = ({ preset, startDate: start, endDate: end }) => {
    setDatePreset(preset);
    setStartDate(start);
    setEndDate(end);
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
    <div className="space-y-6 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--spatial-text-title)] flex items-center gap-2">
                Vendor Reports & Analytics
              </h1>
              <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5">
                Detailed metrics on repair volumes, handset turnaround, IMEI audit histories, and balance positions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[var(--spatial-bg-card)] hover:bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-body)] border border-[var(--spatial-border)] transition-all active:scale-95 flex items-center gap-2 text-sm cursor-pointer"
            title="Refresh Report"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-apple-blue' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={exportToCSV}
            className="px-3.5 py-2.5 rounded-xl bg-[var(--spatial-bg-card)] hover:bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-body)] border border-[var(--spatial-border)] transition-all active:scale-95 flex items-center gap-2 text-sm font-medium cursor-pointer"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Export Excel/CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2.5 rounded-xl bg-[var(--spatial-bg-card)] hover:bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-body)] border border-[var(--spatial-border)] transition-all active:scale-95 flex items-center gap-2 text-sm font-medium cursor-pointer"
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
      <div className="spatial-card p-4 rounded-2xl space-y-4 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Vendor */}
          <div className="lg:col-span-4">
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">Filter Vendor</label>
            <SpatialSelect
              options={vendorSelectOptions}
              value={selectedVendorId}
              onChange={setSelectedVendorId}
              searchable={true}
              placeholder="All Vendors"
            />
          </div>

          {/* Direction Flow */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">Flow Direction</label>
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

          {/* Date Range Filter */}
          <div className="lg:col-span-5">
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">Date Range</label>
            <SpatialDateFilter
              preset={datePreset}
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateFilterChange}
            />
          </div>
        </div>
      </div>

      {/* Report Sub-Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-[var(--spatial-border)] pb-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'overview', label: 'Executive Overview', icon: BarChart3 },
          { key: 'mobile_history', label: 'Mobile History & IMEI Audit', icon: Smartphone },
          { key: 'vendor_wise', label: 'Vendor-wise Performance', icon: Building2 },
          { key: 'balances', label: 'Outstanding Balances & Dues', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeReportTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveReportTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-apple-blue text-white shadow-xs'
                  : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeReportTab === 'overview' && (
        <div key="overview" className="space-y-6 spatial-tab-pane">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="spatial-card p-4 rounded-2xl">
              <span className="text-xs text-[var(--spatial-text-muted)] font-medium">Total Handsets Handled</span>
              <div className="text-2xl font-bold text-[var(--spatial-text-title)] mt-1 tabular-nums">
                {reportData?.metrics?.total_mobiles || 0}
              </div>
              <span className="text-[11px] text-[var(--spatial-text-muted)] mt-1 block">Devices tracked in period</span>
            </div>

            <div className="spatial-card p-4 rounded-2xl border-apple-blue/20 bg-apple-blue/5">
              <span className="text-xs text-apple-blue font-medium">Total Dispatched (Sent)</span>
              <div className="text-2xl font-bold text-apple-blue mt-1 tabular-nums">
                {reportData?.metrics?.sent_count || 0}
              </div>
              <span className="text-[11px] text-apple-blue/80 mt-1 block">Outward repair assignments</span>
            </div>

            <div className="spatial-card p-4 rounded-2xl border-emerald-500/20 bg-emerald-500/5">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Received / Returned</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {reportData?.metrics?.returned_count || 0}
              </div>
              <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 block">Successfully processed back</span>
            </div>

            <div className="spatial-card p-4 rounded-2xl border-amber-500/20 bg-amber-500/5">
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Currently in Lab (Pending)</span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                {reportData?.metrics?.pending_count || 0}
              </div>
              <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1 block">Awaiting completion / return</span>
            </div>
          </div>

          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="spatial-card p-4 rounded-2xl">
              <span className="text-xs text-[var(--spatial-text-muted)] font-medium">Total Incurred Repair Cost</span>
              <div className="text-2xl font-bold text-apple-blue mt-1 tabular-nums">
                ₹{parseFloat(reportData?.metrics?.total_actual_cost || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-[var(--spatial-text-muted)] mt-1 block">Charges billed by vendor labs</span>
            </div>

            <div className="spatial-card p-4 rounded-2xl">
              <span className="text-xs text-[var(--spatial-text-muted)] font-medium">Total Disbursed Payments</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                ₹{parseFloat(reportData?.metrics?.total_paid_to_vendors || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-[var(--spatial-text-muted)] mt-1 block">Payments made to vendors</span>
            </div>

            <div className="spatial-card p-4 rounded-2xl">
              <span className="text-xs text-[var(--spatial-text-muted)] font-medium">B2B Funds Received</span>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
                ₹{parseFloat(reportData?.metrics?.total_received_from_vendors || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-[var(--spatial-text-muted)] mt-1 block">Collected for vendor inward repairs</span>
            </div>
          </div>

          {/* Quick Vendor Summary Table */}
          <div className="spatial-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--spatial-border)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--spatial-text-title)]">Vendor Performance Summary</h3>
              <button
                onClick={() => setActiveReportTab('vendor_wise')}
                className="text-xs text-apple-blue hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                View Complete Breakdown <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-xs text-[var(--spatial-text-muted)] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4 text-center">Total Sent</th>
                    <th className="py-3 px-4 text-center">Returned</th>
                    <th className="py-3 px-4 text-center">In Lab</th>
                    <th className="py-3 px-4 text-right">Repair Cost</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {vendorBreakdown.slice(0, 6).map((v) => (
                    <tr key={v.id} className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--spatial-text-title)]">{v.name}</div>
                        <div className="text-xs text-[var(--spatial-text-muted)]">{v.shop_name || 'Vendor'}</div>
                      </td>
                      <td className="py-3 px-4 text-center tabular-nums font-mono text-[var(--spatial-text-body)]">{v.total_sent}</td>
                      <td className="py-3 px-4 text-center tabular-nums font-mono text-emerald-600 dark:text-emerald-400 font-medium">{v.total_returned}</td>
                      <td className="py-3 px-4 text-center tabular-nums font-mono text-amber-600 dark:text-amber-400 font-medium">{v.pending_count}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-mono text-[var(--spatial-text-title)]">₹{v.total_repair_cost.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-mono font-bold">
                        {v.current_balance > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">₹{parseFloat(v.current_balance).toLocaleString('en-IN')} Cr</span>
                        ) : v.current_balance < 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">₹{Math.abs(parseFloat(v.current_balance)).toLocaleString('en-IN')} Dr</span>
                        ) : (
                          <span className="text-[var(--spatial-text-muted)]">₹0</span>
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
        <div key="mobile_history" className="space-y-4 spatial-tab-pane">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--spatial-text-muted)]" />
            <input
              type="text"
              placeholder="Search by IMEI Number, Serial, Device Brand, Model, or Customer Name..."
              value={imeiSearch}
              onChange={(e) => setImeiSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl spatial-input text-sm"
            />
          </div>

          <div className="spatial-card rounded-2xl overflow-hidden">
            {filteredMobiles.length === 0 ? (
              <div className="p-12 text-center text-[var(--spatial-text-muted)]">
                <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No handsets found matching your search criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-xs text-[var(--spatial-text-muted)] uppercase tracking-wider font-semibold">
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
                  <tbody className="divide-y divide-[var(--spatial-border)]">
                    {filteredMobiles.map((mob) => (
                      <tr key={mob.id} className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[var(--spatial-text-title)]">{mob.brand} {mob.model}</div>
                          <div className="text-xs font-mono text-apple-blue font-medium">IMEI: {mob.imei || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--spatial-text-body)]">
                          {mob.customer_name || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs font-medium text-[var(--spatial-text-title)]">{mob.vendor?.name || 'Vendor'}</div>
                          <div className="text-[11px] text-[var(--spatial-text-muted)]">{mob.vendor?.shop_name}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs text-xs text-amber-600 dark:text-amber-400 font-medium">
                          {mob.repair_problem}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono tabular-nums text-[var(--spatial-text-muted)] whitespace-nowrap">
                          {mob.sent_date || mob.created_at?.split('T')[0]}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono tabular-nums text-[var(--spatial-text-muted)] whitespace-nowrap">
                          {mob.returned_date || mob.received_date || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] text-[var(--spatial-text-body)]">
                            {mob.current_status}
                          </span>
                          {mob.repair_result && mob.repair_result !== 'PENDING' && (
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                              Result: {mob.repair_result}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <div className="text-[var(--spatial-text-title)] font-semibold">
                            ₹{parseFloat(mob.actual_cost || mob.estimated_cost || 0).toLocaleString('en-IN')}
                          </div>
                          {parseFloat(mob.actual_cost || 0) > 0 && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Actual</div>
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
        <div key="vendor_wise" className="spatial-card rounded-2xl overflow-hidden spatial-tab-pane">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-xs text-[var(--spatial-text-muted)] uppercase tracking-wider font-semibold">
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
              <tbody className="divide-y divide-[var(--spatial-border)]">
                {vendorBreakdown.map((v) => (
                  <tr key={v.id} className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[var(--spatial-text-title)]">{v.name}</div>
                      <div className="text-xs text-[var(--spatial-text-muted)]">{v.shop_name}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--spatial-text-muted)]">
                      <div>{v.mobile || '-'}</div>
                      {v.gst_number && <div className="text-[10px]">GST: {v.gst_number}</div>}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-[var(--spatial-text-body)] font-medium">{v.total_sent}</td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">{v.total_returned}</td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-amber-600 dark:text-amber-400 font-bold">{v.pending_count}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--spatial-text-title)]">₹{v.total_repair_cost.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">₹{v.total_paid.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold">
                      {v.current_balance > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">₹{parseFloat(v.current_balance).toLocaleString('en-IN')} Cr</span>
                      ) : v.current_balance < 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">₹{Math.abs(parseFloat(v.current_balance)).toLocaleString('en-IN')} Dr</span>
                      ) : (
                        <span className="text-[var(--spatial-text-muted)]">₹0</span>
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
        <div key="balances" className="spatial-card rounded-2xl overflow-hidden spatial-tab-pane">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-xs text-[var(--spatial-text-muted)] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Vendor Partner</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Opening Bal (₹)</th>
                  <th className="py-3 px-4 text-right">Net Current Balance (₹)</th>
                  <th className="py-3 px-4">Financial Status</th>
                  <th className="py-3 px-4 text-center">Ledger Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--spatial-border)]">
                {vendors.map((v) => {
                  const bal = parseFloat(v.current_balance || 0);
                  const isPayable = bal > 0;
                  const isReceivable = bal < 0;

                  return (
                    <tr key={v.id} className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--spatial-text-title)]">{v.name}</div>
                        <div className="text-xs text-[var(--spatial-text-muted)]">{v.shop_name}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--spatial-text-muted)]">
                        {v.mobile}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--spatial-text-muted)]">
                        ₹{parseFloat(v.opening_balance || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-base">
                        {isPayable ? (
                          <span className="text-amber-600 dark:text-amber-400">₹{bal.toLocaleString('en-IN')}</span>
                        ) : isReceivable ? (
                          <span className="text-emerald-600 dark:text-emerald-400">₹{Math.abs(bal).toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-[var(--spatial-text-muted)]">₹0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isPayable ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Payable (We Owe Vendor)
                          </span>
                        ) : isReceivable ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Receivable (Vendor Owes Us)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-muted)] border border-[var(--spatial-border)]">
                            Settled / Nil Balance
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => navigate(`/vendors/ledger?vendorId=${v.id}`)}
                          className="px-3.5 py-1.5 rounded-xl bg-apple-blue hover:bg-apple-blue/90 text-white text-xs font-medium transition active:scale-95 shadow-xs cursor-pointer"
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
