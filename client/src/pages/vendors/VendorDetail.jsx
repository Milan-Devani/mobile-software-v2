import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorNavTabs } from '../../components/vendors/VendorNavTabs';
import { VendorPaymentModal } from '../../components/vendors/VendorPaymentModal';
import { VendorReceiptPrintable } from '../../components/vendors/VendorReceiptPrintable';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { vendorService } from '../../services/vendorService';
import { settingsService } from '../../services/settingsService';
import { formatIndianCurrency, formatInvoiceDate } from '../../utils/billFormatters';

export const VendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mobiles'); // 'mobiles', 'transactions', 'ledger', 'payments'

  // Sub-data
  const [mobiles, setMobiles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [ledgerData, setLedgerData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [shopProfile, setShopProfile] = useState(null);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTxnForPrint, setSelectedTxnForPrint] = useState(null);

  const fetchVendorProfile = async () => {
    try {
      setLoading(true);
      const [vendorRes, mobilesRes, txnsRes, ledgerRes, paymentsRes, settingsRes] = await Promise.allSettled([
        vendorService.getVendorById(id),
        vendorService.getVendorMobiles({ vendorId: id, limit: 100 }),
        vendorService.getVendorTransactions({ vendorId: id, limit: 50 }),
        vendorService.getVendorLedger(id),
        vendorService.getVendorPayments({ vendorId: id, limit: 50 }),
        settingsService.getSettings(),
      ]);

      if (vendorRes.status === 'fulfilled' && vendorRes.value?.data?.vendor) {
        setVendor(vendorRes.value.data.vendor);
      } else {
        toast.error('Vendor not found');
        navigate('/vendors/list');
        return;
      }

      if (mobilesRes.status === 'fulfilled' && mobilesRes.value?.data) {
        setMobiles(mobilesRes.value.data.mobiles || []);
      }
      if (txnsRes.status === 'fulfilled' && txnsRes.value?.data) {
        setTransactions(txnsRes.value.data.transactions || []);
      }
      if (ledgerRes.status === 'fulfilled' && ledgerRes.value?.data) {
        setLedgerData(ledgerRes.value.data);
      }
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value?.data) {
        setPayments(paymentsRes.value.data.payments || []);
      }
      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data?.shop) {
        setShopProfile(settingsRes.value.data.shop);
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

  if (loading || !vendor) {
    return <LoadingSpinner fullPage label="Loading vendor profile & ledger history..." />;
  }

  const balance = vendor.current_balance || 0;
  const isPayable = balance > 0;
  const isReceivable = balance < 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/vendors/list')}
            className="p-2 rounded-xl bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] hover:border-sky-400 text-[var(--spatial-text-title)] transition-all cursor-pointer"
            title="Back to Vendors List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[var(--spatial-text-title)] tracking-tight">
                {vendor.name}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {vendor.vendor_code}
              </span>
            </div>
            <p className="text-xs text-[var(--spatial-text-muted)] mt-0.5">
              {vendor.shop_name || 'Authorized Service Partner'}
            </p>
          </div>
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
            onClick={() => navigate(`/vendors/receive?vendorId=${vendor.id}`)}
          >
            Receive Mobiles
          </Button>

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

      {/* Vendor Summary Card (Header Profile) */}
      <div className="spatial-card p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Contact Coordinates */}
        <div className="space-y-1 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] block">
            Contact Information
          </span>
          <div className="flex items-center gap-2 font-mono font-bold text-[var(--spatial-text-title)]">
            <Phone className="w-3.5 h-3.5 text-sky-400" />
            <span>{vendor.mobile}</span>
          </div>
          {vendor.whatsapp && (
            <div className="flex items-center gap-2 font-mono font-semibold text-emerald-400 text-[11px]">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{vendor.whatsapp}</span>
            </div>
          )}
          {vendor.address && (
            <div className="flex items-start gap-1.5 text-[11px] text-[var(--spatial-text-muted)] mt-1">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500 mt-0.5" />
              <span className="line-clamp-2">{vendor.address}</span>
            </div>
          )}
        </div>

        {/* Business & Tax Identity */}
        <div className="space-y-1 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] block">
            Business & Tax
          </span>
          <p className="font-semibold text-[var(--spatial-text-title)]">
            {vendor.shop_name || 'Independent Workshop'}
          </p>
          <p className="font-mono text-[11px] text-[var(--spatial-text-muted)]">
            GSTIN: <span className="font-bold text-[var(--spatial-text-title)]">{vendor.gst_number || 'Unregistered'}</span>
          </p>
          <p className="text-[10px] text-[var(--spatial-text-muted)] mt-1">
            Registered: {formatInvoiceDate(vendor.created_at)}
          </p>
        </div>

        {/* Handsets Stats */}
        <div className="space-y-1 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] block">
            Handset Pipeline
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-mono font-bold text-amber-400">
              {vendor.mobiles_currently_at_vendor || 0}
            </span>
            <span className="text-[11px] text-amber-300/90 font-medium">At Vendor Lab Now</span>
          </div>
          <div className="text-[11px] text-[var(--spatial-text-muted)] mt-0.5">
            Total Sent: <span className="font-bold text-sky-400">{vendor.total_mobiles_sent || 0}</span> | Received:{' '}
            <span className="font-bold text-emerald-400">{vendor.total_mobiles_received || 0}</span>
          </div>
        </div>

        {/* Outstanding Running Balance Card */}
        <div className="p-3 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--spatial-text-muted)] block">
              Outstanding Balance
            </span>
            <div className="text-2xl font-mono font-black text-[var(--spatial-text-title)] mt-0.5">
              {formatIndianCurrency(Math.abs(balance), true)}
            </div>
            <span
              className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase mt-1 ${
                isPayable
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : isReceivable
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-500/10 text-slate-400'
              }`}
            >
              {isPayable ? 'Payable (We Owe)' : isReceivable ? 'Receivable (Vendor Owes Us)' : 'All Accounts Settled'}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-view Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--spatial-border)] pb-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'mobiles', label: `Handsets (${mobiles.length})`, icon: Smartphone },
          { key: 'transactions', label: `Transactions (${transactions.length})`, icon: ArrowUpRight },
          { key: 'ledger', label: 'Ledger Statement', icon: IndianRupee },
          { key: 'payments', label: `Payment Vouchers (${payments.length})`, icon: CreditCard },
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
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-950/20'
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
        <Card title={`All Mobiles Outsourced to ${vendor.name} (${mobiles.length})`} bodyClassName="p-0">
          {mobiles.length === 0 ? (
            <EmptyState
              icon={Smartphone}
              title="No mobiles sent to this vendor yet"
              description="Start by dispatching handsets to this vendor."
              actionLabel="Send Mobiles to Vendor"
              onAction={() => navigate(`/vendors/send?vendorId=${vendor.id}`)}
            />
          ) : (
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="py-3 px-4">Brand & Model</th>
                    <th className="py-3 px-4">IMEI / Serial</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Reported Problem</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Sent Date</th>
                    <th className="py-3 px-4 text-right">Estimated</th>
                    <th className="py-3 px-4 text-right">Actual Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {mobiles.map((mob) => (
                    <tr key={mob.id} className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--spatial-text-title)]">
                        {mob.brand} {mob.model}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--spatial-text-muted)]">
                        {mob.imei || '—'}
                      </td>
                      <td className="py-3 px-4 text-[var(--spatial-text-title)] font-medium">
                        {mob.customer_name || '—'}
                      </td>
                      <td className="py-3 px-4 max-w-xs text-[var(--spatial-text-body)] truncate" title={mob.repair_problem}>
                        {mob.repair_problem}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-sky-400 border border-sky-500/20 uppercase">
                          {mob.current_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-[var(--spatial-text-muted)] whitespace-nowrap font-mono text-[11px]">
                        {formatInvoiceDate(mob.sent_date || mob.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[var(--spatial-text-muted)] whitespace-nowrap">
                        {formatIndianCurrency(mob.estimated_cost || 0, true)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {formatIndianCurrency(mob.actual_cost || 0, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: TRANSACTIONS HISTORY */}
      {activeTab === 'transactions' && (
        <Card title={`Dispatch & Receive Transactions (${transactions.length})`} bodyClassName="p-0">
          {transactions.length === 0 ? (
            <EmptyState
              icon={ArrowUpRight}
              title="No transactions recorded"
              description="Dispatch your first handset batch to generate a transaction receipt."
              actionLabel="Send Mobiles to Vendor"
              onAction={() => navigate(`/vendors/send?vendorId=${vendor.id}`)}
            />
          ) : (
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="py-3 px-4">Txn Number</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Type</th>
                    <th className="py-3 px-4 text-center">Mobiles</th>
                    <th className="py-3 px-4 text-right">Total Cost</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {transactions.map((txn) => {
                    const isOutward = txn.txn_type === 'SEND_TO_VENDOR' || txn.txn_type === 'VENDOR_JOB_RETURN';
                    return (
                      <tr
                        key={txn.id}
                        onClick={() => setSelectedTxnForPrint(txn)}
                        className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                          #{txn.txn_number}
                        </td>
                        <td className="py-3 px-4 text-[var(--spatial-text-muted)] whitespace-nowrap font-mono text-[11px]">
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
                            {txn.txn_type.replace(/_/g, ' ')}
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
                        <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedTxnForPrint(txn)}
                            className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 transition-colors"
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
      )}

      {/* TAB 3: LEDGER STATEMENT */}
      {activeTab === 'ledger' && (
        <Card
          title="Vendor Accounting Statement & Running Balance"
          subtitle="Chronological audit of repair charges, advances, and settlements"
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
          {(!ledgerData || ledgerData.entries?.length === 0) ? (
            <EmptyState
              icon={IndianRupee}
              title="No ledger entries recorded"
              description="Ledger entries will post automatically when repair charges or payments are logged."
              actionLabel="Record Payment"
              onAction={() => setIsPaymentModalOpen(true)}
            />
          ) : (
            <div>
              <div className="overflow-x-auto table-scrollbar w-full pb-2">
                <table className="w-full text-left text-xs min-w-[950px]">
                  <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Entry Type</th>
                      <th className="py-3 px-4">Description / Reference</th>
                      <th className="py-3 px-4 text-center">Payment Mode</th>
                      <th className="py-3 px-4 text-right">Debit (We Paid)</th>
                      <th className="py-3 px-4 text-right">Credit (Charged)</th>
                      <th className="py-3 px-4 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--spatial-border)]">
                    {ledgerData.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors">
                        <td className="py-3 px-4 text-[var(--spatial-text-muted)] whitespace-nowrap font-mono text-[11px]">
                          {formatInvoiceDate(entry.date || entry.created_at)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-sky-400 border border-sky-500/20 uppercase">
                            {entry.entry_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--spatial-text-title)] max-w-sm truncate font-medium">
                          {entry.description || entry.reference_no || '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[11px] text-[var(--spatial-text-muted)] whitespace-nowrap">
                          {entry.payment_mode || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {entry.debit > 0 ? formatIndianCurrency(entry.debit, true) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
                          {entry.credit > 0 ? formatIndianCurrency(entry.credit, true) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-sm text-[var(--spatial-text-title)] whitespace-nowrap">
                          {formatIndianCurrency(Math.abs(entry.running_balance), true)}
                          <span className="text-[10px] ml-1 text-slate-500">
                            {entry.running_balance > 0 ? 'Cr (Payable)' : entry.running_balance < 0 ? 'Dr (Recv)' : ''}
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
                  Total Transactions Debited: <span className="font-mono font-bold text-emerald-400">{formatIndianCurrency(ledgerData.total_debit || 0, true)}</span> | Total Charges Credited: <span className="font-mono font-bold text-rose-400">{formatIndianCurrency(ledgerData.total_credit || 0, true)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[var(--spatial-text-muted)] mr-2">Closing Balance:</span>
                  <span className="font-mono font-black text-sm text-[var(--spatial-text-title)]">
                    {formatIndianCurrency(Math.abs(ledgerData.closing_balance || 0), true)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: PAYMENT VOUCHERS */}
      {activeTab === 'payments' && (
        <Card title={`Payment Vouchers (${payments.length})`} bodyClassName="p-0">
          {payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payment vouchers recorded"
              description="Record a cash, UPI, or bank transfer payment to or from this vendor."
              actionLabel="Record Payment"
              onAction={() => setIsPaymentModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="py-3 px-4">Voucher #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Payment Direction</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4">Reference No</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                        #{p.voucher_no}
                      </td>
                      <td className="py-3 px-4 text-[var(--spatial-text-muted)] whitespace-nowrap font-mono text-[11px]">
                        {formatInvoiceDate(p.date || p.created_at)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-semibold text-[var(--spatial-text-title)]">
                        {p.payment_type === 'PAYMENT_TO_VENDOR' ? 'Paid to Vendor' : 'Collected from Vendor'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--spatial-text-body)] whitespace-nowrap">
                        {p.payment_mode || 'CASH'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--spatial-text-muted)] whitespace-nowrap">
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
      )}

      {/* Payment Modal */}
      <VendorPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        vendors={[vendor]}
        selectedVendorId={vendor.id}
        onPaymentRecorded={() => fetchVendorProfile()}
      />

      {/* Print Receipt Modal */}
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
