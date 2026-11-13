import React, { useState, useEffect, useMemo, useCallback } from "react";
import { NavLink } from "react-router-dom";
import {
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  Plus,
  Search,
  Filter,
  IndianRupee,
  Printer,
  Copy,
  Check,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Receipt,
  X,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
  Card,
  LoadingSpinner,
  EmptyState,
  TableSkeleton,
  StatsSkeleton,
} from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { SpatialSelect } from "../../components/common/SpatialSelect";
import { SpatialTableSelect } from "../../components/common/SpatialTableSelect";
import { Modal } from "../../components/common/Modal";
import { BulkActionBar } from "../../components/common/BulkActionBar";
import { SendMobileModal } from "../../components/vendors/SendMobileModal";
import { ReceiveMobileModal } from "../../components/vendors/ReceiveMobileModal";
import { VendorModal } from "../../components/vendors/VendorModal";
import { VendorReceiptPrintable } from "../../components/vendors/VendorReceiptPrintable";
import VendorNavTabs from "../../components/vendors/VendorNavTabs";
import { vendorService } from "../../services/vendorService";
import { settingsService } from "../../services/settingsService";
import {
  formatIndianCurrency,
  formatInvoiceDate,
} from "../../utils/billFormatters";

const PAYMENT_STATUS_OPTIONS = [
  { value: "ALL", label: "All Payment Statuses" },
  { value: "PENDING", label: "🟡 Pending / Unpaid" },
  { value: "PAID", label: "🟢 Fully Paid" },
  { value: "ADVANCE", label: "🔵 Advance Paid" },
  { value: "FREE", label: "⚪ Free / Warranty Rework" },
];

const REPAIR_STATUS_OPTIONS = [
  { value: "ALL", label: "All Repair Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_REPAIR", label: "In Repair" },
  { value: "WAITING_PARTS", label: "Waiting Parts" },
  { value: "REPAIR_COMPLETED", label: "Repaired / Ready" },
  { value: "RETURNED", label: "Returned" },
  { value: "NOT_REPAIRABLE", label: "Not Repairable / Dead" },
  { value: "CANCELLED", label: "Cancelled" },
];

const TABLE_REPAIR_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_REPAIR", label: "In Repair" },
  { value: "WAITING_PARTS", label: "Waiting Parts" },
  { value: "REPAIR_COMPLETED", label: "Repaired / Ready" },
  { value: "RETURNED", label: "Returned" },
  { value: "NOT_REPAIRABLE", label: "Not Repairable / Dead" },
  { value: "CANCELLED", label: "Cancelled" },
];

const TABLE_PAYMENT_STATUS_OPTIONS_SENT = [
  { value: "PENDING", label: "🟡 Pending / Unpaid" },
  { value: "PAID", label: "🟢 Fully Paid" },
  { value: "ADVANCE", label: "🔵 Advance Paid" },
  { value: "FREE", label: "⚪ Free / Warranty" },
];

const TABLE_PAYMENT_STATUS_OPTIONS_RECEIVED = [
  { value: "PENDING", label: "🟡 Pending / Unpaid" },
  { value: "PAID", label: "🟢 Fully Paid" },
  { value: "ADVANCE", label: "🔵 Advance Received" },
  { value: "FREE", label: "⚪ Free / Warranty" },
];

