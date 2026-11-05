import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  CreditCard,
  IndianRupee,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  Pencil,
  Clock,
  Printer,
  Share2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Smartphone,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorNavTabs } from '../../components/vendors/VendorNavTabs';
import { VendorPaymentModal } from '../../components/vendors/VendorPaymentModal';
import { VendorReceiptPrintable } from '../../components/vendors/VendorReceiptPrintable';
import { VendorModal } from '../../components/vendors/VendorModal';
import {
  Card,
  LoadingSpinner,
  EmptyState,
  DetailSkeleton,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { vendorService } from '../../services/vendorService';
import { settingsService } from '../../services/settingsService';
import {
  formatIndianCurrency,
  formatInvoiceDate,
} from '../../utils/billFormatters';

export const VendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mobiles'); // 'mobiles', 'transactions', 'ledger', 'payments'
  const [mobileFilter, setMobileFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'RETURNED'

  // Sub-data
  const [mobiles, setMobiles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [ledgerData, setLedgerData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [shopProfile, setShopProfile] = useState(null);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTxnForPrint, setSelectedTxnForPrint] = useState(null);

  const fetchVendorProfile = async () => {
    try {
      setLoading(true);
      const [
        vendorRes,
        mobilesRes,
        txnsRes,
        ledgerRes,
        paymentsRes,
        settingsRes,
      ] = await Promise.allSettled([
        vendorService.getVendorById(id),
        vendorService.getVendorMobiles({ vendorId: id, limit: 100 }),
        vendorService.getVendorTransactions({ vendorId: id, limit: 50 }),
        vendorService.getVendorLedger(id),
        vendorService.getVendorPayments({ vendorId: id, limit: 50 }),
        settingsService.getSettings(),
      ]);

      const vendorData =
        vendorRes.status === 'fulfilled'
          ? vendorRes.value?.data?.vendor || vendorRes.value?.vendor
          : null;
      if (vendorData) {
        setVendor(vendorData);
      } else {
        toast.error('Vendor not found');
        navigate('/vendors/list');
        return;
      }

      if (mobilesRes.status === 'fulfilled') {
        const list =
          mobilesRes.value?.data?.mobiles || mobilesRes.value?.mobiles || [];
        setMobiles(list);
      }
      if (txnsRes.status === 'fulfilled') {
        const list =
          txnsRes.value?.data?.transactions ||
          txnsRes.value?.transactions ||
          [];
        setTransactions(list);
      }
      if (ledgerRes.status === 'fulfilled') {
        setLedgerData(ledgerRes.value?.data || ledgerRes.value || {});
      }
      if (paymentsRes.status === 'fulfilled') {
        const list =
          paymentsRes.value?.data?.payments || paymentsRes.value?.payments || [];
        setPayments(list);
      }
      if (settingsRes.status === 'fulfilled') {
        const shop =
          settingsRes.value?.data?.shop || settingsRes.value?.shop;
        if (shop) setShopProfile(shop);
      }
    } catch (err) {
      console.error('Failed to load vendor profile:', err);
      toast.error('Failed to load vendor details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchVendorProfile();
  }, [id]);

  // Filtered mobiles list
  const filteredMobiles = useMemo(() => {
    if (mobileFilter === 'PENDING') {
      return mobiles.filter(
        (m) => !['RETURNED', 'CANCELLED'].includes(m.current_status)
      );
    }
    if (mobileFilter === 'RETURNED') {
      return mobiles.filter((m) => m.current_status === 'RETURNED');
    }
    return mobiles;
  }, [mobiles, mobileFilter]);

  if (loading || !vendor) {
    return <DetailSkeleton />;
  }

  const balance = vendor.current_balance || 0;
  const isPayable = balance > 0;
  const isReceivable = balance < 0;
  const cleanMob = (vendor.mobile || '').replace(/\D/g, '');
  const currentlyAtVendor = vendor.mobiles_currently_at_vendor || 0;

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header with Back Navigation & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/vendors/list')}
            className="p-2.5 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] hover:bg-[var(--spatial-bg-card-subtle)] text-[var(--spatial-text-title)] transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Back to Vendor List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-[28px] font-bold text-[var(--spatial-text-title)] tracking-tight">
                {vendor.shop_name || vendor.name}
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {vendor.vendor_code || 'VND'}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                  vendor.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    vendor.status === 'ACTIVE'
                      ? 'bg-emerald-400'
                      : 'bg-slate-400'
                  }`}
                />
                <span>
                  {vendor.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
              </span>
            </div>
            {vendor.shop_name && vendor.name && (
              <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5 font-medium">
                👤 Contact Person: {vendor.name}
              </p>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Edit Vendor Button */}
          <Button
            variant="outline"
            size="sm"
            icon={Pencil}
            onClick={() => setIsEditModalOpen(true)}
          >
            Edit Vendor
          </Button>

          {/* Record Payment */}
          <Button
            variant="outline"
            size="sm"
            icon={IndianRupee}
            onClick={() => setIsPaymentModalOpen(true)}
          >
            Record Payment
          </Button>

          {/* Receive Mobiles */}
          <Button
            variant="outline"
            size="sm"
            icon={ArrowDownLeft}
            className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 font-semibold"
            onClick={() =>
              navigate(`/vendors/receive?vendorId=${vendor.id}`)
            }
          >
            Receive Mobiles
          </Button>

          {/* Send Mobiles */}
          <Button
            variant="primary"
            size="sm"
            icon={ArrowUpRight}
            onClick={() => navigate(`/vendors/send?vendorId=${vendor.id}`)}
          >
            Send Mobiles
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <VendorNavTabs activeTab="/vendors/list" />

      {/* Hero Vendor Overview Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Card 1: Contact Coordinates & Direct WhatsApp */}
        <div className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] space-y-2 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] block">
            Contact Coordinates
          </span>
          <div className="space-y-1.5 pt-1">
            {/* Phone call link */}
            <a
              href={`tel:${vendor.mobile}`}
              className="flex items-center gap-2 font-mono font-bold text-sm text-[var(--spatial-text-title)] hover:text-sky-400 transition-colors"
            >
              <Phone className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{vendor.mobile}</span>
            </a>

            {/* Direct WhatsApp button */}
            {cleanMob && (
              <a
                href={`https://wa.me/91${cleanMob}?text=${encodeURIComponent(
                  `Hello ${vendor.name}, regarding phones outsourced to your shop...`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chat on WhatsApp</span>
              </a>
            )}

            {/* Address */}
            {vendor.address && (
              <div className="flex items-start gap-1.5 text-xs text-[var(--spatial-text-muted)] pt-1">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                <span className="line-clamp-2">{vendor.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Handsets at Lab Right Now */}
        <div
          onClick={() => {
            setActiveTab('mobiles');
            setMobileFilter('PENDING');
          }}
          className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] hover:border-amber-500/40 transition-all space-y-2 shadow-xs cursor-pointer group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] block">
            Phones Out for Repair
          </span>
          <div className="pt-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold text-amber-400">
                {currentlyAtVendor}
              </span>
              <span className="text-xs text-amber-300 font-semibold">
                Phones at Lab Now
              </span>
            </div>
            <div className="text-xs text-[var(--spatial-text-muted)] mt-1.5">
              Total Sent: <strong className="text-sky-400">{vendor.total_mobiles_sent || 0}</strong>{' '}
              | Collected:{' '}
              <strong className="text-emerald-400">
                {vendor.total_mobiles_received || 0}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 3: Khata Balance (Human & Clear) */}
        <div className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] block">
              Current Khata Balance
            </span>
            <div className="text-2xl font-mono font-bold text-[var(--spatial-text-title)] mt-1">
              {formatIndianCurrency(Math.abs(balance), true)}
            </div>
            <span
              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase mt-1 ${
                isPayable
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                  : isReceivable
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                  : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
              }`}
            >
              {isPayable
                ? 'We Owe Vendor (Payable)'
                : isReceivable
                ? 'Vendor Owes Us / Advance'
                : 'All Accounts Settled (₹0)'}
            </span>
          </div>

          {/* Quick Pay Button */}
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className="mt-3 text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Record Payment / Khata Entry &rarr;</span>
          </button>
        </div>

        {/* Card 4: Specialization & Business Info */}
        <div className="p-4 rounded-2xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] space-y-2 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] block">
            Specialization & GST
          </span>
          <div className="space-y-1 pt-1 text-xs">
            <p className="text-[var(--spatial-text-title)] font-medium line-clamp-2">
              {vendor.notes || 'General mobile motherboard & hardware repairs'}
            </p>
            {vendor.gst_number && (
              <p className="font-mono text-[11px] text-[var(--spatial-text-muted)] pt-1">
                GSTIN: <strong className="text-[var(--spatial-text-title)]">{vendor.gst_number}</strong>
              </p>
            )}
            <p className="text-[11px] text-[var(--spatial-text-muted)]">
              Partner since: {formatInvoiceDate(vendor.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-view Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--spatial-border)] pb-2 overflow-x-auto no-scrollbar">
        {[
          {
            key: 'mobiles',
            label: `Phones Sent (${mobiles.length})`,
            icon: Smartphone,
          },
          {
            key: 'ledger',
            label: 'Khata Statement (Ledger)',
            icon: IndianRupee,
          },
          {
            key: 'payments',
            label: `Payment Vouchers (${payments.length})`,
            icon: IndianRupee,
          },
          {
            key: 'transactions',
            label: `Challans & Dispatches (${transactions.length})`,
            icon: FileText,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MOBILES & REPAIRS LIST */}
      {activeTab === 'mobiles' && (
        <div key="mobiles" className="spatial-tab-pane space-y-3">
          {/* Quick Filter Sub-Pills */}
          {mobiles.length > 0 && (
            <div className="flex items-center gap-2">
              {[
                { key: 'ALL', label: `All Phones (${mobiles.length})` },
                {
                  key: 'PENDING',
                  label: `⚡ At Lab Now (${currentlyAtVendor})`,
                },
                {
                  key: 'RETURNED',
                  label: `Collected (${
                    mobiles.filter((m) => m.current_status === 'RETURNED').length
                  })`,
                },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setMobileFilter(pill.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mobileFilter === pill.key
                      ? 'bg-[var(--spatial-bg-card)] text-sky-400 border border-sky-500/30'
                      : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          )}

          <Card
            title={`Phones Outsourced to ${vendor.name} (${filteredMobiles.length})`}
            subtitle="Track handset models, faults, repair costs, and current status"
            action={
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() =>
                  navigate(`/vendors/send?vendorId=${vendor.id}`)
                }
              >
                Send New Phone
              </Button>
            }
            bodyClassName="p-0"
          >
            {filteredMobiles.length === 0 ? (
              <EmptyState
                icon={Smartphone}
                title="No phones found"
                description={
                  mobileFilter !== 'ALL'
                    ? 'No phones match this filter.'
                    : 'Dispatch phones to this vendor for micro-soldering or specialist repairs.'
                }
                actionLabel={
                  mobileFilter !== 'ALL' ? 'Show All Phones' : '+ Send First Phone'
                }
                onAction={
                  mobileFilter !== 'ALL'
                    ? () => setMobileFilter('ALL')
                    : () => navigate(`/vendors/send?vendorId=${vendor.id}`)
                }
              />
            ) : (
              <div className="overflow-x-auto table-scrollbar w-full pb-2">
                <table className="w-full text-left text-xs min-w-[950px]">
                  <thead className="bg-[var(--spatial-table-header-bg)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-bold text-[11px] whitespace-nowrap">
                    <tr>
                      <th className="py-3.5 px-4">Brand & Handset</th>
                      <th className="py-3.5 px-4">IMEI / Serial</th>
                      <th className="py-3.5 px-4">Customer Name</th>
                      <th className="py-3.5 px-4">Reported Problem</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Sent Date</th>
                      <th className="py-3.5 px-4 text-right">Estimated Cost</th>
                      <th className="py-3.5 px-4 text-right">Vendor Charge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--spatial-border)]">
                    {filteredMobiles.map((mob) => {
                      const isAtLab = !['RETURNED', 'CANCELLED'].includes(
                        mob.current_status
                      );
                      return (
                        <tr
                          key={mob.id}
                          className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors"
                        >
                          <td className="py-3 px-4 font-bold text-sm text-[var(--spatial-text-title)]">
                            {mob.brand} {mob.model}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-[var(--spatial-text-muted)]">
                            {mob.imei || '—'}
                          </td>
                          <td className="py-3 px-4 text-[var(--spatial-text-title)] font-medium">
                            {mob.customer_name || '—'}
                          </td>
                          <td
                            className="py-3 px-4 max-w-xs text-[var(--spatial-text-body)] truncate"
                            title={mob.repair_problem}
                          >
                            {mob.repair_problem}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
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
                          <td className="py-3 px-4 text-center text-[var(--spatial-text-muted)] whitespace-nowrap font-mono text-xs">
                            {formatInvoiceDate(mob.sent_date || mob.created_at)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[var(--spatial-text-muted)] whitespace-nowrap">
                            {formatIndianCurrency(mob.estimated_cost || 0, true)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {formatIndianCurrency(mob.actual_cost || 0, true)}
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

      {/* TAB 2: LEDGER STATEMENT (KHATA) */}
      {activeTab === 'ledger' && (
        <div key="ledger" className="spatial-tab-pane">
          <Card
            title={`Khata & Balance Statement: ${vendor.name}`}
            subtitle="Full statement of repair charges, advance payments, and running balance"
            action={
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setIsPaymentModalOpen(true)}
              >
                Record Payment
              </Button>
            }
            bodyClassName="p-0"
          >
            {!ledgerData || ledgerData.entries?.length === 0 ? (
              <EmptyState
                icon={IndianRupee}
                title="No Khata entries recorded yet"
                description="Khata entries post automatically when repair charges or payments are logged."
                actionLabel="Record Payment"
                onAction={() => setIsPaymentModalOpen(true)}
              />
            ) : (
              <div>
                <div className="overflow-x-auto table-scrollbar w-full pb-2">
                  <table className="w-full text-left text-xs min-w-[950px]">
                    <thead className="bg-[var(--spatial-table-header-bg)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-bold text-[11px] whitespace-nowrap">
                      <tr>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Entry Type</th>
                        <th className="py-3.5 px-4">Description / Reference</th>
                        <th className="py-3.5 px-4 text-center">Payment Mode</th>
                        <th className="py-3.5 px-4 text-right text-emerald-400">
                          We Paid (Debit)
                        </th>
                        <th className="py-3.5 px-4 text-right text-rose-400">
                          Vendor Charged (Credit)
                        </th>
                        <th className="py-3.5 px-4 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--spatial-border)]">
                      {ledgerData.entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors"
                        >
                          <td className="py-3 px-4 text-[var(--spatial-text-muted)] whitespace-nowrap font-mono text-xs">
                            {formatInvoiceDate(entry.date || entry.created_at)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">
                              {entry.entry_type?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[var(--spatial-text-title)] max-w-sm truncate font-medium">
                            {entry.description || entry.reference_no || '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-xs text-[var(--spatial-text-muted)] whitespace-nowrap">
                            {entry.payment_mode || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {entry.debit > 0
                              ? formatIndianCurrency(entry.debit, true)
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
                            {entry.credit > 0
                              ? formatIndianCurrency(entry.credit, true)
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-sm text-[var(--spatial-text-title)] whitespace-nowrap">
                            {formatIndianCurrency(
                              Math.abs(entry.running_balance),
                              true
                            )}
                            <span className="text-[10px] ml-1 text-slate-500 font-normal">
                              {entry.running_balance > 0
                                ? '(Payable)'
                                : entry.running_balance < 0
                                ? '(Advance)'
                                : ''}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Ledger Summary Footer */}
                <div className="p-4 border-t border-[var(--spatial-border)] bg-[var(--spatial-bg-card-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="text-[var(--spatial-text-muted)]">
                    Total Amount Paid:{' '}
                    <span className="font-mono font-bold text-emerald-400">
                      {formatIndianCurrency(ledgerData.total_debit || 0, true)}
                    </span>{' '}
                    | Total Charges:{' '}
                    <span className="font-mono font-bold text-rose-400">
                      {formatIndianCurrency(ledgerData.total_credit || 0, true)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[var(--spatial-text-muted)] mr-2 font-medium">
                      Net Closing Balance:
                    </span>
                    <span className="font-mono font-black text-base text-[var(--spatial-text-title)]">
                      {formatIndianCurrency(
                        Math.abs(ledgerData.closing_balance || 0),
                        true
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: PAYMENT VOUCHERS */}
      {activeTab === 'payments' && (
        <div key="payments" className="spatial-tab-pane">
          <Card
            title={`Payment Vouchers (${payments.length})`}
            subtitle="Record of money paid to or received from this vendor"
            action={
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setIsPaymentModalOpen(true)}
              >
                Record Payment
              </Button>
            }
            bodyClassName="p-0"
          >
            {payments.length === 0 ? (
              <EmptyState
                icon={IndianRupee}
                title="No payment vouchers recorded"
                description="Record cash, UPI, or bank transfer payments to clear vendor dues."
                actionLabel="Record Payment"
                onAction={() => setIsPaymentModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto table-scrollbar w-full pb-2">
                <table className="w-full text-left text-xs min-w-[850px]">
                  <thead className="bg-[var(--spatial-table-header-bg)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-bold text-[11px] whitespace-nowrap">
                    <tr>
                      <th className="py-3.5 px-4">Voucher #</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Direction</th>
                      <th className="py-3.5 px-4">Payment Mode</th>
                      <th className="py-3.5 px-4">Reference No</th>
                      <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--spatial-border)]">
                    {payments.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                          #{p.voucher_no}
                        </td>
                        <td className="py-3 px-4 text-[var(--spatial-text-muted)] whitespace-nowrap font-mono text-xs">
                          {formatInvoiceDate(p.date || p.created_at)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-semibold text-[var(--spatial-text-title)]">
                          {p.payment_type === 'PAYMENT_TO_VENDOR'
                            ? 'Paid to Vendor'
                            : 'Collected from Vendor'}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[var(--spatial-text-body)] whitespace-nowrap">
                          {p.payment_mode || 'CASH'}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[var(--spatial-text-muted)] whitespace-nowrap">
                          {p.reference_no || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-400 whitespace-nowrap">
                          {formatIndianCurrency(p.amount || 0, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: TRANSACTIONS & CHALLANS */}
      {activeTab === 'transactions' && (
        <div key="transactions" className="spatial-tab-pane">
          <Card
            title={`Challan & Transaction History (${transactions.length})`}
            subtitle="Every dispatch challan and inward receipt generated for this vendor"
            bodyClassName="p-0"
          >
            {transactions.length === 0 ? (
              <EmptyState
                icon={ArrowUpRight}
                title="No transactions recorded yet"
                description="Dispatch handsets to generate your first printable delivery challan."
                actionLabel="Send Mobiles to Vendor"
                onAction={() =>
                  navigate(`/vendors/send?vendorId=${vendor.id}`)
                }
              />
            ) : (
              <div className="overflow-x-auto table-scrollbar w-full pb-2">
                <table className="w-full text-left text-xs min-w-[950px]">
                  <thead className="bg-[var(--spatial-table-header-bg)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-bold text-[11px] whitespace-nowrap">
                    <tr>
                      <th className="py-3.5 px-4">Challan / Slip #</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-center">Type</th>
                      <th className="py-3.5 px-4 text-center">Total Phones</th>
                      <th className="py-3.5 px-4 text-right">Total Cost</th>
                      <th className="py-3.5 px-4 text-right">Paid</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--spatial-border)]">
                    {transactions.map((txn) => {
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
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {formatIndianCurrency(txn.paid_amount || 0, true)}
                          </td>
                          <td
                            className="py-3 px-4 text-center whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedTxnForPrint(txn)}
                              className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                              title="Print Challan Slip"
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

      {/* Edit Vendor Modal */}
      <VendorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editingVendor={vendor}
        existingVendors={[]}
        onSuccess={(updated) => {
          setIsEditModalOpen(false);
          setVendor(updated);
          fetchVendorProfile();
        }}
      />

      {/* Payment Modal */}
      <VendorPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        vendors={[vendor]}
        selectedVendorId={vendor.id}
        onPaymentRecorded={() => fetchVendorProfile()}
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

export default VendorDetail;
