import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Plus,
  Trash2,
  Calendar,
  Building2,
  Smartphone,
  Save,
  CheckCircle2,
  ArrowLeft,
  Search,
  X,
  Phone,
  MessageCircle,
  Eye,
  FileText,
  Clock,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { VendorNavTabs } from "../../components/vendors/VendorNavTabs";
import {
  Card,
  LoadingSpinner,
  EmptyState,
  TableSkeleton,
} from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { SpatialSelect } from "../../components/common/SpatialSelect";
import { SpatialDrawer } from "../../components/common/SpatialDrawer";
import { SpatialPagination } from "../../components/common/SpatialPagination";
import { SpatialDateFilter } from "../../components/common/SpatialDateFilter";
import { VendorReceiptPrintable } from "../../components/vendors/VendorReceiptPrintable";
import { VendorModal } from "../../components/vendors/VendorModal";
import { vendorService } from "../../services/vendorService";
import { settingsService } from "../../services/settingsService";
import {
  formatIndianCurrency,
  formatInvoiceDate,
} from "../../utils/billFormatters";
import { useDebounce } from "../../hooks/useDebounce";
import {
  MAX_CURRENCY_AMOUNT,
  limitNumberValue,
  numberInputProps,
} from "../../utils/numberInput";

const STATUS_BADGES = {
  PENDING: {
    label: "Pending",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  IN_REPAIR: {
    label: "In Repair",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  WAITING_PARTS: {
    label: "Waiting Parts",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
  REPAIR_COMPLETED: {
    label: "Completed",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  RETURNED: {
    label: "Returned",
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
  },
  NOT_REPAIRABLE: {
    label: "Not Fixed",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
  },
};

export const VendorSendMobiles = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedVendorId = searchParams.get("vendorId") || "";

  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Drawer & Modal State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);

  // Master Transaction state for Drawer Form
  const [txnNumber, setTxnNumber] = useState("");
  const [txnDate, setTxnDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [vendorId, setVendorId] = useState(preselectedVendorId);
  const [notes, setNotes] = useState("");

  // Advance Payment
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [paymentRef, setPaymentRef] = useState("");

  // Vendors list for selector & filters
  const [vendors, setVendors] = useState([]);
  const [shopProfile, setShopProfile] = useState(null);

  // Dynamic Handsets for Drawer Form
  const [mobiles, setMobiles] = useState([
    {
      id: "mob-1",
      brand: "",
      model: "",
      imei: "",
      customer_name: "",
      repair_problem: "",
      condition: "Normal Wear",
      accessories: "Device Only",
      expected_return_date: "",
      estimated_cost: "",
      status: "PENDING",
      notes: "",
    },
  ]);

  // Saved result modal for print / WhatsApp
  const [savedResult, setSavedResult] = useState(null);

  // -------------------------------------------------------------
  // TABLE STATE: Dispatched Mobiles List
  // -------------------------------------------------------------
  const [dispatchedMobiles, setDispatchedMobiles] = useState([]);
  const [totalDispatched, setTotalDispatched] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedMobileIds, setSelectedMobileIds] = useState([]);

  // Table Filters
  const [search, setSearch] = useState("");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [datePreset, setDatePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const debouncedSearch = useDebounce(search, 400);

  // Fetch dispatched mobiles table data
  const fetchDispatchedMobiles = useCallback(async () => {
    try {
      setTableLoading(true);
      const params = {
        flowType: "SENT_TO_VENDOR",
        limit: pageSize,
        offset: (page - 1) * pageSize,
        sortBy: "created_at",
        sortDir: "desc",
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedVendorFilter && selectedVendorFilter !== "ALL")
        params.vendorId = selectedVendorFilter;
      if (selectedStatusFilter && selectedStatusFilter !== "ALL")
        params.status = selectedStatusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await vendorService.getVendorMobiles(params);
      const list = res?.data?.mobiles || res?.mobiles || [];
      const totalCount =
        res?.data?.total !== undefined
          ? res.data.total
          : res?.total !== undefined
            ? res.total
            : list.length;

      setDispatchedMobiles(list);
      setTotalDispatched(totalCount);
    } catch (err) {
      console.error("Failed to load dispatched mobiles:", err);
      toast.error("Failed to load dispatched handsets");
    } finally {
      setTableLoading(false);
    }
  }, [
    debouncedSearch,
    selectedVendorFilter,
    selectedStatusFilter,
    startDate,
    endDate,
    page,
    pageSize,
  ]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingInit(true);
        const [nextNoRes, vendorsRes, settingsRes] = await Promise.allSettled([
          vendorService.getNextTxnNumber("SEND_TO_VENDOR"),
          vendorService.getVendors({ limit: 150, status: "ACTIVE" }),
          settingsService.getSettings(),
        ]);

        if (nextNoRes.status === "fulfilled") {
          const num =
            nextNoRes.value?.data?.txnNumber || nextNoRes.value?.txnNumber;
          if (num) setTxnNumber(num);
        }
        if (vendorsRes.status === "fulfilled") {
          const list =
            vendorsRes.value?.data?.vendors || vendorsRes.value?.vendors || [];
          if (list.length > 0) {
            setVendors(list);
            if (!vendorId) {
              setVendorId(list[0].id);
            }
          }
        }
        if (settingsRes.status === "fulfilled") {
          const shop = settingsRes.value?.data?.shop || settingsRes.value?.shop;
          if (shop) setShopProfile(shop);
        }
      } catch (err) {
        console.error("Failed to init send mobiles:", err);
      } finally {
        setLoadingInit(false);
      }
    };

    init();
  }, []);

  // Fetch table data when filters or pagination change
  useEffect(() => {
    setSelectedMobileIds([]);
    fetchDispatchedMobiles();
  }, [fetchDispatchedMobiles]);

  const activeVendor = vendors.find((v) => v.id === vendorId);

  // Handset Row Management in Drawer Form
  const handleAddMobileRow = () => {
    setMobiles((prev) => [
      ...prev,
      {
        id: `mob-${Date.now()}`,
        brand: "",
        model: "",
        imei: "",
        customer_name: "",
        repair_problem: "",
        condition: "Normal Wear",
        accessories: "Device Only",
        expected_return_date: "",
        estimated_cost: "",
        status: "PENDING",
        notes: "",
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
      toast.error("At least one mobile must be included in the dispatch.");
      return;
    }
    setMobiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      toast.error("Please select a destination vendor / lab partner.");
      return;
    }

    const validMobiles = mobiles.filter(
      (m) =>
        m.brand.trim() ||
        m.model.trim() ||
        m.repair_problem.trim() ||
        m.imei.trim(),
    );

    if (validMobiles.length === 0) {
      toast.error("Please enter details for at least one mobile.");
      return;
    }

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
      const payload = {
        vendor_id: vendorId,
        txn_date: txnDate,
        notes,
        mobiles: validMobiles.map((m) => ({
          brand: m.brand.trim(),
          model: m.model.trim(),
          imei: m.imei.trim(),
          customer_name: m.customer_name.trim(),
          repair_problem: m.repair_problem.trim(),
          condition: m.condition.trim() || "Normal Wear",
          accessories: "Device Only",
          expected_return_date: null,
          estimated_cost: 0,
          status: "PENDING",
        })),
        paid_amount: parseFloat(paidAmount) || 0,
        payment_mode: paidAmount > 0 ? paymentMode : "NONE",
        payment_ref: paymentRef,
      };

      const res = await vendorService.sendMobilesToVendor(payload);
      if (res.success) {
        toast.success(
          `Chalan #${res.data.txn_number} created with ${res.data.mobiles.length} mobile(s)!`,
        );
        setSavedResult(res.data);
        setIsDrawerOpen(false);

        // Reset drawer form
        setMobiles([
          {
            id: `mob-${Date.now()}`,
            brand: "",
            model: "",
            imei: "",
            customer_name: "",
            repair_problem: "",
            condition: "Normal Wear",
            accessories: "Device Only",
            expected_return_date: "",
            estimated_cost: "",
            status: "PENDING",
            notes: "",
          },
        ]);
        setPaidAmount("");
        setPaymentRef("");
        setNotes("");

        // Refresh next chalan number & table
        vendorService.getNextTxnNumber("SEND_TO_VENDOR").then((nextRes) => {
          const num = nextRes?.data?.txnNumber || nextRes?.txnNumber;
          if (num) setTxnNumber(num);
        });
        setPage(1);
        fetchDispatchedMobiles();
      }
    } catch (err) {
      toast.error(err.message || "Failed to dispatch mobiles");
    } finally {
      setSubmitting(false);
    }
  };

  // Table Row Selection
  const toggleSelectMobile = (id) => {
    setSelectedMobileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedMobileIds.length === dispatchedMobiles.length) {
      setSelectedMobileIds([]);
    } else {
      setSelectedMobileIds(dispatchedMobiles.map((m) => m.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMobileIds.length !== dispatchedMobiles.length) return;
    const count = selectedMobileIds.length;
    if (
      !window.confirm(
        `Delete all ${count} selected outward dispatch record(s)? This cannot be undone.`,
      )
    )
      return;

    try {
      setTableLoading(true);
      const result = await vendorService.deleteVendorMobiles(selectedMobileIds);
      toast.success(result?.message || `${count} dispatch record(s) deleted.`);
      setSelectedMobileIds([]);
      if (dispatchedMobiles.length === count && page > 1)
        setPage((current) => current - 1);
      await fetchDispatchedMobiles();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete dispatched mobiles",
      );
    } finally {
      setTableLoading(false);
    }
  };

  const handleViewChalan = async (mob, e) => {
    e?.stopPropagation();
    if (!mob.send_txn_id) {
      toast.error("No chalan record linked to this mobile.");
      return;
    }
    try {
      const res = await vendorService.getTransactionById(mob.send_txn_id);
      const txn = res?.data?.transaction || res?.data || res?.transaction;
      if (txn) {
        setSavedResult(txn);
      } else {
        toast.error("Chalan details not found");
      }
    } catch (err) {
      toast.error("Failed to load chalan details");
    }
  };

  if (loadingInit) {
    return <TableSkeleton rows={7} columns={7} showPagination={false} />;
  }

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/vendors")}
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
              Send Mobiles to Vendor (Outward Dispatches)
            </h1>
            <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5 font-normal">
              Track dispatched handsets sent to external repair labs or partner
              service centers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={ArrowUpRight}
            onClick={() => setIsDrawerOpen(true)}
          >
            Send to Vendor
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <VendorNavTabs activeTab="/vendors/send" />

      {/* Filter & Search Bar */}
      <div className="spatial-card p-4 rounded-2xl space-y-3 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Brand, Model, IMEI, Customer, Lab..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-11 pl-10 pr-9 py-2 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] placeholder:text-[var(--spatial-text-muted)] focus:outline-none focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-all shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Vendor Filter */}
          <div>
            <SpatialSelect
              value={selectedVendorFilter}
              onChange={(val) => {
                setSelectedVendorFilter(val);
                setPage(1);
              }}
              options={[
                { value: "ALL", label: "All Destination Labs / Vendors" },
                ...vendors.map((v) => ({
                  value: v.id,
                  label: `${v.name} (${v.shop_name || "Vendor"})`,
                  badge: v.vendor_code,
                })),
              ]}
              searchable
            />
          </div>

          {/* Status Filter */}
          <div>
            <SpatialSelect
              value={selectedStatusFilter}
              onChange={(val) => {
                setSelectedStatusFilter(val);
                setPage(1);
              }}
              options={[
                { value: "ALL", label: "All Repair Statuses" },
                { value: "PENDING", label: "Pending Diagnosis" },
                { value: "IN_REPAIR", label: "In Repair" },
                { value: "WAITING_PARTS", label: "Waiting for Parts" },
                { value: "REPAIR_COMPLETED", label: "Repair Completed" },
                { value: "RETURNED", label: "Returned to Shop" },
                { value: "NOT_REPAIRABLE", label: "Not Repairable" },
              ]}
              searchable={false}
            />
          </div>

          {/* Date Filter */}
          <div>
            <SpatialDateFilter
              preset={datePreset}
              startDate={startDate}
              endDate={endDate}
              onChange={({ preset, startDate: start, endDate: end }) => {
                setDatePreset(preset);
                setStartDate(start);
                setEndDate(end);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Dispatched Mobiles Table Card */}
      <Card
        title={`Dispatched Mobiles to Lab (${totalDispatched})`}
        subtitle={`Showing page ${page} of ${Math.max(1, Math.ceil(totalDispatched / pageSize))}`}
        action={
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={ArrowUpRight}
            onClick={() => setIsDrawerOpen(true)}
          >
            Send Mobiles to Vendor
          </Button>
        }
        bodyClassName="p-0"
      >
        {tableLoading ? (
          <TableSkeleton
            rows={7}
            columns={7}
            showHeader={false}
            showPagination={false}
          />
        ) : dispatchedMobiles.length === 0 ? (
          <EmptyState
            icon={Smartphone}
            title="No dispatched mobiles found"
            description="You have not dispatched any handsets to external labs matching these filters."
            actionLabel="Send Mobiles to Vendor"
            onAction={() => setIsDrawerOpen(true)}
          />
        ) : (
          <div className="spatial-tab-pane">
            {/* Row Selection Notification Banner */}
            {selectedMobileIds.length > 0 && (
              <div className="mx-4 mt-3 mb-1 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs flex items-center justify-between text-[#0071e3] dark:text-[#0a84ff] animate-in fade-in">
                <span className="font-semibold">
                  {selectedMobileIds.length} of {dispatchedMobiles.length}{" "}
                  handset(s) selected
                </span>
                <div className="flex items-center gap-3">
                  {selectedMobileIds.length === dispatchedMobiles.length && (
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="inline-flex items-center gap-1 font-bold text-rose-500 hover:text-rose-400 cursor-pointer text-xs"
                      title="Delete all selected outward dispatch records"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete All ({selectedMobileIds.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedMobileIds([])}
                    className="font-bold hover:underline cursor-pointer text-xs"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1050px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    {/* Checkbox Header */}
                    <th className="w-12 px-4 py-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={
                          dispatchedMobiles.length > 0 &&
                          selectedMobileIds.length === dispatchedMobiles.length
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded text-sky-500 accent-sky-500 cursor-pointer"
                        title="Select All Mobiles"
                      />
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      Handset & Model
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      Destination Lab / Vendor
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      Reported Problem & Condition
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      Send Date & Chalan #
                    </th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">
                      Est. Cost
                    </th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {dispatchedMobiles.map((mob) => {
                    const isSelected = selectedMobileIds.includes(mob.id);
                    const statusMeta =
                      STATUS_BADGES[mob.current_status] ||
                      STATUS_BADGES.PENDING;

                    return (
                      <tr
                        key={mob.id}
                        className={`transition-colors cursor-pointer group ${
                          isSelected
                            ? "bg-blue-500/[0.08] dark:bg-blue-500/[0.12]"
                            : "hover:bg-[var(--spatial-bg-card-subtle)]"
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="w-12 px-4 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectMobile(mob.id)}
                            className="w-4 h-4 rounded text-sky-500 accent-sky-500 cursor-pointer"
                          />
                        </td>

                        {/* Handset Details */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-[var(--spatial-text-title)] text-xs group-hover:text-sky-400 transition-colors">
                            {mob.brand} {mob.model}
                          </div>
                          {mob.imei && (
                            <div className="font-mono text-[10px] text-sky-400 font-semibold mt-0.5">
                              IMEI: {mob.imei}
                            </div>
                          )}
                          {mob.customer_name && (
                            <div className="text-[11px] text-[var(--spatial-text-muted)] mt-0.5">
                              Customer:{" "}
                              <span className="font-medium text-[var(--spatial-text-body)]">
                                {mob.customer_name}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Destination Vendor */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-[var(--spatial-text-title)] text-xs">
                            {mob.vendor?.name || "Assigned Vendor"}
                          </div>
                          {mob.vendor?.shop_name && (
                            <div className="text-[11px] text-[var(--spatial-text-muted)] mt-0.5">
                              {mob.vendor.shop_name}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {mob.vendor?.mobile && (
                              <a
                                href={`tel:${mob.vendor.mobile}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] text-apple-blue hover:underline flex items-center gap-1 font-mono"
                              >
                                <Phone className="w-3 h-3" />
                                {mob.vendor.mobile}
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Problem & Condition */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <div className="text-xs font-semibold text-amber-500">
                            {mob.repair_problem}
                          </div>
                          {mob.condition && (
                            <div
                              className="text-[11px] text-[var(--spatial-text-muted)] mt-0.5 truncate"
                              title={mob.condition}
                            >
                              Condition: {mob.condition}
                            </div>
                          )}
                        </td>

                        {/* Send Date & Chalan # */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-xs text-[var(--spatial-text-title)]">
                            {formatInvoiceDate(mob.sent_date || mob.created_at)}
                          </div>
                          {mob.send_txn?.txn_number && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-[#0071e3] dark:text-[#0a84ff] border border-blue-500/20 font-semibold inline-block mt-1">
                              #{mob.send_txn.txn_number}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* Estimated Cost */}
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-xs text-[var(--spatial-text-title)] whitespace-nowrap">
                          {formatIndianCurrency(mob.estimated_cost || 0, true)}
                        </td>

                        {/* Actions */}
                        <td
                          className="px-4 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {mob.send_txn_id ? (
                            <button
                              type="button"
                              onClick={(e) => handleViewChalan(mob, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 border border-transparent hover:border-sky-500/20 transition-all cursor-pointer"
                              title="View Dispatch Chalan"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Spatial Pagination */}
            <div className="p-4 border-t border-[var(--spatial-border)]">
              <SpatialPagination
                currentPage={page}
                totalItems={totalDispatched}
                pageSize={pageSize}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* =================================================================== */}
      {/* RIGHT SIDEBAR (DRAWER): DISPATCH DETAILS, MOBILE HANDSET ENTRY      */}
      {/* =================================================================== */}
      <SpatialDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Dispatch Mobiles to Vendor"
        subtitle={`Chalan #${txnNumber} • Itemize handsets and select destination lab partner`}
        maxWidth="w-full md:w-[70vw] md:max-w-[70vw]"
        // headerAction={
        //   <Button
        //     type="button"
        //     variant="outline"
        //     size="sm"
        //     icon={Plus}
        //     onClick={() => setIsAddVendorOpen(true)}
        //     className="text-xs"
        //   >
        //     New Vendor
        //   </Button>
        // }
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDrawerOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="primary"
              icon={Save}
              loading={submitting}
              onClick={handleSubmit}
            >
              Save & Generate Dispatch Chalan ({mobiles.length} Mobiles)
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: DISPATCH DETAILS & DESTINATION VENDOR */}
          <Card
            title="1. Dispatch Details & Destination Vendor"
            subtitle="Select recipient lab partner and transaction date"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase">
                    Destination Vendor / Lab Partner{" "}
                    <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddVendorOpen(true)}
                    className="text-xs font-semibold text-[#0071e3] dark:text-[#0a84ff] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Vendor
                  </button>
                </div>
                <SpatialSelect
                  value={vendorId}
                  onChange={(val) => setVendorId(val)}
                  options={vendors.map((v) => ({
                    value: v.id,
                    label: `${v.name} (${v.shop_name || "Vendor"})`,
                    subtitle: `Phone: ${v.mobile} • At Lab: ${v.mobiles_currently_at_vendor || 0} phones`,
                    badge: v.vendor_code,
                  }))}
                  placeholder="-- Select Vendor --"
                  searchable
                />
              </div>

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
                    <span className="font-bold text-[var(--spatial-text-title)]">
                      {activeVendor.name}
                    </span>
                    <p className="text-[11px] text-[var(--spatial-text-muted)]">
                      {activeVendor.shop_name} • Phone: {activeVendor.mobile} •{" "}
                      {activeVendor.address}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[var(--spatial-text-muted)] uppercase block">
                    Current Outstanding
                  </span>
                  <span className="font-mono font-bold text-sm text-[var(--spatial-text-title)]">
                    {formatIndianCurrency(
                      Math.abs(activeVendor.current_balance || 0),
                      true,
                    )}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-1">
                    {(activeVendor.current_balance || 0) > 0
                      ? "(Payable)"
                      : "(Receivable)"}
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* SECTION 2: MULTIPLE MOBILE HANDSET ENTRY (6 CLEAN FIELDS) */}
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

                  {/* Row 1: Brand, Model, IMEI / Serial Number, Customer Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
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
                        onChange={(e) =>
                          handleUpdateMobile(idx, "brand", e.target.value)
                        }
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
                        onChange={(e) =>
                          handleUpdateMobile(idx, "model", e.target.value)
                        }
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
                        onChange={(e) =>
                          handleUpdateMobile(idx, "imei", e.target.value)
                        }
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
                        onChange={(e) =>
                          handleUpdateMobile(
                            idx,
                            "customer_name",
                            e.target.value,
                          )
                        }
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* Row 2: Fault / Repair Problem, Physical Condition */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Fault / Repair Problem */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                        Fault / Repair Problem *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dead phone, No Audio IC, CPU dry solder, Face ID failure"
                        value={mob.repair_problem}
                        onChange={(e) =>
                          handleUpdateMobile(
                            idx,
                            "repair_problem",
                            e.target.value,
                          )
                        }
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm font-medium text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    {/* Physical Condition */}
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--spatial-text-muted)] uppercase mb-1">
                        Physical Condition
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Normal Wear, Scratches, Back glass broken"
                        value={mob.condition}
                        onChange={(e) =>
                          handleUpdateMobile(idx, "condition", e.target.value)
                        }
                        className="w-full h-11 px-3 bg-[var(--spatial-input-bg)] border border-[var(--spatial-border)] rounded-xl text-xs sm:text-sm text-[var(--spatial-text-title)] focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Handsets Footer */}
            <div className="mt-4 pt-3 border-t border-[var(--spatial-border)] flex flex-wrap items-center justify-between gap-3">
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
                <span className="text-[var(--spatial-text-muted)]">
                  Total Handsets in Batch:
                </span>
                <span className="ml-2 font-mono font-bold text-sm text-sky-400">
                  {mobiles.length}
                </span>
              </div>
            </div>
          </Card>

          {/* SECTION 3: ADVANCE PAYMENT & INSTRUCTIONS */}
          <Card
            title="3. Advance Payment & Special Instructions"
            subtitle="Optional advance payment recorded in vendor ledger"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                  Advance Paid Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={MAX_CURRENCY_AMOUNT}
                    step="any"
                    {...numberInputProps()}
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={(e) =>
                      setPaidAmount(limitNumberValue(e.target.value))
                    }
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
                    { value: "UPI", label: "UPI / QR" },
                    { value: "CASH", label: "Cash in Hand" },
                    { value: "BANK_TRANSFER", label: "Bank Transfer" },
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
                  placeholder="e.g. UPI Ref / Receipt #"
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
        </form>
      </SpatialDrawer>

      {/* Result Printable / WhatsApp Modal */}
      {savedResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative max-w-4xl w-full my-8">
            <VendorReceiptPrintable
              transaction={savedResult}
              shop={shopProfile}
              onClose={() => {
                setSavedResult(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Register New Vendor Modal */}
      <VendorModal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        existingVendors={vendors}
        onSuccess={(newVendor) => {
          setVendors((prev) => [
            newVendor,
            ...prev.filter((v) => v.id !== newVendor.id),
          ]);
          setVendorId(newVendor.id);
          setIsAddVendorOpen(false);
          toast.success(`Vendor "${newVendor.name}" registered and selected!`);
        }}
        onSelectExisting={(existing) => {
          if (!vendors.some((v) => v.id === existing.id)) {
            setVendors((prev) => [existing, ...prev]);
          }
          setVendorId(existing.id);
          setIsAddVendorOpen(false);
          toast.success(`Selected existing vendor: ${existing.name}`);
        }}
      />
    </div>
  );
};