export const VendorDashboard = () => {
  const [activeTab, setActiveTab] = useState("sent"); // 'sent' | 'received' | 'vendors'
  const [loading, setLoading] = useState(true);

  // Raw data from API
  const [sentMobiles, setSentMobiles] = useState([]);
  const [receivedMobiles, setReceivedMobiles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState(null);
  const [shopProfile, setShopProfile] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [repairStatusFilter, setRepairStatusFilter] = useState("ALL");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("");

  // Modals
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  // Checkbox selection states
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);

  // Detail & Print Modals
  const [selectedMobileDetail, setSelectedMobileDetail] = useState(null);
  const [printableTxn, setPrintableTxn] = useState(null);
  const [copiedImei, setCopiedImei] = useState("");

  // Calculate dashboard metrics
  const activeVendors = useMemo(() => {
    return vendors.filter(v => {
      const hasActiveMobiles = sentMobiles.some(m => m.vendor_id === v.id) ||
                            receivedMobiles.some(m => m.vendor_id === v.id);
      return hasActiveMobiles;
    }).length;
  }, [vendors, sentMobiles, receivedMobiles]);

  const collectedAmount = useMemo(() => {
    return sentMobiles
      .filter(m => m.payment_status === 'PAID')
      .reduce((sum, m) => sum + (m.actual_cost || 0), 0) +
      receivedMobiles
      .filter(m => m.payment_status === 'PAID')
      .reduce((sum, m) => sum + (m.actual_cost || 0), 0);
  }, [sentMobiles, receivedMobiles]);

  const pendingAmount = useMemo(() => {
    return sentMobiles
      .filter(m => m.payment_status === 'PENDING')
      .reduce((sum, m) => sum + (m.actual_cost || 0), 0) +
      receivedMobiles
      .filter(m => m.payment_status === 'PENDING')
      .reduce((sum, m) => sum + (m.actual_cost || 0), 0);
  }, [sentMobiles, receivedMobiles]);

  const advanceAmount = useMemo(() => {
    return sentMobiles
      .filter(m => m.payment_status === 'ADVANCE')
      .reduce((sum, m) => sum + (m.actual_cost || 0), 0) +
      receivedMobiles
      .filter(m => m.payment_status === 'ADVANCE')
      .reduce((sum, m) => sum + (m.actual_cost || 0), 0);
  }, [sentMobiles, receivedMobiles]);

  const advanceCount = useMemo(() => {
    return sentMobiles
      .filter(m => m.payment_status === 'ADVANCE').length +
      receivedMobiles
      .filter(m => m.payment_status === 'ADVANCE').length;
  }, [sentMobiles, receivedMobiles]);

  // Load all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [mobilesRes, vendorsRes, statsRes, settingsRes] =
        await Promise.allSettled([
          vendorService.getVendorMobiles({ limit: 300 }),
          vendorService.getVendors({ limit: 150 }),
          vendorService.getVendorStats(),
          settingsService.getSettings(),
        ]);

      if (mobilesRes.status === "fulfilled") {
        const allMobiles =
          mobilesRes.value?.data?.mobiles || mobilesRes.value?.mobiles || [];
        const sent = allMobiles.filter((m) => m.flow_type === "SENT_TO_VENDOR");
        const received = allMobiles.filter(
          (m) =>
            m.flow_type === "RECEIVED_FROM_VENDOR" ||
            m.flow_type === "VENDOR_JOB_INWARD",
        );
        setSentMobiles(sent);
        setReceivedMobiles(received);
      }

      if (vendorsRes.status === "fulfilled") {
        const list =
          vendorsRes.value?.data?.vendors || vendorsRes.value?.vendors || [];
        setVendors(list);
      }

      if (statsRes.status === "fulfilled") {
        const s = statsRes.value?.data || statsRes.value;
        if (s) setStats(s);
      }

      if (settingsRes.status === "fulfilled") {
        const shop = settingsRes.value?.data?.shop || settingsRes.value?.shop;
        if (shop) setShopProfile(shop);
      }
    } catch (err) {
      console.error("Failed to load vendor management data:", err);
      toast.error("Failed to refresh vendor data");
    } finally {
      setLoading(false);
    }
  }, []);

  const totalMobiles = useMemo(() => sentMobiles.length + receivedMobiles.length, [sentMobiles, receivedMobiles]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Copy IMEI Helper
  const handleCopyImei = (imei, e) => {
    if (e) e.stopPropagation();
    if (!imei) return;
    navigator.clipboard.writeText(imei);
    setCopiedImei(imei);
    toast.success(`IMEI ${imei} copied!`);
    setTimeout(() => setCopiedImei(""), 2000);
  };

  // Instant Payment Status update
  const handlePaymentStatusChange = async (mobileId, newStatus) => {
    try {
      await vendorService.updateMobilePaymentStatus(mobileId, newStatus);
      toast.success(`Payment status updated to ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to update payment status");
    }
  };

  // Instant Repair Status update
  const handleRepairStatusChange = async (mobileId, newStatus) => {
    try {
      await vendorService.updateMobileStatus(mobileId, newStatus);
      toast.success(`Repair status updated to ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to update repair status");
    }
  };

  // Delete Handset
  const handleDeleteMobile = (mobile, e) => {
    if (e) e.stopPropagation();
    Swal.fire({
      title: `Delete "${mobile.brand} ${mobile.model}"?`,
      text: `IMEI: ${mobile.imei || "N/A"}. This mobile record will be archived to Recycle Bin.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Delete",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await vendorService.deleteVendorMobile(mobile.id);
          toast.success("Mobile record deleted successfully");
          fetchData();
        } catch (err) {
          toast.error(err.message || "Failed to delete mobile record");
        }
      }
    });
  };

  // Selection Handlers for Vendors
  const toggleSelectAllVendors = () => {
    const visibleIds = filteredVendors.map((v) => v.id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedVendorIds.includes(id));
    if (allSelected) {
      setSelectedVendorIds(
        selectedVendorIds.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedVendorIds(
        Array.from(new Set([...selectedVendorIds, ...visibleIds])),
      );
    }
  };

  const toggleSelectVendor = (id) => {
    setSelectedVendorIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Bulk Delete Vendors
  const handleBulkDeleteVendors = () => {
    if (selectedVendorIds.length === 0) return;
    Swal.fire({
      title: `Delete ${selectedVendorIds.length} Vendor(s)?`,
      text: `Are you sure you want to remove the ${selectedVendorIds.length} selected vendor(s)? Any active test mobiles or records linked to them will also be archived.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: `Yes, Delete All Selected (${selectedVendorIds.length})`,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await vendorService.bulkDeleteVendors(selectedVendorIds, true);
          toast.success(
            `${selectedVendorIds.length} vendor(s) deleted successfully`,
          );
          setSelectedVendorIds([]);
          fetchData();
        } catch (err) {
          toast.error(err.message || "Failed to delete selected vendors");
        }
      }
    });
  };

  // Delete Single Vendor
  const handleDeleteVendor = (vendor, e) => {
    if (e) e.stopPropagation();
    Swal.fire({
      title: `Delete Vendor "${vendor.name}"?`,
      text: `Are you sure you want to delete ${vendor.name} (${vendor.shop_name || "Vendor"})? Any linked records will be archived to Recycle Bin.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Delete",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await vendorService.deleteVendor(vendor.id, true);
          toast.success(`Vendor "${vendor.name}" deleted`);
          setSelectedVendorIds((prev) => prev.filter((id) => id !== vendor.id));
          fetchData();
        } catch (err) {
          toast.error(err.message || "Failed to delete vendor");
        }
      }
    });
  };

  // Print slip for a mobile
  const handlePrintMobile = (mobile, e) => {
    if (e) e.stopPropagation();
    const vendor =
      vendors.find((v) => v.id === mobile.vendor_id) || mobile.vendor;
    const dummyTxn = {
      id: mobile.send_txn_id || mobile.id,
      txn_number: mobile.flow_type === "SENT_TO_VENDOR" ? "VND-OUT" : "VND-JOB",
      txn_type:
        mobile.flow_type === "SENT_TO_VENDOR"
          ? "SEND_TO_VENDOR"
          : "VENDOR_JOB_INWARD",
      txn_date: mobile.sent_date || mobile.received_date || mobile.created_at,
      total_cost: mobile.actual_cost || mobile.estimated_cost || 0,
      paid_amount:
        mobile.payment_status === "PAID"
          ? mobile.actual_cost || mobile.estimated_cost || 0
          : 0,
      payment_mode: "CASH",
      notes: mobile.repair_problem || "",
      vendor: vendor || { name: "Vendor Partner" },
      mobiles: [mobile],
    };
    setPrintableTxn(dummyTxn);
  };

  // Filtered Sent Mobiles
  const filteredSentMobiles = useMemo(() => {
    return sentMobiles.filter((m) => {
      if (selectedVendorFilter && m.vendor_id !== selectedVendorFilter)
        return false;
      if (
        paymentStatusFilter !== "ALL" &&
        (m.payment_status || "PENDING") !== paymentStatusFilter
      )
        return false;
      if (
        repairStatusFilter !== "ALL" &&
        m.current_status !== repairStatusFilter
      )
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const vendorName = m.vendor?.name?.toLowerCase() || "";
        const vendorShop = m.vendor?.shop_name?.toLowerCase() || "";
        const brand = (m.brand || "").toLowerCase();
        const model = (m.model || "").toLowerCase();
        const imei = (m.imei || "").toLowerCase();
        const problem = (m.repair_problem || "").toLowerCase();
        return (
          brand.includes(q) ||
          model.includes(q) ||
          imei.includes(q) ||
          problem.includes(q) ||
          vendorName.includes(q) ||
          vendorShop.includes(q)
        );
      }
      return true;
    });
  }, [
    sentMobiles,
    selectedVendorFilter,
    paymentStatusFilter,
    repairStatusFilter,
    searchQuery,
  ]);

  // Filtered Received Mobiles
  const filteredReceivedMobiles = useMemo(() => {
    return receivedMobiles.filter((m) => {
      if (selectedVendorFilter && m.vendor_id !== selectedVendorFilter)
        return false;
      if (
        paymentStatusFilter !== "ALL" &&
        (m.payment_status || "PENDING") !== paymentStatusFilter
      )
        return false;
      if (
        repairStatusFilter !== "ALL" &&
        m.current_status !== repairStatusFilter
      )
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const vendorName = m.vendor?.name?.toLowerCase() || "";
        const vendorShop = m.vendor?.shop_name?.toLowerCase() || "";
        const brand = (m.brand || "").toLowerCase();
        const model = (m.model || "").toLowerCase();
        const imei = (m.imei || "").toLowerCase();
        const problem = (m.repair_problem || "").toLowerCase();
        return (
          brand.includes(q) ||
          model.includes(q) ||
          imei.includes(q) ||
          problem.includes(q) ||
          vendorName.includes(q) ||
          vendorShop.includes(q)
        );
      }
      return true;
    });
  }, [
    receivedMobiles,
    selectedVendorFilter,
    paymentStatusFilter,
    repairStatusFilter,
    searchQuery,
  ]);

  // Filtered Vendors Directory
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (v.name || "").toLowerCase();
        const shop = (v.shop_name || "").toLowerCase();
        const phone = (v.mobile || "").toLowerCase();
        const email = (v.email || "").toLowerCase();
        const spec = (v.specialization || "").toLowerCase();
        const addr = (v.address || "").toLowerCase();
        return (
          name.includes(q) ||
          shop.includes(q) ||
          phone.includes(q) ||
          email.includes(q) ||
          spec.includes(q) ||
          addr.includes(q)
        );
      }
      return true;
    });
  }, [vendors, searchQuery]);

  // Status Badge Helper
  const renderPaymentBadge = (status) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Fully Paid
          </span>
        );
      case "ADVANCE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <IndianRupee className="w-3 h-3" /> Advance Paid
          </span>
        );
      case "FREE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-300 border border-slate-500/30">
            Free / Rework
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> Pending / Unpaid
          </span>
        );
    }
  };

  const renderRepairStatusBadge = (status) => {
    switch (status) {
      case "IN_REPAIR":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            In Repair
          </span>
        );
      case "REPAIR_COMPLETED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Repaired
          </span>
        );
      case "RETURNED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            Returned
          </span>
        );
      case "NOT_REPAIRABLE":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Not Fixed
          </span>
        );
      case "WAITING_PARTS":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            Waiting Parts
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
            Cancelled
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* =================================================================== */}
      {/* 1. TOP HEADER WITH 3 PROMINENT ACTION BUTTONS                       */}
      {/* =================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-[28px] font-bold text-[var(--spatial-text-title)] tracking-tight">
                Vendor Management
              </h1>
              <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5">
                Track mobiles sent to outside repair labs and mobiles received
                from partner shops
              </p>
            </div>
          </div>
        </div>

        {/* 3 Prominent Forms Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Form 1 Button: I Send to Other Vendor */}
          <Button
            variant="primary"
            size="sm"
            icon={ArrowUpRight}
            onClick={() => setIsSendModalOpen(true)}
            className="shadow-sm"
          >
            + Send Mobile to Vendor
          </Button>

          {/* Form 2 Button: Other Vendor Send to Me */}
          <Button
            variant="outline"
            size="sm"
            icon={ArrowDownLeft}
            onClick={() => setIsReceiveModalOpen(true)}
            className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 font-semibold"
          >
            + Receive Mobile from Vendor
          </Button>

          {/* Form 3 Button: Create New Vendor */}
          <Button
            variant="outline"
            size="sm"
            icon={Building2}
            onClick={() => {
              setEditingVendor(null);
              setIsVendorModalOpen(true);
            }}
            className="text-purple-400 border-purple-500/30 hover:bg-purple-500/10 font-semibold"
          >
            + Add New Vendor
          </Button>
        </div>
      </div>

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Card 1: Vendors & Activity */}
        <Card
          title="Vendors & Activity"
          subtitle="Total partners and active engagement"
          bodyClassName="p-0"
        >
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--spatial-text-muted)]">Total Vendors</span>
              <span className="text-lg font-bold text-[var(--spatial-text-title)]">{vendors.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--spatial-text-muted)]">Active Vendors</span>
              <span className="text-lg font-bold text-[var(--spatial-text-title)]">{activeVendors}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--spatial-text-muted)]">Mobiles Tracked</span>
              <span className="text-lg font-bold text-[var(--spatial-text-title)]">{sentMobiles.length + receivedMobiles.length}</span>
            </div>
          </div>
        </Card>

        {/* Card 2: Payments Summary */}
        <Card
          title="Payments Summary"
          subtitle="Collected, pending, and advance amounts"
          bodyClassName="p-0"
        >
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--spatial-text-muted)]">Collected</span>
              <span className="text-lg font-bold text-emerald-500">{formatIndianCurrency(collectedAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--spatial-text-muted)]">Pending</span>
              <span className="text-lg font-bold text-amber-500">{formatIndianCurrency(pendingAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--spatial-text-muted)]">Advance</span>
              <span className="text-lg font-bold text-sky-500">{formatIndianCurrency(advanceAmount)}</span>
            </div>
          </div>
        </Card>

        {/* Card 3: Sent/Received & Status */}
        <Card
          title="Mobiles Flow"
          subtitle="Sent to / received from vendors"
          bodyClassName="p-0"
        >
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--spatial-text-muted)]">Sent to Vendors</span>
              <span className="text-lg font-bold text-[var(--spatial-text-title)]">{sentMobiles.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--spatial-text-muted)]">Received from Vendors</span>
              <span className="text-lg font-bold text-[var(--spatial-text-title)]">{receivedMobiles.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--spatial-text-muted)]">Advance Payments</span>
              <span className="text-lg font-bold text-sky-500">{advanceCount}</span>
            </div>
          </div>
        </Card>
      </div>

      <VendorNavTabs activeTab="/vendors" />

      {/* =================================================================== */}
      {/* 2. THREE KEY METRIC SUMMARY CARDS                                   */}
      {/* =================================================================== */}

      {/* =================================================================== */}
      {/* 3. PRIMARY TABS BAR                                                 */}
      {/* =================================================================== */}

      {/* =================================================================== */}
      {/* 4. SEARCH & FILTER CONTROLS BAR                                     */}
      {/* =================================================================== */}
      <div className="spatial-card p-3 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === "vendors"
                ? "Search vendor name, shop, phone, email, specialization..."
                : "Search mobile model, brand, IMEI, reason, vendor..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs spatial-input rounded-xl"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Specific Filters for Mobile Tabs */}
        {activeTab !== "vendors" && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Vendor Filter */}
            <div className="w-40 sm:w-48">
              <SpatialSelect
                value={selectedVendorFilter}
                onChange={setSelectedVendorFilter}
                options={[
                  { value: "", label: "All Vendors" },
                  ...vendors.map((v) => ({
                    value: v.id,
                    label: `${v.name} ${v.shop_name ? `(${v.shop_name})` : ""}`,
                  })),
                ]}
              />
            </div>

            {/* Payment Status Dropdown Filter */}
            <div className="w-36 sm:w-44">
              <SpatialSelect
                value={paymentStatusFilter}
                onChange={setPaymentStatusFilter}
                options={PAYMENT_STATUS_OPTIONS}
              />
            </div>

            {/* Repair Status Filter */}
            <div className="w-36 sm:w-44">
              <SpatialSelect
                value={repairStatusFilter}
                onChange={setRepairStatusFilter}
                options={REPAIR_STATUS_OPTIONS}
              />
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 5. TAB CONTENTS                                                     */}
      {/* =================================================================== */}
      {loading ? (
        <TableSkeleton rows={6} columns={7} showHeader={false} />
      ) : (
        <>
          {/* ------------------------------------------------------------- */}
          {/* TAB 1: MOBILES SENT TO OTHER VENDORS                          */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "sent" && (
            <Card
              title={`Mobiles Dispatched to Vendors (${filteredSentMobiles.length})`}
              subtitle="Outsourced repairs sent to outside labs and specialists"
              bodyClassName="p-0"
              actions={
                <Button
                  size="sm"
                  icon={Plus}
                  onClick={() => setIsSendModalOpen(true)}
                >
                  Send Another Mobile
                </Button>
              }
            >
              {filteredSentMobiles.length === 0 ? (
                <EmptyState
                  icon={ArrowUpRight}
                  title="No sent mobiles found"
                  description={
                    searchQuery ||
                    paymentStatusFilter !== "ALL" ||
                    repairStatusFilter !== "ALL"
                      ? "No mobiles match your selected filters."
                      : "You have not sent any mobiles to outside vendors yet."
                  }
                  actionLabel="Send First Mobile"
                  onAction={() => setIsSendModalOpen(true)}
                />
              ) : (
                <div className="spatial-tab-pane">
                  <div className="overflow-x-auto table-scrollbar w-full pb-2">
                    <table className="w-full text-left text-xs min-w-[1050px]">
                      <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                        <tr>
                          <th className="px-5 py-3 whitespace-nowrap">
                            Device & Model
                          </th>
                          <th className="px-5 py-3 whitespace-nowrap">
                            IMEI / Serial
                          </th>
                          <th className="px-5 py-3 whitespace-nowrap">
                            Dispatched Vendor
                          </th>
                          <th className="px-5 py-3 whitespace-nowrap">
                            Why I Send This
                          </th>
                          <th className="px-5 py-3 text-center whitespace-nowrap">
                            Payment Status
                          </th>
                          <th className="px-5 py-3 text-center whitespace-nowrap">
                            Repair Status
                          </th>
                          <th className="px-5 py-3 text-center whitespace-nowrap">
                            Date
                          </th>
                          <th className="px-5 py-3 text-center whitespace-nowrap">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--spatial-border)]">
                        {filteredSentMobiles.map((mob) => {
                          const vendor =
                            vendors.find((v) => v.id === mob.vendor_id) ||
                            mob.vendor;
                          const isCopied = copiedImei === mob.imei;
                          return (
                            <tr
                              key={mob.id}
                              className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer"
                              onClick={() => setSelectedMobileDetail(mob)}
                            >
                              {/* Device & Model */}
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                                    <Smartphone className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-[var(--spatial-text-title)] text-xs sm:text-sm">
                                      {mob.brand} {mob.model}
                                    </div>
                                    <div className="text-[10px] text-[var(--spatial-text-muted)]">
                                      {mob.brand}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* IMEI Number */}
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div
                                  onClick={(e) => handleCopyImei(mob.imei, e)}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] font-mono text-xs font-semibold text-[var(--spatial-text-title)] hover:border-sky-500 hover:text-sky-400 transition-colors cursor-pointer"
                                  title="Click to copy IMEI"
                                >
                                  <span>{mob.imei || "N/A"}</span>
                                  {isCopied ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-[var(--spatial-text-muted)]" />
                                  )}
                                </div>
                              </td>

                              {/* Dispatched Vendor */}
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="font-semibold text-[var(--spatial-text-title)]">
                                  {vendor?.name || "Unknown Vendor"}
                                </div>
                                {vendor?.shop_name && (
                                  <div className="text-[10px] text-[var(--spatial-text-muted)]">
                                    {vendor.shop_name}
                                  </div>
                                )}
                              </td>

                              {/* Why I Send This */}
                              <td className="px-5 py-3.5 max-w-xs">
                                <p className="text-xs text-[var(--spatial-text-title)] font-medium line-clamp-2">
                                  {mob.repair_problem ||
                                    mob.why_send ||
                                    "Defect repair"}
                                </p>
                              </td>

                              {/* Payment Status Dropdown Menu */}
                              <td
                                className="px-5 py-3.5 text-center whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SpatialTableSelect
                                  value={mob.payment_status || "PENDING"}
                                  onChange={(val) =>
                                    handlePaymentStatusChange(mob.id, val)
                                  }
                                  options={TABLE_PAYMENT_STATUS_OPTIONS_SENT}
                                  colorScheme="sky"
                                />
                              </td>

                              {/* Repair Status Dropdown */}
                              <td
                                className="px-5 py-3.5 text-center whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SpatialTableSelect
                                  value={mob.current_status || "PENDING"}
                                  onChange={(val) =>
                                    handleRepairStatusChange(mob.id, val)
                                  }
                                  options={TABLE_REPAIR_STATUS_OPTIONS}
                                  colorScheme="sky"
                                />
                              </td>

                              {/* Date */}
                              <td className="px-5 py-3.5 text-center whitespace-nowrap font-mono text-[11px] text-[var(--spatial-text-muted)]">
                                {formatInvoiceDate(
                                  mob.sent_date || mob.created_at,
                                )}
                              </td>

                              {/* Actions */}
                              <td
                                className="px-5 py-3.5 text-center whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Print Chalan */}
                                  <button
                                    type="button"
                                    onClick={(e) => handlePrintMobile(mob, e)}
                                    className="p-1.5 rounded-lg text-[var(--spatial-text-muted)] hover:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                                    title="Print Dispatch Slip"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>

                                  {/* View Detail */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMobileDetail(mob)}
                                    className="p-1.5 rounded-lg text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card)] transition-colors cursor-pointer"
                                    title="View Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete */}
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteMobile(mob, e)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    title="Delete Handset"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: MOBILES OTHER VENDORS SENT TO ME                       */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "received" && (
            <Card
              title={`Mobiles Received from Partner Vendors (${filteredReceivedMobiles.length})`}
              subtitle="Handsets brought to your shop by other vendors and shops to repair"
              bodyClassName="p-0"
              actions={
                <Button
                  size="sm"
                  icon={Plus}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={() => setIsReceiveModalOpen(true)}
                >
                  Receive Another Mobile
                </Button>
              }
            >
              {filteredReceivedMobiles.length === 0 ? (
                <EmptyState
                  icon={ArrowDownLeft}
                  title="No received mobiles found"
                  description={
                    searchQuery ||
                    paymentStatusFilter !== "ALL" ||
                    repairStatusFilter !== "ALL"
                      ? "No mobiles match your selected filters."
                      : "No other vendors have sent mobiles to your shop yet."
                  }
                  actionLabel="Receive Mobile"
                  onAction={() => setIsReceiveModalOpen(true)}
                />
              ) : (
                <div className="spatial-tab-pane">
                  <div className="overflow-x-auto table-scrollbar w-full pb-2">
                    <table className="w-full text-left text-xs min-w-[1050px]">
                      <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                        <tr>
                          <th className="px-5 py-3 whitespace-nowrap">
                            Device & Model
                          </th>
                          <th className="px-5 py-3 whitespace-nowrap">
                            IMEI / Serial
                          </th>
                          <th className="px-5 py-3 whitespace-nowrap">
                            Sending Vendor
                          </th>
                          <th className="px-5 py-3 whitespace-nowrap">
                            Why Send Me This
                          </th>
                          <th className="px-5 py-3 text-center whitespace-nowrap">
                            Payment Status
                          </th>
                          <th className="px-5 py-3 text-center whitespace-nowrap">
                            Repair Status
                          </th>
                          <th className="px-5 py-3 text-center whitespace-nowrap">
                            Date
                          </th>
                          <th className="px-5 py-3 text-center whitespace-nowrap">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--spatial-border)]">
                        {filteredReceivedMobiles.map((mob) => {
                          const vendor =
                            vendors.find((v) => v.id === mob.vendor_id) ||
                            mob.vendor;
                          const isCopied = copiedImei === mob.imei;
                          return (
                            <tr
                              key={mob.id}
                              className="hover:bg-[var(--spatial-bg-card-subtle)] transition-colors cursor-pointer"
                              onClick={() => setSelectedMobileDetail(mob)}
                            >
                              {/* Device & Model */}
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                    <Smartphone className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-[var(--spatial-text-title)] text-xs sm:text-sm">
                                      {mob.brand} {mob.model}
                                    </div>
                                    <div className="text-[10px] text-[var(--spatial-text-muted)]">
                                      {mob.brand}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* IMEI Number */}
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div
                                  onClick={(e) => handleCopyImei(mob.imei, e)}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] font-mono text-xs font-semibold text-[var(--spatial-text-title)] hover:border-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer"
                                  title="Click to copy IMEI"
                                >
                                  <span>{mob.imei || "N/A"}</span>
                                  {isCopied ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-[var(--spatial-text-muted)]" />
                                  )}
                                </div>
                              </td>

                              {/* Sending Vendor */}
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="font-semibold text-[var(--spatial-text-title)]">
                                  {vendor?.name ||
                                    mob.customer_name ||
                                    "Vendor Partner"}
                                </div>
                                {vendor?.shop_name && (
                                  <div className="text-[10px] text-[var(--spatial-text-muted)]">
                                    {vendor.shop_name}
                                  </div>
                                )}
                              </td>

                              {/* Why Send Me This */}
                              <td className="px-5 py-3.5 max-w-xs">
                                <p className="text-xs text-[var(--spatial-text-title)] font-medium line-clamp-2">
                                  {mob.repair_problem ||
                                    mob.why_send ||
                                    "Defect repair"}
                                </p>
                              </td>

                              {/* Payment Status Dropdown Menu */}
                              <td
                                className="px-5 py-3.5 text-center whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SpatialTableSelect
                                  value={mob.payment_status || "PENDING"}
                                  onChange={(val) =>
                                    handlePaymentStatusChange(mob.id, val)
                                  }
                                  options={
                                    TABLE_PAYMENT_STATUS_OPTIONS_RECEIVED
                                  }
                                  colorScheme="emerald"
                                />
                              </td>

                              {/* Repair Status Dropdown */}
                              <td
                                className="px-5 py-3.5 text-center whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SpatialTableSelect
                                  value={mob.current_status || "PENDING"}
                                  onChange={(val) =>
                                    handleRepairStatusChange(mob.id, val)
                                  }
                                  options={TABLE_REPAIR_STATUS_OPTIONS}
                                  colorScheme="emerald"
                                />
                              </td>

                              {/* Date */}
                              <td className="px-5 py-3.5 text-center whitespace-nowrap font-mono text-[11px] text-[var(--spatial-text-muted)]">
                                {formatInvoiceDate(
                                  mob.received_date || mob.created_at,
                                )}
                              </td>

                              {/* Actions */}
                              <td
                                className="px-5 py-3.5 text-center whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Print Slip */}
                                  <button
                                    type="button"
                                    onClick={(e) => handlePrintMobile(mob, e)}
                                    className="p-1.5 rounded-lg text-[var(--spatial-text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                    title="Print Inward Slip"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>

                                  {/* View Detail */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMobileDetail(mob)}
                                    className="p-1.5 rounded-lg text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-bg-card)] transition-colors cursor-pointer"
                                    title="View Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete */}
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteMobile(mob, e)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    title="Delete Handset"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: VENDORS LIST & DIRECTORY                               */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "vendors" && (
            <div className="space-y-3">
              {/* Bulk Action Bar for Vendors */}
              <BulkActionBar
                selectedCount={selectedVendorIds.length}
                onClearSelection={() => setSelectedVendorIds([])}
                onBulkDelete={handleBulkDeleteVendors}
                deleteLabel={`Delete (${selectedVendorIds.length}) Vendors`}
              />

              <Card
                title={`Partner Vendors & Specialists (${filteredVendors.length})`}
                subtitle="Directory of external workshops, technicians, and specialized repair labs"
                bodyClassName="p-0"
                actions={
                  <div className="flex items-center gap-2">
                    {filteredVendors.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={toggleSelectAllVendors}
                        className="text-xs text-[var(--spatial-text-muted)] hover:text-purple-400"
                      >
                        {filteredVendors.length > 0 &&
                        filteredVendors.every((v) =>
                          selectedVendorIds.includes(v.id),
                        )
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      icon={Plus}
                      className="bg-purple-600 hover:bg-purple-500 text-white"
                      onClick={() => {
                        setEditingVendor(null);
                        setIsVendorModalOpen(true);
                      }}
                    >
                      Add New Vendor
                    </Button>
                  </div>
                }
              >
                {filteredVendors.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title="No vendors found"
                    description={
                      searchQuery
                        ? "No vendors match your search."
                        : "You have not registered any partner vendors yet."
                    }
                    actionLabel="Add Vendor"
                    onAction={() => {
                      setEditingVendor(null);
                      setIsVendorModalOpen(true);
                    }}
                  />
                ) : (
                  <div className="spatial-tab-pane">
                    <div className="overflow-x-auto table-scrollbar w-full pb-2">
                      <table className="w-full text-left text-xs min-w-[1000px]">
                        <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                          <tr>
                            <th className="w-10 px-4 py-3 text-center whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={
                                  filteredVendors.length > 0 &&
                                  filteredVendors.every((v) =>
                                    selectedVendorIds.includes(v.id),
                                  )
                                }
                                onChange={toggleSelectAllVendors}
                                aria-label="Select all vendors"
                                className="w-4 h-4 rounded text-apple-blue cursor-pointer accent-apple-blue"
                              />
                            </th>
                            <th className="px-5 py-3 whitespace-nowrap">
                              Vendor Name & Shop
                            </th>
                            <th className="px-5 py-3 whitespace-nowrap">
                              Specialize
                            </th>
                            <th className="px-5 py-3 whitespace-nowrap">
                              Contact Number
                            </th>
                            <th className="px-5 py-3 whitespace-nowrap">
                              Mail ID
                            </th>
                            <th className="px-5 py-3 whitespace-nowrap">
                              Workshop Address
                            </th>
                            <th className="px-5 py-3 text-center whitespace-nowrap">
                              Active Phones
                            </th>
                            <th className="px-5 py-3 text-right whitespace-nowrap">
                              Balance
                            </th>
                            <th className="px-5 py-3 text-center whitespace-nowrap">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--spatial-border)]">
                          {filteredVendors.map((v) => {
                            const isSelected = selectedVendorIds.includes(v.id);
                            const activeOut = sentMobiles.filter(
                              (m) =>
                                m.vendor_id === v.id &&
                                !["RETURNED", "CANCELLED"].includes(
                                  m.current_status,
                                ),
                            ).length;
                            const activeIn = receivedMobiles.filter(
                              (m) =>
                                m.vendor_id === v.id &&
                                !["RETURNED", "CANCELLED"].includes(
                                  m.current_status,
                                ),
                            ).length;

                            return (
                              <tr
                                key={v.id}
                                className={`hover:bg-[var(--spatial-bg-card-subtle)] transition-colors ${
                                  isSelected ? "bg-apple-blue/8" : ""
                                }`}
                              >
                                {/* Checkbox Column */}
                                <td
                                  className="w-10 px-4 py-3.5 text-center whitespace-nowrap"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectVendor(v.id)}
                                    aria-label={`Select vendor ${v.name}`}
                                    className="w-4 h-4 rounded text-apple-blue cursor-pointer accent-apple-blue"
                                  />
                                </td>

                                {/* Vendor Name & Shop */}
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 font-bold">
                                      {(v.name || "V")[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-bold text-[var(--spatial-text-title)] text-xs sm:text-sm">
                                        {v.name}
                                      </div>
                                      <div className="text-[10px] text-[var(--spatial-text-muted)]">
                                        {v.shop_name || "Independent Lab"} •{" "}
                                        {v.vendor_code}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Specialize */}
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  {v.specialization ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                      {v.specialization}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-[var(--spatial-text-muted)]">
                                      General Repair
                                    </span>
                                  )}
                                </td>

                                {/* Number */}
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--spatial-text-title)]">
                                    <Phone className="w-3 h-3 text-[var(--spatial-text-muted)]" />
                                    <a
                                      href={`tel:${v.mobile}`}
                                      className="hover:text-sky-400 transition-colors"
                                    >
                                      {v.mobile || "N/A"}
                                    </a>
                                  </div>
                                </td>

                                {/* Mail ID */}
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  {v.email ? (
                                    <div className="flex items-center gap-1.5 text-xs text-[var(--spatial-text-title)]">
                                      <Mail className="w-3 h-3 text-[var(--spatial-text-muted)]" />
                                      <a
                                        href={`mailto:${v.email}`}
                                        className="hover:text-sky-400 transition-colors"
                                      >
                                        {v.email}
                                      </a>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-[var(--spatial-text-muted)]">
                                      -
                                    </span>
                                  )}
                                </td>

                                {/* Address */}
                                <td className="px-5 py-3.5 max-w-xs">
                                  <p
                                    className="text-xs text-[var(--spatial-text-muted)] truncate"
                                    title={v.address}
                                  >
                                    {v.address || "-"}
                                  </p>
                                </td>

                                {/* Active Phones */}
                                <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold">
                                    <span
                                      className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                      title="Phones currently at their lab"
                                    >
                                      ↑ {activeOut}
                                    </span>
                                    <span
                                      className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      title="Phones currently at our shop from this vendor"
                                    >
                                      ↓ {activeIn}
                                    </span>
                                  </div>
                                </td>

                                {/* Balance */}
                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                  <div
                                    className={`font-mono text-xs font-bold ${
                                      (v.current_balance || 0) > 0
                                        ? "text-rose-400"
                                        : (v.current_balance || 0) < 0
                                          ? "text-emerald-400"
                                          : "text-[var(--spatial-text-muted)]"
                                    }`}
                                  >
                                    {formatIndianCurrency(
                                      Math.abs(v.current_balance || 0),
                                    )}
                                    <span className="text-[10px] ml-1 font-sans">
                                      {(v.current_balance || 0) > 0
                                        ? "Payable"
                                        : (v.current_balance || 0) < 0
                                          ? "Advance"
                                          : ""}
                                    </span>
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {/* Edit */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingVendor(v);
                                        setIsVendorModalOpen(true);
                                      }}
                                      className="p-1.5 rounded-lg text-[var(--spatial-text-muted)] hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                                      title="Edit Vendor Details"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Delete */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteVendor(v, e)}
                                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                      title="Delete Vendor"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}

      {/* =================================================================== */}
      {/* 6. MODALS                                                           */}
      {/* =================================================================== */}

      {/* Form 1 Modal: Send Mobile to Vendor */}
      <SendMobileModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        vendors={vendors}
        onSuccess={() => {
          fetchData();
          setActiveTab("sent");
        }}
        onOpenVendorCreate={() => {
          setIsSendModalOpen(false);
          setEditingVendor(null);
          setIsVendorModalOpen(true);
        }}
      />

      {/* Form 2 Modal: Other Vendor Send to Me */}
      <ReceiveMobileModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        vendors={vendors}
        onSuccess={() => {
          fetchData();
          setActiveTab("received");
        }}
        onOpenVendorCreate={() => {
          setIsReceiveModalOpen(false);
          setEditingVendor(null);
          setIsVendorModalOpen(true);
        }}
      />

      {/* Form 3 Modal: Create / Edit Vendor */}
      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => {
          setIsVendorModalOpen(false);
          setEditingVendor(null);
        }}
        editingVendor={editingVendor}
        existingVendors={vendors}
        onSuccess={() => {
          fetchData();
        }}
      />

      {/* Printable Receipt Modal */}
      {printableTxn && (
        <VendorReceiptPrintable
          transaction={printableTxn}
          shop={shopProfile}
          onClose={() => setPrintableTxn(null)}
        />
      )}

      {/* Single Mobile Details Modal */}
      {selectedMobileDetail && (
        <Modal
          isOpen={Boolean(selectedMobileDetail)}
          onClose={() => setSelectedMobileDetail(null)}
          title={`${selectedMobileDetail.brand} ${selectedMobileDetail.model}`}
          subtitle={`IMEI: ${selectedMobileDetail.imei || "N/A"} • ${
            selectedMobileDetail.flow_type === "SENT_TO_VENDOR"
              ? "Dispatched to Outside Lab"
              : "Received from Partner Vendor"
          }`}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--spatial-text-muted)] font-medium">
                  {selectedMobileDetail.flow_type === "SENT_TO_VENDOR"
                    ? "Dispatched Vendor:"
                    : "Partner Shop:"}
                </span>
                <span className="text-xs font-bold text-[var(--spatial-text-title)]">
                  {selectedMobileDetail.vendor?.name ||
                    selectedMobileDetail.customer_name ||
                    "Vendor Partner"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--spatial-text-muted)] font-medium">
                  Payment Status:
                </span>
                <div>
                  {renderPaymentBadge(selectedMobileDetail.payment_status)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--spatial-text-muted)] font-medium">
                  Repair Status:
                </span>
                <div>
                  {renderRepairStatusBadge(selectedMobileDetail.current_status)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--spatial-text-muted)] font-medium">
                  Estimated / Actual Cost:
                </span>
                <span className="text-xs font-mono font-bold text-[var(--spatial-text-title)]">
                  {formatIndianCurrency(
                    selectedMobileDetail.actual_cost ||
                      selectedMobileDetail.estimated_cost ||
                      0,
                  )}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] space-y-1">
              <span className="text-xs font-bold text-[var(--spatial-text-title)] block">
                {selectedMobileDetail.flow_type === "SENT_TO_VENDOR"
                  ? "Why I Sent This:"
                  : "Why Sent to Me:"}
              </span>
              <p className="text-xs text-[var(--spatial-text-muted)]">
                {selectedMobileDetail.repair_problem ||
                  selectedMobileDetail.why_send ||
                  "No reason specified"}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                icon={Printer}
                onClick={() => {
                  const m = selectedMobileDetail;
                  setSelectedMobileDetail(null);
                  handlePrintMobile(m);
                }}
              >
                Print Slip
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedMobileDetail(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default VendorDashboard;
