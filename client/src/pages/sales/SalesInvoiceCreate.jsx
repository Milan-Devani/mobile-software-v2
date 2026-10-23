import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Package,
  Plus,
  Trash2,
  Printer,
  Save,
  Receipt,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Percent,
  IndianRupee,
  ArrowLeft,
  X,
  CreditCard,
  Building,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, LoadingSpinner } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { SpatialWarrantyInput } from '../../components/common/SpatialWarrantyInput';
import { SpatialPartsPicker } from '../../components/common/SpatialPartsPicker';
import { Modal } from '../../components/common/Modal';
import { customerService } from '../../services/customerService';
import { partsService } from '../../services/partsService';
import { settingsService } from '../../services/settingsService';
import { salesService } from '../../services/salesService';
import { SameToSameBillPrintable } from '../../components/sales/SameToSameBillPrintable';
import { formatIndianCurrency } from '../../utils/billFormatters';

export const SalesInvoiceCreate = () => {
  const navigate = useNavigate();
  const [loadingInit, setLoadingInit] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shop & Inventory
  const [shopProfile, setShopProfile] = useState(null);
  const [availableParts, setAvailableParts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Customer state (Same like Create Repair Job Sheet)
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('Gujarat ( 24 )');
  const [customerGstin, setCustomerGstin] = useState('');

  // Quick New Customer Modal (Same like Create Repair Job Sheet)
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustWhatsapp, setNewCustWhatsapp] = useState('');
  const [newCustSameAsPhone, setNewCustSameAsPhone] = useState(true);
  const [newCustAltPhone, setNewCustAltPhone] = useState('');
  const [newCustAltWhatsapp, setNewCustAltWhatsapp] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Bill Meta
  const [invoiceNumber, setInvoiceNumber] = useState('47');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('CASH');

  // Discount Card (Same like Prepare Repair Estimate: AMOUNT vs PERCENTAGE)
  const [discountType, setDiscountType] = useState('AMOUNT'); // 'AMOUNT' or 'PERCENTAGE'
  const [discountValue, setDiscountValue] = useState(0);

  // GST / Tax Toggle & Rate Control (Same like Prepare Repair Estimate)
  const [applyTax, setApplyTax] = useState(false);
  const [gstType, setGstType] = useState('IGST'); // 'IGST' or 'CGST_SGST'
  const [taxRate, setTaxRate] = useState(18);

  // Products & Items for Sale (Initially empty)
  const [items, setItems] = useState([
    {
      id: 'item-1',
      item_name: '',
      description: '',
      warranty: '',
      hsn: '8517',
      quantity: 1,
      unit: 'NOS',
      unit_price: '',
      part_id: null,
    },
  ]);

  // Modal to show the "Same to Same" printable bill on Save & Print
  const [savedBillData, setSavedBillData] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    const loadInit = async () => {
      try {
        setLoadingInit(true);
        const [settingsRes, nextNoRes, partsRes, custRes] = await Promise.allSettled([
          settingsService.getSettings(),
          salesService.getNextInvoiceNumber(),
          partsService.getParts({ limit: 150 }),
          customerService.getCustomers({ limit: 200 }),
        ]);

        if (settingsRes.status === 'fulfilled' && settingsRes.value?.data?.shop) {
          setShopProfile(settingsRes.value.data.shop);
        }
        if (nextNoRes.status === 'fulfilled' && nextNoRes.value?.data) {
          const seq = nextNoRes.value.data.seqNumber || '47';
          setInvoiceNumber(String(seq));
        }
        if (partsRes.status === 'fulfilled' && partsRes.value) {
          const list = Array.isArray(partsRes.value) ? partsRes.value : partsRes.value.parts || [];
          setAvailableParts(list);
        }
        if (custRes.status === 'fulfilled' && custRes.value) {
          const custList = Array.isArray(custRes.value) ? custRes.value : custRes.value.customers || [];
          setCustomers(custList);
          // Left unselected initially so user can choose or enter customer
        }
      } catch (err) {
        console.error('Failed to init billing engine:', err);
      } finally {
        setLoadingInit(false);
      }
    };

    loadInit();
  }, []);

  // Sync selected customer
  useEffect(() => {
    if (!selectedCustomerId) return;
    const found = customers.find((c) => c.id === selectedCustomerId);
    if (found) {
      setCustomerName(found.full_name || '');
      setCustomerPhone(found.phone || '');
      setCustomerEmail(found.email || '');
      setCustomerAddress(found.address || '');
    }
  }, [selectedCustomerId, customers]);

  // Handle Quick Customer Registration (Modal)
  const handleQuickCustomerCreate = async (e) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      toast.error('Customer name and primary phone are required');
      return;
    }

    try {
      const created = await customerService.createCustomer({
        full_name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: newCustEmail.trim() || null,
        whatsapp_number: newCustSameAsPhone ? newCustPhone.trim() : (newCustWhatsapp.trim() || newCustPhone.trim()),
        alternate_phone: newCustAltPhone.trim() || null,
        alternate_whatsapp: newCustAltWhatsapp.trim() || null,
        address: newCustAddress.trim() || null,
        user_type: 'End User',
        notes: 'Created from Sales Billing',
      });

      toast.success(`Customer "${created.full_name}" registered!`);
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomerId(created.id);
      setIsNewCustModalOpen(false);

      // Reset
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustWhatsapp('');
      setNewCustAltPhone('');
      setNewCustAltWhatsapp('');
      setNewCustAddress('');
    } catch (err) {
      toast.error(err.message || 'Failed to create customer');
    }
  };

  // Line Items Helper functions (Same like Prepare Repair Estimate)
  const handleAddEstimateItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        item_name: '',
        description: '',
        warranty: '',
        hsn: '8517',
        quantity: 1,
        unit: 'NOS',
        unit_price: '',
        part_id: null,
      },
    ]);
  };

  const handleUpdateItem = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveEstimateItem = (index) => {
    if (items.length <= 1) {
      toast.error('Bill must have at least one item');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Item from Inventory
  const handleSelectFromInventoryPart = (part) => {
    if (!part) return;

    setItems((prev) => {
      // Check if last row is empty, fill it
      const lastIdx = prev.length - 1;
      const newItem = {
        id: `part-${Date.now()}`,
        item_name: part.name,
        description: part.brand ? `Brand: ${part.brand}` : '',
        warranty: '90 Days Warranty',
        hsn: '8517',
        quantity: 1,
        unit: 'NOS',
        unit_price: part.selling_price || 0,
        part_id: part.id,
      };

      if (lastIdx >= 0 && !prev[lastIdx].item_name && (!prev[lastIdx].unit_price || prev[lastIdx].unit_price === '')) {
        const copy = [...prev];
        copy[lastIdx] = newItem;
        return copy;
      }
      return [...prev, newItem];
    });

    toast.success(`Added "${part.name}" from inventory!`);
  };

  // Totals Calculations
  const rawSubtotal = items.reduce((sum, it) => {
    const q = Math.max(1, parseInt(it.quantity, 10) || 1);
    const p = Math.max(0, parseFloat(it.unit_price) || 0);
    return sum + (q * p);
  }, 0);

  const numDiscountVal = Math.max(0, parseFloat(discountValue) || 0);
  let discountAmount = 0;
  if (discountType === 'PERCENTAGE') {
    discountAmount = Math.round((rawSubtotal * numDiscountVal) / 100 * 100) / 100;
  } else {
    discountAmount = Math.min(rawSubtotal, numDiscountVal);
  }

  const taxableAmount = Math.max(0, rawSubtotal - discountAmount);
  const effectiveGstRate = applyTax ? (parseFloat(taxRate) || 18) : 0;
  const totalTax = applyTax ? Math.round((taxableAmount * effectiveGstRate) / 100 * 100) / 100 : 0;
  const grandTotal = Math.round((taxableAmount + totalTax) * 100) / 100;

  // Save Bill API Call
  const handleSaveBill = async (shouldOpenPrint = false) => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Please select or enter customer name and phone');
      return;
    }

    const validItems = items.filter((it) => it.item_name && it.item_name.trim());
    if (validItems.length === 0) {
      toast.error('Please enter at least one item name and price');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_address: customerAddress,
        place_of_supply: placeOfSupply,
        customer_gstin: customerGstin,
        items: validItems.map((it) => ({
          name: it.item_name,
          imei: it.description || '', // Stores IMEI / Serial / Description
          warranty: it.warranty || '',
          hsn: it.hsn || '8517',
          quantity: parseInt(it.quantity, 10) || 1,
          rate: parseFloat(it.unit_price) || 0,
          part_id: it.part_id || null,
        })),
        gst_enabled: applyTax,
        gst_type: gstType,
        gst_rate: effectiveGstRate,
        discount_type: discountType.toLowerCase(),
        discount_value: numDiscountVal,
        payment_mode: paymentMode,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
      };

      const res = await salesService.createSale(payload);
      const createdSale = res?.data?.sale || res?.sale;
      if (createdSale || res?.success) {
        const finalSale = createdSale || res?.data?.sale || res;
        setSavedBillData(finalSale);
        const invNum = finalSale.invoice_no_seq || finalSale.invoice_number || invoiceNumber;
        toast.success(`Bill #${invNum} saved & real PDF invoice sent to customer!`, { duration: 4000 });

        if (shouldOpenPrint) {
          setIsPrintModalOpen(true);
        } else {
          // Immediately navigate back to sales list page
          navigate('/sales');
        }
      }
    } catch (err) {
      console.error('Failed to save sales bill:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInit) {
    return <LoadingSpinner fullPage label="Preparing Sales Billing engine..." />;
  }

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="p-2 rounded-xl text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] transition-all cursor-pointer active:scale-95"
            title="Back to sales"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-2xl sm:text-[28px] font-semibold text-[var(--spatial-text-title)] tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-[#0a84ff] border border-blue-500/20 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              Generate Bill (Sell Phone & Parts)
            </h2>
            <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5 font-normal">
              Record sales, itemize phone IMEIs and replacement parts, configure GST tax & discounts
            </p>
          </div>
        </div>

        {/* Invoice Number & Date Badge */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-[#0071e3] dark:text-[#0a84ff] tabular-nums">
            Bill #{invoiceNumber}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* =================================================================== */}
        {/* SECTION 1: CUSTOMER INFORMATION (Exact like Create Repair Job Sheet)*/}
        {/* =================================================================== */}
        <Card
          title="1. Customer Information"
          subtitle="Select existing customer or register a new one"
          className="relative z-30"
          hover={false}
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Customer *
                </label>
                <SpatialSelect
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.full_name,
                    subtitle: c.phone,
                    badge: c.customer_code || 'CUST',
                  }))}
                  value={selectedCustomerId}
                  onChange={(val) => setSelectedCustomerId(val)}
                  placeholder="-- Select Customer or Search by Name / Phone --"
                  searchable
                  searchPlaceholder="Search customer by name, phone, code..."
                />
              </div>
              <div className="sm:pt-5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={() => setIsNewCustModalOpen(true)}
                >
                  New Customer
                </Button>
              </div>
            </div>

            {/* Selected Customer Contact Details Preview Card (Exact like JobCreate) */}
            {selectedCustomerObj ? (
              <div className="p-3.5 bg-[var(--spatial-bg-card-subtle)] rounded-xl border border-[var(--spatial-border)] hover:border-sky-400/40 text-xs space-y-2 mt-2 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--spatial-text-title)]">{selectedCustomerObj.full_name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--spatial-bg-card)] border border-[var(--spatial-border)] text-[var(--spatial-text-muted)] text-[10px] font-semibold">
                      {selectedCustomerObj.user_type || 'End User'}
                    </span>
                  </div>
                  <span className="font-mono text-sky-400 text-[11px] font-semibold">{selectedCustomerObj.customer_code || 'CUST'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-[var(--spatial-text-muted)]">Primary Phone:</span>
                    <p className="font-mono font-semibold text-[var(--spatial-text-title)]">{selectedCustomerObj.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[var(--spatial-text-muted)]">WhatsApp Number:</span>
                    <p className="font-mono font-semibold text-[var(--spatial-text-title)]">{selectedCustomerObj.whatsapp_number || selectedCustomerObj.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[var(--spatial-text-muted)]">Alternate Phone:</span>
                    <p className="font-mono font-semibold text-[var(--spatial-text-title)]">{selectedCustomerObj.alternate_phone || 'None'}</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-1.5 rounded-lg">
                    <span className="text-emerald-400 font-semibold">Alt Contact:</span>
                    <p className="font-mono font-bold text-emerald-300">
                      {selectedCustomerObj.alternate_whatsapp || selectedCustomerObj.alternate_phone || 'None recorded'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--spatial-text-muted)] pt-1 border-t border-[var(--spatial-border)] flex-wrap gap-2">
                  <div>
                    <span>Mail ID:</span> <span className="text-[var(--spatial-text-title)] font-medium">{selectedCustomerObj.email || 'None'}</span>
                  </div>
                  {selectedCustomerObj.address && (
                    <div className="truncate max-w-sm">
                      <span>Address:</span> <span className="text-[var(--spatial-text-title)] font-medium">{selectedCustomerObj.address}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Fallback Manual Customer Entry if no customer selected */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                    User Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ronak Panchal"
                    className="w-full h-11 px-3.5 py-2.5 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                    Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full h-11 px-3.5 py-2.5 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>
            )}

            {/* Billing Specific Info: Place of Supply & GSTIN with increased height */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[var(--spatial-border)]">
              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1.5">
                  Place of Supply
                </label>
                <input
                  type="text"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  placeholder="e.g. Gujarat ( 24 )"
                  className="w-full h-11 px-3.5 py-2.5 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1.5">
                  Customer GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 24ABCDE1234F1Z5"
                  className="w-full h-11 px-3.5 py-2.5 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono font-semibold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1.5">
                  Payment Mode
                </label>
                <SpatialSelect
                  value={paymentMode}
                  onChange={(val) => setPaymentMode(val)}
                  options={[
                    { value: 'CASH', label: 'Cash' },
                    { value: 'UPI', label: 'UPI / QR Code' },
                    { value: 'CARD', label: 'Credit / Debit Card' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT' },
                  ]}
                  placeholder="Select Payment Mode"
                  searchable={false}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* =================================================================== */}
        {/* SECTION 2: PREPARE REPAIR ESTIMATE                                  */}
        {/* (Exact layout from JobDetail.jsx: Prepare Repair Estimate)          */}
        {/* =================================================================== */}
        <Card
          title="2. Prepare Repair Estimate"
          subtitle="Configure items, IMEIs/serials, warranties, discounts, and GST tax"
          className="relative z-20 space-y-5"
          hover={false}
        >
          {/* Discount Card with Radio Option (Amount vs Percentage) */}
          <div className="p-4 bg-[var(--spatial-bg-card-subtle)] rounded-xl border border-[var(--spatial-border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider">
                Discount Mode
              </label>
              {/* Radio options: Amount vs Percentage */}
              <div className="inline-flex items-center gap-4 bg-[var(--spatial-input-bg)] px-3 py-1.5 rounded-lg border border-[var(--spatial-border)] text-xs font-semibold">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--spatial-text-body)] hover:text-sky-500 transition-colors">
                  <input
                    type="radio"
                    name="discount_mode"
                    value="AMOUNT"
                    checked={discountType === 'AMOUNT'}
                    onChange={() => setDiscountType('AMOUNT')}
                    className="w-4 h-4 text-sky-500 border-[var(--spatial-border)] focus:ring-sky-500 cursor-pointer"
                  />
                  <span>Amount (₹)</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--spatial-text-body)] hover:text-sky-500 transition-colors">
                  <input
                    type="radio"
                    name="discount_mode"
                    value="PERCENTAGE"
                    checked={discountType === 'PERCENTAGE'}
                    onChange={() => setDiscountType('PERCENTAGE')}
                    className="w-4 h-4 text-sky-500 border-[var(--spatial-border)] focus:ring-sky-500 cursor-pointer"
                  />
                  <span>Percentage (%)</span>
                </label>
              </div>
            </div>

            <div className="max-w-md">
              <div className="relative">
                {discountType === 'AMOUNT' ? (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--spatial-text-muted)] font-mono text-sm">
                    ₹
                  </span>
                ) : (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--spatial-text-muted)] font-mono text-sm font-bold">
                    %
                  </span>
                )}
                <input
                  type="number"
                  step={discountType === 'PERCENTAGE' ? '0.1' : '1'}
                  min="0"
                  max={discountType === 'PERCENTAGE' ? '100' : undefined}
                  placeholder={discountType === 'PERCENTAGE' ? 'e.g. 10 (%)' : '0.00'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className={`w-full h-11 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-sm font-mono text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none ${discountType === 'AMOUNT' ? 'pl-8 pr-3' : 'pl-3 pr-8'
                    }`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--spatial-text-muted)] mt-1.5">
                <span>
                  {discountType === 'PERCENTAGE'
                    ? 'Promotional or loyalty percentage discount'
                    : 'Fixed currency discount deduction'}
                </span>
                {discountAmount > 0 && (
                  <span className="font-semibold text-emerald-500 font-mono">
                    = -{formatIndianCurrency(discountAmount, true)} off
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* GST / Tax Toggle & Rate Control (Same like Prepare Repair Estimate) */}
          <div className="p-4 bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyTax}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setApplyTax(checked);
                      if (checked && (!taxRate || taxRate === 0)) setTaxRate(18);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--spatial-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <div>
                  <span className="text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wide block">
                    {applyTax ? 'GST / Tax is Applied (ON - Tax Invoice)' : 'GST / Tax is Disabled (OFF - Retail Bill)'}
                  </span>
                  <p className="text-[11px] text-[var(--spatial-text-muted)]">
                    {applyTax
                      ? 'Tax will be computed and itemized on the final invoice'
                      : 'Customer will only pay subtotal without additional GST'}
                  </p>
                </div>
              </div>

              {applyTax && (
                <div className="flex items-center gap-4">
                  {/* Radio: IGST vs CGST+SGST */}
                  <div className="inline-flex items-center gap-3 text-xs font-semibold text-[var(--spatial-text-title)]">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="tax_jurisdiction"
                        checked={gstType === 'IGST'}
                        onChange={() => setGstType('IGST')}
                        className="text-sky-500"
                      />
                      <span>IGST</span>
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="tax_jurisdiction"
                        checked={gstType === 'CGST_SGST'}
                        onChange={() => setGstType('CGST_SGST')}
                        className="text-sky-500"
                      />
                      <span>CGST + SGST</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-1.5 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-lg px-3 py-1.5 shadow-2xs">
                    <span className="text-xs font-semibold text-[var(--spatial-text-muted)]">Rate:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className="w-12 text-xs font-mono font-bold text-[var(--spatial-text-title)] bg-transparent focus:outline-none text-right"
                    />
                    <span className="text-xs font-bold text-[var(--spatial-text-title)]">%</span>
                  </div>
                </div>
              )}
            </div>

            {applyTax && (
              <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--spatial-border)]">
                <span className="text-[10px] text-[var(--spatial-text-muted)] font-semibold uppercase">Presets:</span>
                {[5, 12, 18, 28].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setTaxRate(rate)}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${Number(taxRate) === rate
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-[var(--spatial-bg-card)] hover:bg-[var(--spatial-bg-card-hover)] text-[var(--spatial-text-title)] border border-[var(--spatial-border)]'
                      }`}
                  >
                    {rate}% GST
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Parts & Repair Details List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[var(--spatial-text-title)] uppercase tracking-wider">
                  Parts & Repair Details
                </label>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20 rounded-full">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Quick Pick From Inventory with custom Spatial Parts Picker */}
              {availableParts.length > 0 && (
                <SpatialPartsPicker
                  parts={availableParts}
                  onSelect={handleSelectFromInventoryPart}
                  placeholder="+ From Inventory..."
                />
              )}
            </div>

            {/* Column Headers for desktop (With Warranty Input Field) */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-3.5 py-2.5 bg-[var(--spatial-table-header-bg)] rounded-xl text-xs font-bold text-[var(--spatial-text-muted)] uppercase tracking-wider border border-[var(--spatial-border)]">
              <div className="col-span-6">Item / Phone / Part Name</div>
              <div className="col-span-2">Warranty</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-2 text-right pr-2">Price (₹)</div>
              <div className="col-span-1 text-right pr-1">Total</div>
            </div>

            {/* Item Field Rows */}
            <div className="space-y-3">
              {items.map((item, idx) => {
                const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
                const price = Math.max(0, parseFloat(item.unit_price) || 0);
                const lineTotal = qty * price;

                return (
                  <div
                    key={item.id || idx}
                    className="p-3.5 bg-[var(--spatial-bg-card)] hover:bg-[var(--spatial-bg-card-hover)] border border-[var(--spatial-border)] rounded-2xl transition-all shadow-xs space-y-3"
                  >
                    {/* Row 1: Item Name (Width 50%), Warranty, Qty, Price (Increased Width), Total & Delete */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      {/* 1. Item Name Input (Width 50% = 6 cols out of 12) */}
                      <div className="sm:col-span-6">
                        <label className="block sm:hidden text-xs font-semibold text-[var(--spatial-text-muted)] mb-1">
                          Item / Phone / Part Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. iPhone 15 Pro Max, Original AMOLED Screen, Battery..."
                          value={item.item_name || ''}
                          onChange={(e) => handleUpdateItem(idx, 'item_name', e.target.value)}
                          className="w-full h-11 px-3.5 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none font-medium"
                        />
                      </div>

                      {/* 2. Warranty Input Field */}
                      <div className="sm:col-span-2">
                        <label className="block sm:hidden text-xs font-semibold text-[var(--spatial-text-muted)] mb-1">
                          Warranty
                        </label>
                        <SpatialWarrantyInput
                          value={item.warranty || ''}
                          onChange={(val) => handleUpdateItem(idx, 'warranty', val)}
                          placeholder="e.g. 1 Year, 6 Months..."
                          heightClass="h-11"
                        />
                      </div>

                      {/* 3. Quantity Input */}
                      <div className="sm:col-span-1">
                        <label className="block sm:hidden text-xs font-semibold text-[var(--spatial-text-muted)] mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                          className="w-full h-11 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono text-center font-bold text-[var(--spatial-text-title)] focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>

                      {/* 4. Price Input (Increased Width = 2 cols out of 12) */}
                      <div className="sm:col-span-2">
                        <label className="block sm:hidden text-xs font-semibold text-[var(--spatial-text-muted)] mb-1">
                          Price (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--spatial-text-muted)] text-xs font-mono font-bold">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={item.unit_price}
                            onChange={(e) => handleUpdateItem(idx, 'unit_price', e.target.value)}
                            className="w-full h-11 pl-6 pr-2.5 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-mono text-right font-bold text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:ring-2 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* 5. Total & Remove Button */}
                      <div className="sm:col-span-1 flex items-center justify-between sm:justify-end gap-1.5">
                        <span className="font-mono text-xs sm:text-sm font-bold text-[var(--spatial-text-title)] text-right truncate">
                          {formatIndianCurrency(lineTotal, true)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveEstimateItem(idx)}
                          title="Remove this item"
                          className="p-2 text-[var(--spatial-text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Description / Serial / IMEI Input (Next Row, Wide Dedicated Field) */}
                    <div className="pt-2 border-t border-[var(--spatial-border)]/50">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                        <span className="text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase tracking-wider shrink-0 flex items-center gap-1">
                          Description / Serial / IMEI:
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. IMEI 358901234567890 / Serial Number / Storage / Color / Device Notes..."
                          value={item.description || ''}
                          onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                          className="flex-1 h-10 px-3.5 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* + Add Another Item Button (Exact dashed style like JobDetail) */}
              <button
                type="button"
                onClick={handleAddEstimateItem}
                className="w-full py-2.5 px-3 bg-[var(--spatial-bg-card-subtle)] hover:bg-[var(--spatial-bg-card-hover)] text-sky-500 hover:text-sky-400 border-2 border-dashed border-sky-500/30 hover:border-sky-500/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm group cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-sky-500/10 group-hover:bg-sky-500/20 text-sky-500 flex items-center justify-center transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span>Add Another Item / Product</span>
              </button>
            </div>
          </div>
        </Card>

        {/* =================================================================== */}
        {/* SECTION 3: INVOICE SUMMARY & CHECKOUT ACTIONS                       */}
        {/* =================================================================== */}
        <Card
          title="3. Invoice Summary & Actions"
          subtitle="Review payable amount, tax breakdown, and record or print bill"
          className="relative z-10"
          hover={false}
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-4 text-[var(--spatial-text-muted)]">
                  <span>Items Subtotal:</span>
                  <span className="font-mono font-bold text-[var(--spatial-text-title)]">
                    {formatIndianCurrency(rawSubtotal, true)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center gap-4 text-emerald-400">
                    <span>Discount Applied:</span>
                    <span className="font-mono font-bold">-{formatIndianCurrency(discountAmount, true)}</span>
                  </div>
                )}
                {applyTax && (
                  <div className="flex items-center gap-4 text-[var(--spatial-text-muted)]">
                    <span>GST ({taxRate}% {gstType}):</span>
                    <span className="font-mono font-bold text-[var(--spatial-text-title)]">
                      +{formatIndianCurrency(totalTax, true)}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase tracking-wider block">
                  Total Amount Payable
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                  {formatIndianCurrency(grandTotal, true)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--spatial-border)] flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => navigate('/sales')}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                icon={Save}
                loading={isSubmitting}
                onClick={() => handleSaveBill(false)}
              >
                Save Bill Only
              </Button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveBill(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                Save & Print Bill
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ===================================================================== */}
      {/* MODAL: NEW CUSTOMER REGISTRATION (Exact like Create Repair Job Sheet) */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isNewCustModalOpen}
        onClose={() => setIsNewCustModalOpen(false)}
        title="Register New Customer"
        subtitle="Quick registration for direct sales billing"
      >
        <form onSubmit={handleQuickCustomerCreate} className="space-y-4 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ronak Panchal"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="spatial-input text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Primary Phone *
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="spatial-input text-xs font-semibold font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Mail ID (Email)
            </label>
            <input
              type="email"
              placeholder="e.g. ronak@gmail.com"
              value={newCustEmail}
              onChange={(e) => setNewCustEmail(e.target.value)}
              className="spatial-input text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Address
            </label>
            <input
              type="text"
              placeholder="e.g. G/119, Varachha, Surat, Gujarat"
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              className="spatial-input text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--spatial-border)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewCustModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL: SAME TO SAME PRINTABLE BILL ON SAVE & PRINT                    */}
      {/* ===================================================================== */}
      {isPrintModalOpen && savedBillData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative max-w-4xl w-full my-8">
            <button
              onClick={() => {
                setIsPrintModalOpen(false);
                navigate('/sales');
              }}
              className="absolute -top-10 right-0 text-white hover:text-rose-400 flex items-center gap-1 text-xs font-semibold cursor-pointer print:hidden"
            >
              <X className="w-4 h-4" /> Close & View Sales
            </button>
            <SameToSameBillPrintable
              sale={savedBillData}
              shop={shopProfile}
              isPreview={false}
              onPrint={() => window.print()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
