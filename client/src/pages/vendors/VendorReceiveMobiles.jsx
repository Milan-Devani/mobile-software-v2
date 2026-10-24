import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDownLeft,
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
  AlertCircle,
  ArrowLeft,
  CheckSquare,
  Square,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorNavTabs } from '../../components/vendors/VendorNavTabs';
import { Card, LoadingSpinner, EmptyState, FormSkeleton, TableSkeleton } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { SpatialWarrantyInput } from '../../components/common/SpatialWarrantyInput';
import { VendorReceiptPrintable } from '../../components/vendors/VendorReceiptPrintable';
import { vendorService } from '../../services/vendorService';
import { settingsService } from '../../services/settingsService';
import { formatIndianCurrency, formatInvoiceDate } from '../../utils/billFormatters';

export const VendorReceiveMobiles = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedVendorId = searchParams.get('vendorId') || '';

  const [activeWorkflow, setActiveWorkflow] = useState('WORKFLOW_A'); // 'WORKFLOW_A' (Return from Vendor) or 'WORKFLOW_B' (Vendor Job Inward)

  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Common Meta
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState(preselectedVendorId);
  const [receiveDate, setReceiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [shopProfile, setShopProfile] = useState(null);

  // -------------------------------------------------------------
  // WORKFLOW A STATE: Receive Previously Sent Mobiles
  // -------------------------------------------------------------
  const [pendingMobiles, setPendingMobiles] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [selectedMobileIds, setSelectedMobileIds] = useState([]);
  // Map of mobileId -> { actual_cost, repair_result, warranty, remarks }
  const [receiveItemsData, setReceiveItemsData] = useState({});

  // Payment Settlement on Receive (Workflow A)
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');

  // -------------------------------------------------------------
  // WORKFLOW B STATE: Receive New Mobiles from Vendor (B2B Job)
  // -------------------------------------------------------------
  const [b2bMobiles, setB2bMobiles] = useState([
    {
      id: 'b2b-1',
      brand: '',
      model: '',
      imei: '',
      customer_name: '',
      repair_problem: '',
      condition: 'Normal',
      accessories: 'Device Only',
      expected_return_date: '',
      estimated_cost: '',
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

        if (vendorsRes.status === 'fulfilled' && vendorsRes.value?.data?.vendors) {
          const list = vendorsRes.value.data.vendors;
          setVendors(list);
          if (!vendorId && list.length > 0) {
            setVendorId(list[0].id);
          }
        }
        if (settingsRes.status === 'fulfilled' && settingsRes.value?.data?.shop) {
          setShopProfile(settingsRes.value.data.shop);
        }
      } catch (err) {
        console.error('Failed to init receive page:', err);
      } finally {
        setLoadingInit(false);
      }
    };

    init();
  }, []);

  // Fetch pending mobiles whenever vendorId changes (for Workflow A)
  useEffect(() => {
    if (!vendorId) {
      setPendingMobiles([]);
      setSelectedMobileIds([]);
      return;
    }

    const fetchPending = async () => {
      try {
        setLoadingPending(true);
        const res = await vendorService.getPendingMobilesWithVendor(vendorId);
        const list = res?.data?.mobiles || [];
        setPendingMobiles(list);

        // Prepopulate default receive data for each pending mobile
        const initialData = {};
        list.forEach((m) => {
          initialData[m.id] = {
            actual_cost: String(m.estimated_cost || 0),
            repair_result: 'REPAIRED',
            warranty: '30 Days Warranty',
            remarks: '',
          };
        });
        setReceiveItemsData(initialData);
        setSelectedMobileIds([]);
      } catch (err) {
        console.error('Failed to fetch pending mobiles:', err);
      } finally {
        setLoadingPending(false);
      }
    };

    fetchPending();
  }, [vendorId]);

  const activeVendor = vendors.find((v) => v.id === vendorId);

  // -------------------------------------------------------------
  // Workflow A Selection & Update Handlers
  // -------------------------------------------------------------
  const toggleSelectMobile = (id) => {
    setSelectedMobileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllPending = () => {
    if (selectedMobileIds.length === pendingMobiles.length) {
      setSelectedMobileIds([]);
    } else {
      setSelectedMobileIds(pendingMobiles.map((m) => m.id));
    }
  };

  const handleUpdateReceiveItem = (mobileId, field, val) => {
    setReceiveItemsData((prev) => ({
      ...prev,
      [mobileId]: {
        ...(prev[mobileId] || {}),
        [field]: val,
      },
    }));
  };

  const totalWorkflowAActualCost = selectedMobileIds.reduce((sum, id) => {
    const item = receiveItemsData[id] || {};
    return sum + (parseFloat(item.actual_cost) || 0);
  }, 0);

  // -------------------------------------------------------------
  // Workflow B Dynamic Row Handlers
  // -------------------------------------------------------------
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
        condition: 'Normal',
        accessories: 'Device Only',
        expected_return_date: '',
        estimated_cost: '',
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
      toast.error('At least one mobile row required.');
      return;
    }
    setB2bMobiles((prev) => prev.filter((_, i) => i !== index));
  };

  // -------------------------------------------------------------
  // Submit Handlers
  // -------------------------------------------------------------
  const handleSubmitWorkflowA = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      toast.error('Please select a vendor.');
      return;
    }
    if (selectedMobileIds.length === 0) {
      toast.error('Please select at least one mobile to receive from this vendor.');
      return;
    }

    const payloadItems = selectedMobileIds.map((id) => {
      const item = receiveItemsData[id] || {};
      return {
        mobile_id: id,
        actual_cost: parseFloat(item.actual_cost) || 0,
        repair_result: item.repair_result || 'REPAIRED',
        warranty: item.warranty || '',
        remarks: item.remarks || '',
      };
    });

    try {
      setSubmitting(true);
      const res = await vendorService.receiveMobilesFromVendor({
        vendor_id: vendorId,
        txn_date: receiveDate,
        received_items: payloadItems,
        paid_amount: parseFloat(paidAmount) || 0,
        payment_mode: paidAmount > 0 ? paymentMode : 'NONE',
        payment_ref: paymentRef,
        notes,
      });

      if (res.success) {
        toast.success(`Received ${payloadItems.length} handset(s) under Inward Return #${res.data.txn_number}`);
        setSavedResult(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to receive mobiles');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitWorkflowB = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      toast.error('Please select a vendor.');
      return;
    }

    const validMobiles = b2bMobiles.filter(
      (m) => m.model.trim() || m.repair_problem.trim() || m.imei.trim()
    );

    if (validMobiles.length === 0) {
      toast.error('Please enter details for at least one mobile.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await vendorService.recordVendorJobInward({
        vendor_id: vendorId,
        txn_date: receiveDate,
        notes,
        mobiles: validMobiles,
      });

      if (res.success) {
        toast.success(`Logged ${validMobiles.length} client device(s) under Job Inward #${res.data.txn_number}`);
        setSavedResult(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to log inward vendor jobs');
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
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              Receive Mobiles from Vendor (Inward Intake)
            </h1>
            <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5 font-normal">
              Process partial/full returns of previously dispatched handsets, or accept new client repairs from vendor
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <VendorNavTabs activeTab="/vendors/receive" />

      {/* Workflow Selector Cards (Workflow A vs Workflow B) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setActiveWorkflow('WORKFLOW_A')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none active:scale-[0.99] ${
            activeWorkflow === 'WORKFLOW_A'
              ? 'bg-blue-500/[0.08] border-[#0071e3] ring-1 ring-[#0071e3]/30 shadow-xs'
              : 'spatial-card spatial-card-hover'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-[var(--spatial-text-title)] flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-[#0071e3] dark:text-[#0a84ff]" />
              Workflow A: Receive Previously Sent Mobiles
            </span>
            {activeWorkflow === 'WORKFLOW_A' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0071e3] text-white">
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-2 leading-relaxed font-normal">
            We sent mobiles to vendor for specialized repair. Receive them back (supports partial returns!), record actual charges, warranty, and update vendor ledger.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveWorkflow('WORKFLOW_B')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none active:scale-[0.99] ${
            activeWorkflow === 'WORKFLOW_B'
              ? 'bg-emerald-500/[0.08] border-emerald-500 ring-1 ring-emerald-500/30 shadow-xs'
              : 'spatial-card spatial-card-hover'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-[var(--spatial-text-title)] flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Workflow B: Receive New Mobiles from Vendor (B2B Repair)
            </span>
            {activeWorkflow === 'WORKFLOW_B' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white">
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-2 leading-relaxed font-normal">
            Vendor brings retail handsets to OUR shop for repair. Track them as B2B repair jobs at our shop, and return back to vendor when completed.
          </p>
        </button>
      </div>

      {/* =================================================================== */}
      {/* WORKFLOW A: RECEIVE PREVIOUSLY SENT MOBILES                         */}
      {/* =================================================================== */}
      {activeWorkflow === 'WORKFLOW_A' && (
        <form onSubmit={handleSubmitWorkflowA} className="space-y-6">
          {/* Vendor Selection Card */}
          <Card title="1. Select Vendor & Receive Date">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Vendor Partner <span className="text-rose-400">*</span>
                </label>
                <SpatialSelect
                  value={vendorId}
                  onChange={(val) => setVendorId(val)}
                  options={vendors.map((v) => ({
                    value: v.id,
                    label: `${v.name} (${v.shop_name || 'Vendor'})`,
                    subtitle: `Pending at Lab: ${v.mobiles_currently_at_vendor || 0} phones`,
                    badge: v.vendor_code,
                  }))}
                  placeholder="-- Select Vendor --"
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
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                  className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </Card>

          {/* Pending Mobiles Selection Table (Supports Partial Returns!) */}
          <Card
            title={`2. Mobiles Currently Pending with ${activeVendor?.name || 'Vendor'}`}
            subtitle="Check one or more handsets to receive back. You can perform partial returns anytime."
            action={
              pendingMobiles.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllPending}
                  className="text-xs font-semibold text-sky-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  {selectedMobileIds.length === pendingMobiles.length ? (
                    <>
                      <CheckSquare className="w-4 h-4" /> Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" /> Select All ({pendingMobiles.length})
                    </>
                  )}
                </button>
              )
            }
            bodyClassName="p-0"
          >
            {loadingPending ? (
              <TableSkeleton rows={4} columns={6} showHeader={false} showPagination={false} />
            ) : pendingMobiles.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No pending mobiles with this vendor"
                description="This vendor currently has 0 handsets awaiting return."
                actionLabel="Send Mobiles to Vendor"
                onAction={() => navigate(`/vendors/send?vendorId=${vendorId}`)}
              />
            ) : (
              <div className="divide-y divide-[var(--spatial-border)] spatial-tab-pane">
                {pendingMobiles.map((mob) => {
                  const isSelected = selectedMobileIds.includes(mob.id);
                  const itemData = receiveItemsData[mob.id] || {};

                  return (
                    <div
                      key={mob.id}
                      className={`p-4 transition-all ${
                        isSelected ? 'bg-sky-500/[0.06] border-l-4 border-sky-400' : 'hover:bg-[var(--spatial-bg-card-subtle)]'
                      }`}
                    >
                      {/* Top Row: Checkbox, Mobile Info, Sent Date */}
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectMobile(mob.id)}
                          className="w-5 h-5 rounded text-sky-500 accent-sky-500 cursor-pointer mt-0.5"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[var(--spatial-text-title)]">
                              {mob.brand} {mob.model}
                            </span>
                            {mob.imei && (
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-sky-300 border border-sky-500/20">
                                IMEI: {mob.imei}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                              {mob.current_status}
                            </span>
                          </div>

                          <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
                            <span className="font-semibold text-slate-300">Reported Problem:</span> {mob.repair_problem}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-[var(--spatial-text-muted)] mt-1">
                            <span>Sent: {formatInvoiceDate(mob.sent_date || mob.created_at)}</span>
                            <span>•</span>
                            <span>Est: {formatIndianCurrency(mob.estimated_cost || 0, true)}</span>
                            {mob.customer_name && (
                              <>
                                <span>•</span>
                                <span>Customer: {mob.customer_name}</span>
                              </>
                            )}
                          </div>

                          {/* Editable Return Fields (Only enabled when selected!) */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-[var(--spatial-border)] grid grid-cols-1 sm:grid-cols-4 gap-3 animate-in fade-in">
                              {/* Actual Cost */}
                              <div>
                                <label className="block text-[10px] font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                                  Actual Charge (₹) *
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    required={isSelected}
                                    value={itemData.actual_cost ?? ''}
                                    onChange={(e) => handleUpdateReceiveItem(mob.id, 'actual_cost', e.target.value)}
                                    className="w-full h-10 pl-6 pr-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl font-mono text-xs font-bold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                                  />
                                </div>
                              </div>

                              {/* Repair Result */}
                              <div>
                                <label className="block text-[10px] font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                                  Repair Result *
                                </label>
                                <SpatialSelect
                                  value={itemData.repair_result || 'REPAIRED'}
                                  onChange={(val) => handleUpdateReceiveItem(mob.id, 'repair_result', val)}
                                  options={[
                                    { value: 'REPAIRED', label: 'Repaired Successfully' },
                                    { value: 'NOT_REPAIRED', label: 'Not Repaired / RNR' },
                                    { value: 'REPLACED', label: 'Unit / Part Replaced' },
                                    { value: 'CANCELLED', label: 'Cancelled by Customer' },
                                  ]}
                                  searchable={false}
                                />
                              </div>

                              {/* Warranty Provided */}
                              <div>
                                <label className="block text-[10px] font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                                  Warranty
                                </label>
                                <SpatialWarrantyInput
                                  value={itemData.warranty || ''}
                                  onChange={(val) => handleUpdateReceiveItem(mob.id, 'warranty', val)}
                                  placeholder="e.g. 30 Days Warranty"
                                  heightClass="h-10"
                                />
                              </div>

                              {/* Remarks */}
                              <div>
                                <label className="block text-[10px] font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                                  Lab Remarks
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Audio IC replaced, tested OK"
                                  value={itemData.remarks || ''}
                                  onChange={(e) => handleUpdateReceiveItem(mob.id, 'remarks', e.target.value)}
                                  className="w-full h-10 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Payment Settlement & General Notes (Workflow A) */}
          {selectedMobileIds.length > 0 && (
            <Card title="3. Financial Settlement on Receive" subtitle="Pay vendor now or post to vendor ledger balance">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                    Amount Paid Now (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00 (Leave 0 to post to ledger)"
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
                      { value: 'CASH', label: 'Cash in Hand' },
                      { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                    ]}
                    searchable={false}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                    Reference / UTR #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref / Cash voucher"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] text-xs">
                <div>
                  <span className="text-[var(--spatial-text-muted)]">Selected Mobiles to Return:</span>{' '}
                  <span className="font-bold text-sky-400 font-mono text-sm">{selectedMobileIds.length}</span>
                </div>
                <div>
                  <span className="text-[var(--spatial-text-muted)]">Total Actual Charges:</span>{' '}
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    {formatIndianCurrency(totalWorkflowAActualCost, true)}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--spatial-text-muted)]">Unsettled (Posted to Ledger):</span>{' '}
                  <span className="font-bold text-rose-400 font-mono text-sm">
                    {formatIndianCurrency(Math.max(0, totalWorkflowAActualCost - (parseFloat(paidAmount) || 0)), true)}
                  </span>
                </div>
              </div>
            </Card>
          )}

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
              disabled={selectedMobileIds.length === 0}
              loading={submitting}
            >
              Receive ({selectedMobileIds.length}) Mobiles & Post to Ledger
            </Button>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* WORKFLOW B: RECEIVE NEW MOBILES FROM VENDOR (B2B JOB)               */}
      {/* =================================================================== */}
      {activeWorkflow === 'WORKFLOW_B' && (
        <form onSubmit={handleSubmitWorkflowB} className="space-y-6">
          <Card title="1. Origin Vendor & Inward Date" subtitle="Select the vendor who brought client handsets to your shop">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Origin Vendor <span className="text-rose-400">*</span>
                </label>
                <SpatialSelect
                  value={vendorId}
                  onChange={(val) => setVendorId(val)}
                  options={vendors.map((v) => ({
                    value: v.id,
                    label: `${v.name} (${v.shop_name || 'Vendor'})`,
                    subtitle: `Phone: ${v.mobile}`,
                    badge: v.vendor_code,
                  }))}
                  placeholder="-- Select Vendor --"
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
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                  className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </Card>

          {/* Multiple Mobile Entry for B2B Client Repairs */}
          <Card
            title="2. Client Mobiles Brought by Vendor"
            subtitle="Add unlimited handsets to repair at your shop for this vendor"
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
                  className="p-4 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--spatial-border)]">
                    <span className="text-xs font-bold text-[var(--spatial-text-title)] uppercase">
                      Client Mobile #{idx + 1}
                    </span>
                    {b2bMobiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveB2bRow(idx)}
                        className="p-1 rounded text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                        Brand *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vivo, Realme"
                        value={mob.brand}
                        onChange={(e) => handleUpdateB2bMobile(idx, 'brand', e.target.value)}
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                        Model *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. V29 Pro"
                        value={mob.model}
                        onChange={(e) => handleUpdateB2bMobile(idx, 'model', e.target.value)}
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-semibold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                        IMEI / Serial
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 864521098765432"
                        value={mob.imei}
                        onChange={(e) => handleUpdateB2bMobile(idx, 'imei', e.target.value)}
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-mono text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                        Repair Problem *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Charging port broken, Software bricked, Display replacement"
                        value={mob.repair_problem}
                        onChange={(e) => handleUpdateB2bMobile(idx, 'repair_problem', e.target.value)}
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                        Estimated B2B Repair Charge (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={mob.estimated_cost}
                        onChange={(e) => handleUpdateB2bMobile(idx, 'estimated_cost', e.target.value)}
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs font-mono font-bold text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

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
              Save & Log Inward Vendor Jobs
            </Button>
          </div>
        </form>
      )}

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
