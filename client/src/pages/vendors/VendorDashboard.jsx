import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  IndianRupee,
  Plus,
  Search,
  Filter,
  Eye,
  Calendar,
  Printer,
  Share2,
  RefreshCw,
  TrendingUp,
  Smartphone,
  ArrowRight,
  Sparkles,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorNavTabs } from '../../components/vendors/VendorNavTabs';
import { VendorPaymentModal } from '../../components/vendors/VendorPaymentModal';
import { VendorReceiptPrintable } from '../../components/vendors/VendorReceiptPrintable';
import {
  Card,
  LoadingSpinner,
  EmptyState,
  StatsSkeleton,
  TableSkeleton,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { vendorService } from '../../services/vendorService';
import { settingsService } from '../../services/settingsService';
import {
  formatIndianCurrency,
  formatInvoiceDate,
} from '../../utils/billFormatters';

export const VendorDashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentTxns, setRecentTxns] = useState([]);
  const [pendingMobiles, setPendingMobiles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [shopProfile, setShopProfile] = useState(null);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTxnForPrint, setSelectedTxnForPrint] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [
        statsRes,
        txnsRes,
        mobilesRes,
        vendorsRes,
        settingsRes,
      ] = await Promise.allSettled([
        vendorService.getVendorStats(),
        vendorService.getVendorTransactions({ limit: 6 }),
        vendorService.getVendorMobiles({ limit: 8 }),
        vendorService.getVendors({ limit: 100 }),
        settingsService.getSettings(),
      ]);

      if (statsRes.status === 'fulfilled') {
        const statsData = statsRes.value?.data || statsRes.value;
        if (statsData) setStats(statsData);
      }
      if (txnsRes.status === 'fulfilled') {
        const list =
          txnsRes.value?.data?.transactions ||
          txnsRes.value?.transactions ||
          [];
        setRecentTxns(list);
      }
      if (mobilesRes.status === 'fulfilled') {
        const list =
          mobilesRes.value?.data?.mobiles || mobilesRes.value?.mobiles || [];
        // Show active / pending first
        const activeOnly = list.filter(
          (m) => !['RETURNED', 'CANCELLED'].includes(m.current_status)
        );
        setPendingMobiles(activeOnly.length > 0 ? activeOnly : list.slice(0, 5));
      }
      if (vendorsRes.status === 'fulfilled') {
        const list =
          vendorsRes.value?.data?.vendors || vendorsRes.value?.vendors || [];
        setVendors(list);
      }
      if (settingsRes.status === 'fulfilled') {
        const shop =
          settingsRes.value?.data?.shop || settingsRes.value?.shop;
        if (shop) setShopProfile(shop);
      }
    } catch (err) {
      console.error('Failed to load vendor dashboard:', err);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-[28px] font-bold text-[var(--spatial-text-title)] tracking-tight">
                Vendor Management
              </h1>
              <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5">
                Outsource difficult repairs, track phones at outside labs, and
                manage vendor payments
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions in Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={CreditCard}
            onClick={() => setIsPaymentModalOpen(true)}
          >
            Record Payment
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={ArrowDownLeft}
            className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 font-semibold"
            onClick={() => navigate('/vendors/receive')}
          >
            Receive Mobiles
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={ArrowUpRight}
            onClick={() => navigate('/vendors/send')}
          >
            Send Mobiles to Vendor
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <VendorNavTabs activeTab="/vendors" />

      {loading ? (
        <div className="space-y-6">
          <StatsSkeleton count={4} />
          <TableSkeleton rows={5} columns={6} showHeader={false} />
        </div>
      ) : (
        <div className="spatial-tab-pane space-y-6">
          {/* =================================================================== */}
          {/* 2 LARGE ACTION HERO CARDS (Everyday Non-Technical Workflow)         */}
          {/* =================================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Action 1: Send Mobiles Out */}
            <div
              onClick={() => navigate('/vendors/send')}
              className="p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 via-[var(--spatial-bg-card)] to-[var(--spatial-bg-card)] border border-sky-500/30 hover:border-sky-500/60 transition-all cursor-pointer group shadow-sm flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-[var(--spatial-text-title)] group-hover:text-sky-400 transition-colors">
                    Send Mobiles to Outside Lab
                  </h3>
                  <span className="text-sky-400 text-xs font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                    <span>Dispatch</span> &rarr;
                  </span>
                </div>
                <p className="text-xs text-[var(--spatial-text-muted)] mt-1 line-clamp-2">
                  Hand over phones to outside specialists for CPU reballing,
                  glass lamination, Face ID, or micro-soldering.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-sky-400">
                  <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/20">
                    + Dispatch New Phones
                  </span>
                </div>
              </div>
            </div>

            {/* Action 2: Receive Mobiles Back */}
            <div
              onClick={() => navigate('/vendors/receive')}
              className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-[var(--spatial-bg-card)] to-[var(--spatial-bg-card)] border border-emerald-500/30 hover:border-emerald-500/60 transition-all cursor-pointer group shadow-sm flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-[var(--spatial-text-title)] group-hover:text-emerald-400 transition-colors">
                    Receive Mobiles Back
                  </h3>
                  <span className="text-emerald-400 text-xs font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                    <span>Receive</span> &rarr;
                  </span>
                </div>
                <p className="text-xs text-[var(--spatial-text-muted)] mt-1 line-clamp-2">
                  Collect repaired devices returned by outside labs, record
                  vendor repair charges, and update customer job sheets.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                    📥 Receive Handset Back
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* 4 CORE KPI METRICS                                                 */}
          {/* =================================================================== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Total Outside Partner Shops */}
            <div
              onClick={() => navigate('/vendors/list')}
              className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] hover:border-sky-500/40 transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--spatial-text-muted)]">
                  Registered Vendors
                </span>
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--spatial-text-title)] mt-2">
                {stats?.total_vendors || 0}
              </div>
              <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1">
                Outside repair shops & labs
              </p>
            </div>

            {/* 2. Mobiles at Outside Labs Now */}
            <div
              onClick={() => navigate('/vendors/pending')}
              className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] hover:border-amber-500/40 transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--spatial-text-muted)]">
                  Phones at Labs Now
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
                {stats?.mobiles_currently_at_vendors || 0}
              </div>
              <p className="text-[11px] text-amber-400/80 mt-1 flex items-center gap-1 font-medium">
                <span>View pending repairs</span>
                <ArrowRight className="w-3 h-3" />
              </p>
            </div>

            {/* 3. Total We Owe (Payable) */}
            <div
              onClick={() => navigate('/vendors/ledger')}
              className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] hover:border-rose-500/40 transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--spatial-text-muted)]">
                  Total We Owe (Payable)
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
                {formatIndianCurrency(stats?.total_payable || 0, true)}
              </div>
              <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1">
                Dues to outside vendors
              </p>
            </div>

            {/* 4. Completed Returns */}
            <div
              onClick={() =>
                navigate(
                  '/vendors/transactions?txnType=RECEIVE_FROM_VENDOR'
                )
              }
              className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] hover:border-emerald-500/40 transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--spatial-text-muted)]">
                  Phones Returned
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                {stats?.total_mobiles_received || 0}
              </div>
              <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1">
                Repaired phones collected
              </p>
            </div>
          </div>

          {/* =================================================================== */}
          {/* LIVE TRACKER: PHONES CURRENTLY AT OUTSIDE LABS                     */}
          {/* =================================================================== */}
          <Card
            title={`Phones Currently at Outside Labs (${pendingMobiles.length})`}
            subtitle="Track handset models, reported faults, days out, and current repair status"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/vendors/pending')}
              >
                View All Pending ({stats?.mobiles_currently_at_vendors || 0})
              </Button>
            }
            bodyClassName="p-0"
          >
            {pendingMobiles.length === 0 ? (
              <EmptyState
                icon={Smartphone}
                title="No phones currently out for repair"
                description="When you outsource a mobile to an outside shop, it will appear here in real-time."
                actionLabel="Send Mobiles to Vendor"
                onAction={() => navigate('/vendors/send')}
              />
            ) : (
              <div className="overflow-x-auto table-scrollbar w-full pb-2">
                <table className="w-full text-left text-xs min-w-[900px]">
                  <thead className="bg-[var(--spatial-table-header-bg)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-bold text-[11px] whitespace-nowrap">
                    <tr>
                      <th className="py-3.5 px-4">Handset Model</th>
                      <th className="py-3.5 px-4">Outside Lab / Vendor</th>
                      <th className="py-3.5 px-4">Reported Problem</th>
                      <th className="py-3.5 px-4 text-center">Dispatch Date</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Estimated Cost</th>
                      <th className="py-3.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--spatial-border)]">
                    {pendingMobiles.map((mob) => {
                      const isAtLab = !['RETURNED', 'CANCELLED'].includes(
                        mob.current_status
                      );
                      return (
                        <tr
                          key={mob.id}
                          onClick={() =>
                            navigate(
                              `/vendors/pending?search=${
                                mob.imei || mob.model
                              }`
                            )
                          }
                          className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-sm text-[var(--spatial-text-title)]">
                              {mob.brand} {mob.model}
                            </div>
                            {mob.imei && (
                              <div className="font-mono text-xs text-[var(--spatial-text-muted)] mt-0.5">
                                IMEI: {mob.imei}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-[var(--spatial-text-title)]">
                            {mob.vendor_shop_name ||
                              mob.vendor_name ||
                              'Outside Lab'}
                          </td>

                          <td
                            className="py-3.5 px-4 max-w-xs text-[var(--spatial-text-body)] truncate"
                            title={mob.repair_problem}
                          >
                            {mob.repair_problem || 'Motherboard Repair'}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap text-[var(--spatial-text-muted)] font-mono text-xs">
                            {formatInvoiceDate(mob.sent_date || mob.created_at)}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase ${
                                isAtLab
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {mob.current_status?.replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[var(--spatial-text-title)] whitespace-nowrap">
                            {formatIndianCurrency(mob.estimated_cost || 0, true)}
                          </td>

                          <td
                            className="py-3.5 px-4 text-center whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/vendors/receive?vendorId=${mob.vendor_id}`
                                )
                              }
                              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 transition-all cursor-pointer"
                              title="Receive this phone back"
                            >
                              Receive Back
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* =================================================================== */}
          {/* RECENT DISPATCHES & CHALLANS                                        */}
          {/* =================================================================== */}
          <Card
            title="Recent Challans & Dispatches"
            subtitle="Delivery slips and receipts generated for outside vendors"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/vendors/transactions')}
              >
                View All Challans
              </Button>
            }
            bodyClassName="p-0"
          >
            {recentTxns.length === 0 ? (
              <EmptyState
                icon={ArrowUpRight}
                title="No recent transactions"
                description="Challan receipts will appear here when phones are dispatched."
                actionLabel="Send Mobiles to Vendor"
                onAction={() => navigate('/vendors/send')}
              />
            ) : (
              <div className="overflow-x-auto table-scrollbar w-full pb-2">
                <table className="w-full text-left text-xs min-w-[850px]">
                  <thead className="bg-[var(--spatial-table-header-bg)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-bold text-[11px] whitespace-nowrap">
                    <tr>
                      <th className="py-3.5 px-4">Challan #</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Vendor / Shop</th>
                      <th className="py-3.5 px-4 text-center">Type</th>
                      <th className="py-3.5 px-4 text-center">Phones</th>
                      <th className="py-3.5 px-4 text-right">Amount</th>
                      <th className="py-3.5 px-4 text-center">Print</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--spatial-border)]">
                    {recentTxns.map((txn) => {
                      const isOutward =
                        txn.txn_type === 'SEND_TO_VENDOR' ||
                        txn.txn_type === 'VENDOR_JOB_RETURN';
                      return (
                        <tr
                          key={txn.id}
                          onClick={() => setSelectedTxnForPrint(txn)}
                          className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                            #{txn.txn_number}
                          </td>
                          <td className="py-3 px-4 text-[var(--spatial-text-muted)] whitespace-nowrap font-mono text-xs">
                            {formatInvoiceDate(txn.txn_date || txn.created_at)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[var(--spatial-text-title)] whitespace-nowrap">
                            {txn.vendor_shop_name ||
                              txn.vendor_name ||
                              'Outside Lab'}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isOutward
                                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {txn.txn_type?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-[var(--spatial-text-title)] whitespace-nowrap">
                            {txn.total_mobiles || txn.mobiles?.length || 0}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[var(--spatial-text-title)] whitespace-nowrap">
                            {formatIndianCurrency(txn.total_cost || 0, true)}
                          </td>
                          <td
                            className="py-3 px-4 text-center whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedTxnForPrint(txn)}
                              className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                              title="Print Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Payment Modal */}
      <VendorPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        vendors={vendors}
        onPaymentRecorded={() => fetchDashboardData()}
      />

      {/* Print Receipt Modal */}
      {selectedTxnForPrint && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative max-w-4xl w-full my-auto mx-auto">
            <VendorReceiptPrintable
              transaction={selectedTxnForPrint}
              shop={shopProfile}
              onClose={() => setSelectedTxnForPrint(null)}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default VendorDashboard;
