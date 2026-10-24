import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  Plus,
  Trash2,
  Printer,
  Share2,
  Calendar,
  Building2,
  Smartphone,
  ShieldCheck,
  CreditCard,
  IndianRupee,
  Save,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorNavTabs } from '../../components/vendors/VendorNavTabs';
import { Card, LoadingSpinner, FormSkeleton } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { VendorReceiptPrintable } from '../../components/vendors/VendorReceiptPrintable';
import { vendorService } from '../../services/vendorService';
import { settingsService } from '../../services/settingsService';
import { formatIndianCurrency } from '../../utils/billFormatters';

export const VendorSendMobiles = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedVendorId = searchParams.get('vendorId') || '';

  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Master Transaction state
  const [txnNumber, setTxnNumber] = useState('');
  const [txnDate, setTxnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [vendorId, setVendorId] = useState(preselectedVendorId);
  const [notes, setNotes] = useState('');

  // Advance Payment (optional during send)
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');

  // Vendors list for selector
  const [vendors, setVendors] = useState([]);
  const [shopProfile, setShopProfile] = useState(null);

  // Dynamic Multiple Mobile Items
  const [mobiles, setMobiles] = useState([
    {
      id: 'mob-1',
      brand: '',
      model: '',
      imei: '',
      customer_name: '',
      repair_problem: '',
      condition: 'Normal Wear',
      accessories: 'Device Only',
      expected_return_date: '',
      estimated_cost: '',
      status: 'PENDING',
      notes: '',
    },
  ]);

  // Saved result modal for print / WhatsApp
  const [savedResult, setSavedResult] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        setLoadingInit(true);
        const [nextNoRes, vendorsRes, settingsRes] = await Promise.allSettled([
          vendorService.getNextTxnNumber('SEND_TO_VENDOR'),
          vendorService.getVendors({ limit: 100, status: 'ACTIVE' }),
          settingsService.getSettings(),
        ]);

        if (nextNoRes.status === 'fulfilled' && nextNoRes.value?.data?.txnNumber) {
          setTxnNumber(nextNoRes.value.data.txnNumber);
        }
        if (vendorsRes.status === 'fulfilled' && vendorsRes.value?.data?.vendors) {
          setVendors(vendorsRes.value.data.vendors);
          if (!vendorId && vendorsRes.value.data.vendors.length > 0) {
            setVendorId(vendorsRes.value.data.vendors[0].id);
          }
        }
        if (settingsRes.status === 'fulfilled' && settingsRes.value?.data?.shop) {
          setShopProfile(settingsRes.value.data.shop);
        }
      } catch (err) {
        console.error('Failed to init Send Mobiles:', err);
      } finally {
        setLoadingInit(false);
      }
    };

    init();
  }, []);

  // Selected vendor details
  const activeVendor = vendors.find((v) => v.id === vendorId);

  // Dynamic Mobile row handlers
  const handleAddMobileRow = () => {
    setMobiles((prev) => [
      ...prev,
      {
        id: `mob-${Date.now()}`,
        brand: '',
        model: '',
        imei: '',
        customer_name: '',
        repair_problem: '',
        condition: 'Normal Wear',
        accessories: 'Device Only',
        expected_return_date: '',
        estimated_cost: '',
        status: 'PENDING',
        notes: '',
      },
    ]);
  };

  const handleUpdateMobile = (index, field, value) => {
    setMobiles((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveMobileRow = (index) => {
    if (mobiles.length <= 1) {
      toast.error('At least one mobile is required to dispatch.');
      return;
    }
    setMobiles((prev) => prev.filter((_, i) => i !== index));
  };

  const totalEstimatedCost = mobiles.reduce(
    (sum, m) => sum + (parseFloat(m.estimated_cost) || 0),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      toast.error('Please select a destination vendor.');
      return;
    }

    const validMobiles = mobiles.filter(
      (m) => m.model.trim() || m.repair_problem.trim() || m.imei.trim()
    );

    if (validMobiles.length === 0) {
      toast.error('Please enter details for at least one mobile.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        vendor_id: vendorId,
        txn_date: txnDate,
        notes,
        mobiles: validMobiles,
        paid_amount: parseFloat(paidAmount) || 0,
        payment_mode: paidAmount > 0 ? paymentMode : 'NONE',
        payment_ref: paymentRef,
      };

      const res = await vendorService.sendMobilesToVendor(payload);
      if (res.success) {
        toast.success(`Transaction #${res.data.txn_number} created with ${res.data.mobiles.length} mobiles!`);
        setSavedResult(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch mobiles');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit) {
    return <FormSkeleton fields={5} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/vendors')}
            className="p-2 rounded-xl text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] transition-all cursor-pointer active:scale-95"
            title="Back to vendor dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-semibold text-[var(--spatial-text-title)] tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-[#0a84ff] border border-blue-500/20 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              Send Mobiles to Vendor (Outward Dispatch)
            </h1>
            <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5 font-normal">
              Itemize multiple handsets, record IMEI / problems, set expected return dates, and print chalan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-[#0071e3] dark:text-[#0a84ff] tabular-nums">
            Chalan #{txnNumber}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <VendorNavTabs activeTab="/vendors/send" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* =================================================================== */}
        {/* SECTION 1: VENDOR & TRANSACTION META                                */}
        {/* =================================================================== */}
        <Card title="1. Dispatch Details & Destination Vendor" subtitle="Select recipient lab partner and transaction date">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Vendor Selector */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Destination Vendor / Lab Partner <span className="text-rose-400">*</span>
              </label>
              <SpatialSelect
                value={vendorId}
                onChange={(val) => setVendorId(val)}
                options={vendors.map((v) => ({
                  value: v.id,
                  label: `${v.name} (${v.shop_name || 'Vendor'})`,
                  subtitle: `Phone: ${v.mobile} • At Lab: ${v.mobiles_currently_at_vendor || 0} phones`,
                  badge: v.vendor_code,
                }))}
                placeholder="-- Select Vendor --"
                searchable
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Dispatch Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={txnDate}
                onChange={(e) => setTxnDate(e.target.value)}
                className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          {/* Active Vendor Profile Info Snippet */}
          {activeVendor && (
            <div className="mt-4 p-3 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-[var(--spatial-text-title)]">{activeVendor.name}</span>
                  <p className="text-[11px] text-[var(--spatial-text-muted)]">
                    {activeVendor.shop_name} • Phone: {activeVendor.mobile} • {activeVendor.address}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-[var(--spatial-text-muted)] uppercase block">Current Outstanding</span>
                <span className="font-mono font-bold text-sm text-[var(--spatial-text-title)]">
                  {formatIndianCurrency(Math.abs(activeVendor.current_balance || 0), true)}
                </span>
                <span className="text-[10px] text-slate-500 ml-1">
                  {(activeVendor.current_balance || 0) > 0 ? '(Payable)' : '(Receivable)'}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* =================================================================== */}
        {/* SECTION 2: MULTIPLE MOBILE ENTRY (DYNAMIC ROWS)                     */}
        {/* =================================================================== */}
        <Card
          title="2. Multiple Mobile Handset Entry"
          subtitle="Add unlimited handsets to this dispatch chalan with independent repair requirements"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={handleAddMobileRow}
            >
              Add Another Mobile
            </Button>
          }
        >
          <div className="space-y-4">
            {mobiles.map((mob, idx) => (
              <div
                key={mob.id || idx}
                className="p-4 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] hover:border-sky-500/30 transition-all space-y-3 relative group"
              >
                {/* Row Header with Item Number & Remove */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--spatial-border)]">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold font-mono text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider">
                      Mobile #{idx + 1}
                    </span>
                  </div>

                  {mobiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMobileRow(idx)}
                      className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove this mobile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Row Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Brand */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Brand *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apple, Samsung"
                      value={mob.brand}
                      onChange={(e) => handleUpdateMobile(idx, 'brand', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Model *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. iPhone 13 Pro Max"
                      value={mob.model}
                      onChange={(e) => handleUpdateMobile(idx, 'model', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* IMEI / Serial */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      IMEI / Serial Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 356789123456789"
                      value={mob.imei}
                      onChange={(e) => handleUpdateMobile(idx, 'imei', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ronak Panchal"
                      value={mob.customer_name}
                      onChange={(e) => handleUpdateMobile(idx, 'customer_name', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Repair Problem */}
                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Fault / Repair Problem *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dead phone, No Audio IC, CPU dry solder, Face ID failure"
                      value={mob.repair_problem}
                      onChange={(e) => handleUpdateMobile(idx, 'repair_problem', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-medium text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Physical Condition
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Scratches, Back glass broken"
                      value={mob.condition}
                      onChange={(e) => handleUpdateMobile(idx, 'condition', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Accessories */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Accessories Sent
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Device Only, SIM Tray, S-Pen"
                      value={mob.accessories}
                      onChange={(e) => handleUpdateMobile(idx, 'accessories', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Expected Return Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Expected Return Date
                    </label>
                    <input
                      type="date"
                      value={mob.expected_return_date}
                      onChange={(e) => handleUpdateMobile(idx, 'expected_return_date', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Estimated Repair Cost */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Estimated Cost (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={mob.estimated_cost}
                        onChange={(e) => handleUpdateMobile(idx, 'estimated_cost', e.target.value)}
                        className="w-full h-11 pl-8 pr-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono font-bold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* Repair Status */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Initial Status
                    </label>
                    <SpatialSelect
                      value={mob.status}
                      onChange={(val) => handleUpdateMobile(idx, 'status', val)}
                      options={[
                        { value: 'PENDING', label: 'Pending Diagnosis' },
                        { value: 'IN_REPAIR', label: 'In Repair' },
                        { value: 'WAITING_PARTS', label: 'Waiting for Parts' },
                      ]}
                      searchable={false}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={handleAddMobileRow}
              >
                + Add Another Mobile Handset
              </Button>

              <div className="text-right text-xs">
                <span className="text-[var(--spatial-text-muted)]">Total Estimated Batch Cost:</span>
                <span className="ml-2 font-mono font-bold text-sm text-sky-400">
                  {formatIndianCurrency(totalEstimatedCost, true)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* =================================================================== */}
        {/* SECTION 3: ADVANCE PAYMENT & GENERAL NOTES                          */}
        {/* =================================================================== */}
        <Card title="3. Advance Payment & Special Instructions" subtitle="Optional upfront deposit and workshop instructions">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Advance Paid (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full h-11 pl-8 pr-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono font-bold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Payment Mode
              </label>
              <SpatialSelect
                value={paymentMode}
                onChange={(val) => setPaymentMode(val)}
                options={[
                  { value: 'UPI', label: 'UPI / QR Code' },
                  { value: 'CASH', label: 'Cash' },
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                ]}
                searchable={false}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Reference / Txn #
              </label>
              <input
                type="text"
                placeholder="e.g. UPI Ref / Cash receipt"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              General Batch Instructions / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Urgent repair requested for VIP customer. Deliver by Friday evening."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
            />
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--spatial-border)]">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/vendors')}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            icon={Save}
            loading={submitting}
          >
            Save & Generate Dispatch Chalan
          </Button>
        </div>
      </form>

      {/* Result Printable / WhatsApp Modal */}
      {savedResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative max-w-4xl w-full my-8">
            <VendorReceiptPrintable
              transaction={savedResult}
              shop={shopProfile}
              onClose={() => {
                setSavedResult(null);
                navigate('/vendors/transactions');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
