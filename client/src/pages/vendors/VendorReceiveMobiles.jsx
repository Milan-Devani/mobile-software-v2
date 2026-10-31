import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Smartphone,
  Plus,
  Trash2,
  Building2,
  Save,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorNavTabs } from '../../components/vendors/VendorNavTabs';
import { Card, FormSkeleton } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { VendorReceiptPrintable } from '../../components/vendors/VendorReceiptPrintable';
import { vendorService } from '../../services/vendorService';
import { settingsService } from '../../services/settingsService';
import { formatIndianCurrency } from '../../utils/billFormatters';

export const VendorReceiveMobiles = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedVendorId = searchParams.get('vendorId') || '';

  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Vendor & Inward Meta
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState(preselectedVendorId);
  const [txnDate, setTxnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [shopProfile, setShopProfile] = useState(null);

  // Mobile Handsets from other repair shop
  // Exactly 6 fields: Brand, Model, IMEI / Serial Number, Customer Name (Optional), Fault / Repair Problem, Physical Condition
  const [b2bMobiles, setB2bMobiles] = useState([
    {
      id: 'b2b-1',
      brand: '',
      model: '',
      imei: '',
      customer_name: '',
      repair_problem: '',
      condition: 'Normal Wear',
    },
  ]);

  // Saved result modal for print / WhatsApp
  const [savedResult, setSavedResult] = useState(null);

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingInit(true);
        const [vendorsRes, settingsRes] = await Promise.allSettled([
          vendorService.getVendors({ limit: 100, status: 'ACTIVE' }),
          settingsService.getSettings(),
        ]);

        if (vendorsRes.status === 'fulfilled') {
          const list = vendorsRes.value?.data?.vendors || vendorsRes.value?.vendors || [];
          if (list.length > 0) {
            setVendors(list);
            if (!vendorId) {
              setVendorId(list[0].id);
            }
          }
        }
        if (settingsRes.status === 'fulfilled') {
          const shop = settingsRes.value?.data?.shop || settingsRes.value?.shop;
          if (shop) setShopProfile(shop);
        }
      } catch (err) {
        console.error('Failed to init receive page:', err);
      } finally {
        setLoadingInit(false);
      }
    };

    init();
  }, []);

  const activeVendor = vendors.find((v) => v.id === vendorId);

  // Handset Row Management
  const handleAddB2bRow = () => {
    setB2bMobiles((prev) => [
      ...prev,
      {
        id: `b2b-${Date.now()}`,
        brand: '',
        model: '',
        imei: '',
        customer_name: '',
        repair_problem: '',
        condition: 'Normal Wear',
      },
    ]);
  };

  const handleUpdateB2bMobile = (index, field, value) => {
    setB2bMobiles((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveB2bRow = (index) => {
    if (b2bMobiles.length <= 1) {
      toast.error('At least one mobile handset is required.');
      return;
    }
    setB2bMobiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      toast.error('Please select the origin repair shop / vendor.');
      return;
    }

    const validMobiles = b2bMobiles.filter(
      (m) => m.brand.trim() || m.model.trim() || m.repair_problem.trim() || m.imei.trim()
    );

    if (validMobiles.length === 0) {
      toast.error('Please enter details for at least one mobile.');
      return;
    }

    // Validate required fields
    for (let i = 0; i < validMobiles.length; i++) {
      const m = validMobiles[i];
      if (!m.brand.trim() || !m.model.trim()) {
        toast.error(`Mobile #${i + 1}: Brand and Model are required.`);
        return;
      }
      if (!m.repair_problem.trim()) {
        toast.error(`Mobile #${i + 1}: Fault / Repair Problem is required.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await vendorService.recordVendorJobInward({
        vendor_id: vendorId,
        txn_date: txnDate,
        notes,
        mobiles: validMobiles.map((m) => ({
          brand: m.brand.trim(),
          model: m.model.trim(),
          imei: m.imei.trim(),
          customer_name: m.customer_name.trim(),
          repair_problem: m.repair_problem.trim(),
          condition: m.condition.trim() || 'Normal Wear',
          accessories: 'Device Only',
          estimated_cost: 0,
        })),
      });

      if (res.success) {
        toast.success(`Logged ${validMobiles.length} handset(s) from other shop under #${res.data.txn_number}`);
        setSavedResult(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to log inward client repairs from other shop');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit) {
    return <FormSkeleton fields={5} />;
  }

  return (
    <div className="space-y-6 w-full pb-16">
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
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              Receive Mobiles From Other Shops
            </h1>
            <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5 font-normal">
              Record handsets that other mobile repair shops could not fix and sent to our shop for repair
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <VendorNavTabs activeTab="/vendors/receive" />

      {/* Main Reception Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: ORIGIN REPAIR SHOP & INWARD DATE */}
        <Card
          title="1. Origin Repair Shop & Inward Date"
          subtitle="Select the other mobile repair shop that brought or sent these devices to us"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Origin Repair Shop / Vendor <span className="text-rose-400">*</span>
              </label>
              <SpatialSelect
                value={vendorId}
                onChange={(val) => setVendorId(val)}
                options={vendors.map((v) => ({
                  value: v.id,
                  label: `${v.name} (${v.shop_name || 'Repair Shop'})`,
                  subtitle: `Phone: ${v.mobile} • Code: ${v.vendor_code}`,
                  badge: v.vendor_code,
                }))}
                placeholder="-- Select Origin Repair Shop --"
                searchable
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Received Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={txnDate}
                onChange={(e) => setTxnDate(e.target.value)}
                className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {activeVendor && (
            <div className="mt-4 p-3 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
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

        {/* SECTION 2: MULTIPLE MOBILE HANDSET ENTRY (6 CLEAN FIELDS) */}
        <Card
          title="2. Multiple Mobile Handset Entry"
          subtitle="Enter handsets other repair shops could not fix and sent to us for repair"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={handleAddB2bRow}
            >
              Add Another Mobile
            </Button>
          }
        >
          <div className="space-y-4">
            {b2bMobiles.map((mob, idx) => (
              <div
                key={mob.id || idx}
                className="p-4 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] hover:border-emerald-500/30 transition-all space-y-3 relative group"
              >
                {/* Row Header with Item Number & Remove */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--spatial-border)]">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold font-mono text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider">
                      Mobile #{idx + 1}
                    </span>
                  </div>

                  {b2bMobiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveB2bRow(idx)}
                      className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove this mobile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Row 1: Brand, Model, IMEI / Serial Number, Customer Name (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* 1. Brand */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Brand *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apple, Samsung"
                      value={mob.brand}
                      onChange={(e) => handleUpdateB2bMobile(idx, 'brand', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* 2. Model */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Model *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. iPhone 13 Pro Max"
                      value={mob.model}
                      onChange={(e) => handleUpdateB2bMobile(idx, 'model', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* 3. IMEI / Serial Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      IMEI / Serial Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 356789123456789"
                      value={mob.imei}
                      onChange={(e) => handleUpdateB2bMobile(idx, 'imei', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono text-[var(--spatial-text-title)] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* 4. Customer Name (Optional) */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ronak Panchal"
                      value={mob.customer_name}
                      onChange={(e) => handleUpdateB2bMobile(idx, 'customer_name', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Row 2: Fault / Repair Problem, Physical Condition */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 5. Fault / Repair Problem */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Fault / Repair Problem *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dead phone, No Audio IC, CPU dry solder, Face ID failure"
                      value={mob.repair_problem}
                      onChange={(e) => handleUpdateB2bMobile(idx, 'repair_problem', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-medium text-[var(--spatial-text-title)] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* 6. Physical Condition */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                      Physical Condition
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Normal Wear, Scratches, Back glass broken"
                      value={mob.condition}
                      onChange={(e) => handleUpdateB2bMobile(idx, 'condition', e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Handset count summary */}
          <div className="mt-4 pt-3 border-t border-[var(--spatial-border)] flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={handleAddB2bRow}
            >
              + Add Another Mobile Handset
            </Button>

            <div className="text-right text-xs">
              <span className="text-[var(--spatial-text-muted)]">Total Handsets in Intake:</span>
              <span className="ml-2 font-mono font-bold text-sm text-emerald-400">
                {b2bMobiles.length}
              </span>
            </div>
          </div>
        </Card>

        {/* Action Bar */}
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
            Save & Issue Inward Receipt ({b2bMobiles.length} Mobiles)
          </Button>
        </div>
      </form>

      {/* Result Modal for Print & WhatsApp */}
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
