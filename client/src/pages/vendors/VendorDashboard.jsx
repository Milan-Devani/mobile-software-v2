import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorNavTabs } from '../../components/vendors/VendorNavTabs';
import { VendorPaymentModal } from '../../components/vendors/VendorPaymentModal';
import { VendorReceiptPrintable } from '../../components/vendors/VendorReceiptPrintable';
import { Card, LoadingSpinner, EmptyState, StatsSkeleton, TableSkeleton } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { vendorService } from '../../services/vendorService';
import { settingsService } from '../../services/settingsService';
import { formatIndianCurrency, formatInvoiceDate } from '../../utils/billFormatters';

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
      const [statsRes, txnsRes, mobilesRes, vendorsRes, settingsRes] = await Promise.allSettled([
        vendorService.getVendorStats(),
        vendorService.getVendorTransactions({ limit: 6 }),
        vendorService.getVendorMobiles({ status: 'IN_REPAIR', limit: 6 }),
        vendorService.getVendors({ limit: 100 }),
        settingsService.getSettings(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data);
      }
      if (txnsRes.status === 'fulfilled' && txnsRes.value?.data) {
        setRecentTxns(txnsRes.value.data.transactions || []);
      }
      if (mobilesRes.status === 'fulfilled' && mobilesRes.value?.data) {
        setPendingMobiles(mobilesRes.value.data.mobiles || []);
      }
      if (vendorsRes.status === 'fulfilled' && vendorsRes.value?.data) {
        setVendors(vendorsRes.value.data.vendors || []);
      }
      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data?.shop) {
        setShopProfile(settingsRes.value.data.shop);
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-[var(--spatial-text-title)] tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-[#0a84ff] border border-blue-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            Vendor Management
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-1 font-normal">
            Outsource repairs, track multi-mobile movements, manage vendor ledger accounts, and audit balances
          </p>
        </div>

        {/* Quick Actions */}
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
            className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 font-medium"
            onClick={() => navigate('/vendors/receive')}
          >
            Receive from Vendor
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
          <StatsSkeleton count={4} />
          <TableSkeleton rows={5} columns={6} showHeader={false} />
        </div>
      ) : (
        <>
          {/* =================================================================== */}
          {/* 8 DASHBOARD SUMMARY METRIC CARDS                                   */}
          {/* =================================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Total Vendors */}
            <div
              onClick={() => navigate('/vendors/list')}
              className="spatial-card spatial-card-hover p-4 rounded-2xl transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">
                  Total Vendors
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-[#0a84ff] border border-blue-500/15 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-semibold tracking-tight text-[var(--spatial-text-title)] tabular-nums mt-2">
                {stats?.total_vendors || 0}
              </div>
              <p className="text-[10px] text-[var(--spatial-text-muted)] mt-1 font-normal">
                Active service partners & labs
              </p>
            </div>

            {/* 2. Total Mobiles Sent */}
            <div
              onClick={() => navigate('/vendors/transactions?txnType=SEND_TO_VENDOR')}
              className="spatial-card spatial-card-hover p-4 rounded-2xl transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">
                  Mobiles Sent
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/15 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-semibold tracking-tight text-indigo-500 dark:text-indigo-400 tabular-nums mt-2">
                {stats?.total_mobiles_sent || 0}
              </div>
              <p className="text-[10px] text-[var(--spatial-text-muted)] mt-1 font-normal">
                Cumulative outsourced handsets
              </p>
            </div>

            {/* 3. Total Mobiles Received */}
            <div
              onClick={() => navigate('/vendors/transactions?txnType=RECEIVE_FROM_VENDOR')}
              className="spatial-card spatial-card-hover p-4 rounded-2xl transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">
                  Mobiles Received
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums mt-2">
                {stats?.total_mobiles_received || 0}
              </div>
              <p className="text-[10px] text-[var(--spatial-text-muted)] mt-1 font-normal">
                Returned back from vendors
              </p>
            </div>

            {/* 4. Mobiles Currently at Vendors (Pending Return) */}
            <div
              onClick={() => navigate('/vendors/pending')}
              className="spatial-card spatial-card-hover p-4 rounded-2xl transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider">
                  At Vendors Now
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/15 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-semibold tracking-tight text-amber-500 dark:text-amber-400 tabular-nums mt-2">
                {stats?.mobiles_currently_at_vendors || 0}
              </div>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-1 font-normal">
                Handsets pending return to shop
              </p>
            </div>

            {/* 5. Pending Repair Mobiles */}
            <div
              onClick={() => navigate('/vendors/pending?status=IN_REPAIR')}
              className="spatial-card spatial-card-hover p-4 rounded-2xl transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">
                  In Repair
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-[#0a84ff] border border-blue-500/15 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-semibold tracking-tight text-[var(--spatial-text-title)] tabular-nums mt-2">
                {stats?.pending_repair_mobiles || 0}
              </div>
              <p className="text-[10px] text-[var(--spatial-text-muted)] mt-1 font-normal">
                Under active diagnosis or parts
              </p>
            </div>

            {/* 6. Ready for Collection */}
            <div
              onClick={() => navigate('/vendors/pending?status=READY_FOR_RETURN')}
              className="spatial-card spatial-card-hover p-4 rounded-2xl transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--spatial-text-muted)] uppercase tracking-wider">
                  Ready for Return
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-semibold tracking-tight text-teal-600 dark:text-teal-400 tabular-nums mt-2">
                {stats?.ready_for_collection || 0}
              </div>
              <p className="text-[10px] text-[var(--spatial-text-muted)] mt-1 font-normal">
                Finished repair, pickup pending
              </p>
            </div>

            {/* 7. Total Vendor Payable */}
            <div
              onClick={() => navigate('/vendors/ledger')}
              className="spatial-card spatial-card-hover p-4 rounded-2xl transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wider">
                  Total Payable
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/15 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-rose-500 dark:text-rose-400 tabular-nums mt-2 truncate">
                {formatIndianCurrency(stats?.total_vendor_payable || 0, true)}
              </div>
              <p className="text-[10px] text-rose-500/80 dark:text-rose-400/80 mt-1 font-normal">
                We owe vendors for completed jobs
              </p>
            </div>

            {/* 8. Total Vendor Receivable */}
            <div
              onClick={() => navigate('/vendors/ledger')}
              className="spatial-card spatial-card-hover p-4 rounded-2xl transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Total Receivable
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums mt-2 truncate">
                {formatIndianCurrency(stats?.total_vendor_receivable || 0, true)}
              </div>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-normal">
                Vendors owe us for B2B repairs
              </p>
            </div>
          </div>

          {/* =================================================================== */}
          {/* TWO-COLUMN OPERATIONAL SUMMARY: ACTIVE REPAIRS & RECENT BATCHES     */}
          {/* =================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column A: Mobiles Currently at Vendor Labs */}
            <Card
              title="Active Mobiles at Vendor Labs"
              subtitle="Handsets dispatched for specialized repair"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/vendors/pending')}
                >
                  View All ({stats?.mobiles_currently_at_vendors || 0})
                </Button>
              }
              bodyClassName="p-0"
            >
              {pendingMobiles.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No mobiles at vendor labs"
                  description="All dispatched handsets have been returned or settled."
                  actionLabel="Send Mobiles to Vendor"
                  onAction={() => navigate('/vendors/send')}
                />
              ) : (
                <div className="divide-y divide-[var(--spatial-border)]">
                  {pendingMobiles.map((mob) => (
                    <div
                      key={mob.id}
                      onClick={() => navigate(`/vendors/pending?search=${mob.imei || mob.model}`)}
                      className="p-3.5 hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[var(--spatial-text-title)]">
                            {mob.brand} {mob.model}
                          </span>
                          {mob.imei && (
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-sky-300 border border-sky-500/20">
                              IMEI: {mob.imei}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--spatial-text-muted)] truncate mt-0.5">
                          Problem: {mob.repair_problem}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--spatial-text-muted)] mt-1">
                          <span className="font-semibold text-sky-400">
                            {mob.vendor?.name} ({mob.vendor?.shop_name || 'Lab'})
                          </span>
                          <span>•</span>
                          <span>Sent: {formatInvoiceDate(mob.sent_date || mob.created_at)}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                          {mob.current_status}
                        </span>
                        <div className="font-mono text-xs font-semibold text-[var(--spatial-text-title)] mt-1">
                          Est: {formatIndianCurrency(mob.estimated_cost || 0, true)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Column B: Recent Send & Receive Transactions */}
            <Card
              title="Recent Vendor Transactions"
              subtitle="Latest multi-mobile dispatch and receive batches"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/vendors/transactions')}
                >
                  View All Ledger
                </Button>
              }
              bodyClassName="p-0"
            >
              {recentTxns.length === 0 ? (
                <EmptyState
                  icon={ArrowUpRight}
                  title="No transactions yet"
                  description="Start by dispatching your first handset batch to a vendor."
                  actionLabel="Send Mobiles to Vendor"
                  onAction={() => navigate('/vendors/send')}
                />
              ) : (
                <div className="divide-y divide-[var(--spatial-border)]">
                  {recentTxns.map((txn) => {
                    const isOutward = txn.txn_type === 'SEND_TO_VENDOR' || txn.txn_type === 'VENDOR_JOB_RETURN';
                    return (
                      <div
                        key={txn.id}
                        onClick={() => setSelectedTxnForPrint(txn)}
                        className="p-3.5 hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-sky-400">
                              #{txn.txn_number}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase ${
                                isOutward
                                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {txn.txn_type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--spatial-text-title)] font-medium mt-0.5">
                            {txn.vendor?.name} ({txn.vendor?.shop_name || 'Vendor'})
                          </div>
                          <div className="text-[10px] text-[var(--spatial-text-muted)] flex items-center gap-2 mt-0.5">
                            <span>{formatInvoiceDate(txn.txn_date || txn.created_at)}</span>
                            <span>•</span>
                            <span>{txn.total_mobiles || txn.mobiles?.length || 0} Mobile(s)</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono text-xs font-bold text-[var(--spatial-text-title)]">
                            {formatIndianCurrency(txn.total_cost || 0, true)}
                          </div>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTxnForPrint(txn);
                              }}
                              className="p-1 text-slate-400 hover:text-sky-400 transition-colors"
                              title="Print Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Record Payment Voucher Modal */}
      <VendorPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        vendors={vendors}
        onPaymentRecorded={() => fetchDashboardData()}
      />

      {/* Print / View Receipt Modal */}
      {selectedTxnForPrint && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative max-w-4xl w-full my-8">
            <VendorReceiptPrintable
              transaction={selectedTxnForPrint}
              shop={shopProfile}
              onClose={() => setSelectedTxnForPrint(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
