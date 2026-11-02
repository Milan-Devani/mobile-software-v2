import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowUpDown,
  Edit2,
  Trash2,
  Layers,
  TrendingDown,
  X,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useDebounce } from '../../hooks/useDebounce';
import { partsService } from '../../services/partsService';
import { Card, LoadingSpinner, EmptyState, TableSkeleton } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SpatialPagination } from '../../components/common/SpatialPagination';
import { SpatialSelect } from '../../components/common/SpatialSelect';
import { SpatialDateFilter } from '../../components/common/SpatialDateFilter';
import { BulkActionBar } from '../../components/common/BulkActionBar';
import { MAX_CURRENCY_AMOUNT, MAX_QUANTITY, numberInputProps } from '../../utils/numberInput';

const partSchema = z.object({
  name: z.string().min(2, 'Part name is required'),
  brand: z.string().optional(),
  category: z.string().default('Display'),
  purchase_cost: z.number().min(0).max(MAX_CURRENCY_AMOUNT).default(0),
  selling_price: z.number().min(0, 'Selling price must be positive').max(MAX_CURRENCY_AMOUNT),
  stock_quantity: z.number().int().min(0).max(MAX_QUANTITY).default(0),
  minimum_stock: z.number().int().min(0).max(MAX_QUANTITY).default(2),
  compatible_models: z.string().optional(),
  supplier: z.string().optional(),
});

export const PartsList = () => {
  const [parts, setParts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedPartForAdjust, setSelectedPartForAdjust] = useState(null);
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Tab: 'parts' | 'categories'
  const [activeTab, setActiveTab] = useState('parts');

  // Category Management State
  const [categories, setCategories] = useState([
    'Screen / Display',
    'Display',
    'Battery',
    'Charging Port',
    'Camera',
    'Speaker',
    'Housing',
    'Motherboard',
    'Accessories',
    'Back Glass',
    'Touch Glass',
    'Flex Cable',
    'Tools & Consumables'
  ]);
  const [categoryDetails, setCategoryDetails] = useState([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategoryNames, setSelectedCategoryNames] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isCreatingCategoryInline, setIsCreatingCategoryInline] = useState(false);
  const [inlineCategoryInput, setInlineCategoryInput] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(partSchema),
    defaultValues: {
      name: '',
      brand: 'Apple',
      category: 'Screen / Display',
      purchase_cost: 0,
      selling_price: 0,
      stock_quantity: 5,
      minimum_stock: 2,
      compatible_models: '',
      supplier: '',
    },
  });

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await partsService.getCategories();
      const catList = Array.isArray(res) ? res : (res.categories || []);
      const detList = res.details || catList.map((c) => ({
        name: c,
        count: 0,
        is_custom: !(c === 'Screen / Display' || c === 'Display' || c === 'Battery' || c === 'Charging Port' || c === 'Camera' || c === 'Speaker' || c === 'Housing' || c === 'Motherboard' || c === 'Accessories'),
      }));
      setCategories(catList);
      setCategoryDetails(detList);
    } catch {
      // Keep defaults
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchParts = async (pageNum = page, sizeNum = pageSize) => {
    try {
      setLoading(true);
      const params = {
        search: debouncedSearch,
        category: categoryFilter,
        lowStockOnly: lowStockOnly ? 'true' : undefined,
        limit: sizeNum,
        offset: (pageNum - 1) * sizeNum,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await partsService.getParts(params);
      const items = res.parts || res || [];
      setParts(items);
      setTotal(res.total ?? (Array.isArray(res) ? res.length : items.length));
    } catch {
      toast.error('Failed to load parts inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts(page, pageSize);
  }, [debouncedSearch, categoryFilter, lowStockOnly, page, pageSize, startDate, endDate]);

  const handleDateFilterChange = ({ preset, startDate: s, endDate: e }) => {
    setDatePreset(preset || 'ALL');
    setStartDate(s || '');
    setEndDate(e || '');
    setPage(1);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    const pageIds = parts.map((p) => p.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...pageIds]));
      setSelectedIds(merged);
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Swal.fire({
      title: `Delete ${selectedIds.length} Part(s)?`,
      text: 'Are you sure you want to remove the selected parts from the catalog?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Yes, Delete (${selectedIds.length}) Parts`,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await partsService.bulkDeleteParts(selectedIds);
          toast.success(res.message || `Deleted ${selectedIds.length} parts`);
          setSelectedIds([]);
          fetchParts(page, pageSize);
        } catch (err) {
          toast.error(err.message || 'Failed to delete parts');
        }
      }
    });
  };

  const onAddSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      let targetCategory = data.category;
      if (isCreatingCategoryInline && inlineCategoryInput.trim()) {
        const clean = inlineCategoryInput.trim();
        await partsService.createCategory(clean);
        targetCategory = clean;
        setCategories((prev) => Array.from(new Set([...prev, clean])).sort());
      }
      await partsService.createPart({ ...data, category: targetCategory });
      toast.success('Part added to inventory!');
      setIsAddModalOpen(false);
      setIsCreatingCategoryInline(false);
      setInlineCategoryInput('');
      reset();
      fetchParts();
    } catch (err) {
      toast.error(err.message || 'Failed to add part');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async (e) => {
    if (e) e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) {
      toast.error('Please enter a category name');
      return;
    }
    try {
      setIsSavingCategory(true);
      const res = await partsService.createCategory(clean);
      toast.success(res.message || `Category "${clean}" created!`);
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to create category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const filteredCategories = categoryDetails.filter((c) =>
    (c.name || '').toLowerCase().includes(categorySearch.toLowerCase().trim())
  );

  const toggleSelectAllCategories = () => {
    const pageNames = filteredCategories.map((c) => c.name);
    const allSelected = pageNames.length > 0 && pageNames.every((name) => selectedCategoryNames.includes(name));
    if (allSelected) {
      setSelectedCategoryNames(selectedCategoryNames.filter((name) => !pageNames.includes(name)));
    } else {
      setSelectedCategoryNames(Array.from(new Set([...selectedCategoryNames, ...pageNames])));
    }
  };

  const toggleSelectCategory = (name) => {
    setSelectedCategoryNames((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const handleDeleteCategory = (catName) => {
    Swal.fire({
      title: `Delete Category "${catName}"?`,
      text: 'Are you sure you want to remove this category? Parts linked to this category in catalog will not be deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await partsService.deleteCategory(catName);
          toast.success(res.message || `Category "${catName}" removed`);
          setSelectedCategoryNames((prev) => prev.filter((name) => name !== catName));
          fetchCategories();
          fetchParts();
        } catch (err) {
          toast.error(err.message || 'Failed to remove category');
        }
      }
    });
  };

  const handleBulkDeleteCategories = () => {
    if (selectedCategoryNames.length === 0) return;
    Swal.fire({
      title: `Delete ${selectedCategoryNames.length} Category(ies)?`,
      text: `Are you sure you want to remove the ${selectedCategoryNames.length} selected categories? Linked parts in catalog will remain intact.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Yes, Delete (${selectedCategoryNames.length}) Categories`,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await partsService.bulkDeleteCategories(selectedCategoryNames);
          toast.success(res.message || `Deleted ${selectedCategoryNames.length} categories`);
          setSelectedCategoryNames([]);
          fetchCategories();
          fetchParts();
        } catch (err) {
          toast.error(err.message || 'Failed to delete categories');
        }
      }
    });
  };

  const handleOpenAdjust = (part) => {
    setSelectedPartForAdjust(part);
    setAdjustQuantity(0);
    setAdjustNotes('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPartForAdjust || adjustQuantity === 0) {
      toast.error('Please enter a non-zero quantity change');
      return;
    }
    try {
      setIsSubmitting(true);
      await partsService.adjustStock(selectedPartForAdjust.id, {
        quantity_change: adjustQuantity,
        movement_type: adjustQuantity > 0 ? 'PURCHASE' : 'ADJUSTMENT',
        notes: adjustNotes,
      });
      toast.success('Inventory stock updated!');
      setIsAdjustModalOpen(false);
      fetchParts();
    } catch (err) {
      toast.error(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePart = (part) => {
    Swal.fire({
      title: `Delete "${part.name}"?`,
      text: 'This will remove the part from active catalog.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Delete',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await partsService.deletePart(part.id);
          toast.success('Part deleted from catalog');
          fetchParts();
        } catch (err) {
          toast.error(err.message);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--spatial-text-title)] tracking-tight">Parts & Inventory</h2>
          <p className="text-xs text-[var(--spatial-text-muted)] mt-1">
            Manage replacement stock, wholesale costs, retail pricing, and threshold alerts
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            icon={Layers}
            onClick={() => setIsCategoryModalOpen(true)}
            className="border-[var(--spatial-border)] hover:bg-[var(--spatial-bg-card-subtle)]"
          >
            Create Category
          </Button>
          <Button
            icon={Plus}
            onClick={() => {
              setIsCreatingCategoryInline(false);
              setInlineCategoryInput('');
              setIsAddModalOpen(true);
            }}
          >
            Add New Part
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => {
            setActiveTab('parts');
            setSelectedCategoryNames([]);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-98 ${
            activeTab === 'parts'
              ? 'bg-apple-blue text-white shadow-xs'
              : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-border)]/30'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Parts Catalog ({total})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('categories');
            setSelectedIds([]);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-98 ${
            activeTab === 'categories'
              ? 'bg-apple-blue text-white shadow-xs'
              : 'text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] hover:bg-[var(--spatial-border)]/30'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Categories ({categories.length})</span>
        </button>
      </div>

      {/* TAB 1: PARTS CATALOG */}
      {activeTab === 'parts' && (
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="spatial-card relative z-20 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search part name, code, model..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-8 py-1.5 text-xs spatial-input rounded-xl"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Spatial Date Filter */}
          <SpatialDateFilter
            preset={datePreset}
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateFilterChange}
            align="right"
          />

          <div className="w-40 sm:w-44">
            <SpatialSelect
              value={categoryFilter}
              onChange={(val) => {
                setCategoryFilter(val);
                setPage(1);
                setSelectedIds([]);
              }}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--spatial-text-body)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded accent-amber-500 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Low Stock Only
            </span>
          </label>
        </div>
      </div>

      {/* Bulk Action Bar (when rows are selected) */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        deleteLabel={`Delete (${selectedIds.length})`}
      />

      {/* Parts Table */}
      <Card
        title={`Inventory Catalog (${total})`}
        subtitle={`Showing page ${page} of ${Math.max(1, Math.ceil(total / pageSize))}`}
        bodyClassName="p-0"
      >
        {loading ? (
          <TableSkeleton rows={7} columns={7} showHeader={false} showPagination={false} />
        ) : parts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No parts found"
            description="Add common replacement components to speed up repair estimates and track stock."
            actionLabel="Add First Part"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="spatial-tab-pane">
            <div className="overflow-x-auto table-scrollbar w-full pb-2">
              <table className="w-full text-left text-xs min-w-[1100px]">
                <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={parts.length > 0 && parts.every((p) => selectedIds.includes(p.id))}
                        onChange={toggleSelectAll}
                        aria-label="Select all on this page"
                        className="w-4 h-4 rounded text-apple-blue cursor-pointer accent-apple-blue"
                      />
                    </th>
                    <th className="px-5 py-3 whitespace-nowrap">Code</th>
                    <th className="px-5 py-3 whitespace-nowrap">Part Name</th>
                    <th className="px-5 py-3 whitespace-nowrap">Category</th>
                    <th className="px-5 py-3 whitespace-nowrap">Compatible Models</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Cost</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Price</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Stock</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Status</th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--spatial-border)]">
                  {parts.map((p) => {
                    const isLow = p.stock_quantity <= p.minimum_stock;
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-[var(--spatial-bg-card-subtle)] transition-colors ${
                          isSelected ? 'bg-apple-blue/8' : ''
                        }`}
                      >
                        <td
                          className="w-10 px-4 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(p.id)}
                            aria-label={`Select part ${p.name}`}
                            className="w-4 h-4 rounded text-apple-blue cursor-pointer accent-apple-blue"
                          />
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded-md bg-apple-blue/10 text-apple-blue border border-apple-blue/20">
                            {p.part_code}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-semibold text-[var(--spatial-text-title)]">{p.name}</span>
                            {p.part_number && (
                              <span className="text-[11px] font-mono text-[var(--spatial-text-muted)] font-normal">({p.part_number})</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-body)] whitespace-nowrap">{p.category}</td>
                        <td className="px-5 py-3.5 text-[var(--spatial-text-muted)] whitespace-nowrap max-w-xs truncate" title={p.compatible_models}>{p.compatible_models || '—'}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-[var(--spatial-text-muted)] whitespace-nowrap">₹{Number(p.purchase_cost).toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-[var(--spatial-text-title)] whitespace-nowrap">₹{Number(p.selling_price).toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-center font-mono font-bold whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            p.stock_quantity === 0
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : isLow
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {p.stock_quantity}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <Badge status={p.stock_quantity > 0 ? (isLow ? 'LOW_STOCK' : 'ACTIVE') : 'OUT_OF_STOCK'} size="sm" />
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenAdjust(p)}
                              className="px-2.5 py-1 bg-[var(--spatial-bg-card-subtle)] hover:bg-[var(--spatial-bg-card-hover)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] font-medium rounded-lg text-[11px] transition-all active:scale-95 cursor-pointer"
                              title="Restock or adjust quantity"
                            >
                              Adjust
                            </button>
                            <button
                              onClick={() => handleDeletePart(p)}
                              className="p-1.5 text-[var(--spatial-text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all active:scale-90 cursor-pointer"
                              title="Delete part"
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

            {/* Pagination Controls */}
            <SpatialPagination
              currentPage={page}
              pageSize={pageSize}
              totalItems={total}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              pageSizeOptions={[10, 15, 20]}
            />
          </div>
        )}
      </Card>
      </div>
      )}

      {/* TAB 2: CATEGORIES (TABLE FORMAT) */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Categories Search & Action Bar */}
          <div className="spatial-card relative z-20 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-[var(--spatial-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search category name..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs spatial-input rounded-xl"
              />
              {categorySearch && (
                <button
                  type="button"
                  onClick={() => setCategorySearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] rounded-md transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Button
              icon={Plus}
              onClick={() => setIsCategoryModalOpen(true)}
              size="sm"
            >
              Add Category
            </Button>
          </div>

          {/* Bulk Action Bar for Categories */}
          <BulkActionBar
            selectedCount={selectedCategoryNames.length}
            onClearSelection={() => setSelectedCategoryNames([])}
            onBulkDelete={handleBulkDeleteCategories}
            deleteLabel={`Delete (${selectedCategoryNames.length})`}
          />

          {/* Categories Table Card */}
          <Card
            title={`Categories Catalog (${filteredCategories.length})`}
            subtitle="Manage replacement component categories, linked inventory parts, and classification"
            bodyClassName="p-0"
          >
            {loadingCategories ? (
              <TableSkeleton rows={6} columns={5} showHeader={false} showPagination={false} />
            ) : filteredCategories.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No categories found"
                description={categorySearch ? `No categories match "${categorySearch}"` : 'Create your first custom category to organize inventory parts.'}
                actionLabel="Create Category"
                onAction={() => setIsCategoryModalOpen(true)}
              />
            ) : (
              <div className="spatial-tab-pane">
                <div className="overflow-x-auto table-scrollbar w-full pb-2">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-[var(--spatial-bg-card-subtle)] border-b border-[var(--spatial-border)] text-[var(--spatial-text-muted)] uppercase font-semibold text-[11px] whitespace-nowrap">
                      <tr>
                        <th className="w-10 px-4 py-3 text-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={filteredCategories.length > 0 && filteredCategories.every((c) => selectedCategoryNames.includes(c.name))}
                            onChange={toggleSelectAllCategories}
                            aria-label="Select all categories on this page"
                            className="w-4 h-4 rounded text-apple-blue cursor-pointer accent-apple-blue"
                          />
                        </th>
                        <th className="px-5 py-3 whitespace-nowrap">Category Name</th>
                        <th className="px-5 py-3 text-center whitespace-nowrap">Linked Parts in Catalog</th>
                        <th className="px-5 py-3 text-center whitespace-nowrap">Classification</th>
                        <th className="px-5 py-3 text-center whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--spatial-border)]">
                      {filteredCategories.map((cat) => {
                        const isSelected = selectedCategoryNames.includes(cat.name);
                        return (
                          <tr
                            key={cat.name}
                            className={`hover:bg-[var(--spatial-bg-card-subtle)] transition-colors ${
                              isSelected ? 'bg-apple-blue/8' : ''
                            }`}
                          >
                            <td className="w-10 px-4 py-3.5 text-center whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectCategory(cat.name)}
                                aria-label={`Select category ${cat.name}`}
                                className="w-4 h-4 rounded text-apple-blue cursor-pointer accent-apple-blue"
                              />
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2.5 font-semibold text-[var(--spatial-text-title)]">
                                <div className="w-7 h-7 rounded-lg bg-apple-blue/10 border border-apple-blue/20 flex items-center justify-center text-apple-blue shrink-0">
                                  <Tag className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-sm font-semibold">{cat.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setCategoryFilter(cat.name);
                                  setActiveTab('parts');
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)] hover:border-apple-blue hover:text-apple-blue transition-colors cursor-pointer"
                                title={`View all ${cat.name} parts in catalog`}
                              >
                                <Package className="w-3.5 h-3.5 text-[var(--spatial-text-muted)]" />
                                <span>{cat.count} part{cat.count === 1 ? '' : 's'}</span>
                              </button>
                            </td>
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  cat.is_custom
                                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {cat.is_custom ? 'Custom Category' : 'Standard Default'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat.name)}
                                className="p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                title={`Delete "${cat.name}" category`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

      {/* Add Part Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Replacement Part"
        subtitle="Register part in inventory catalog"
      >
        <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Part Name *
            </label>
            <input
              type="text"
              placeholder="e.g. OLED Display Assembly (OEM)"
              {...register('name')}
              className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
            />
            {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase">Category</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingCategoryInline(!isCreatingCategoryInline);
                    if (!isCreatingCategoryInline) {
                      setInlineCategoryInput('');
                    }
                  }}
                  className="text-[11px] font-semibold text-apple-blue hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isCreatingCategoryInline ? 'Select Existing' : 'Create Category'}</span>
                </button>
              </div>

              {isCreatingCategoryInline ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Back Glass, Touch IC..."
                      value={inlineCategoryInput}
                      onChange={(e) => {
                        setInlineCategoryInput(e.target.value);
                        setValue('category', e.target.value, { shouldValidate: true });
                      }}
                      className="w-full px-3 py-1.5 spatial-input rounded-xl text-xs"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        const clean = inlineCategoryInput.trim();
                        if (!clean) {
                          toast.error('Enter category name');
                          return;
                        }
                        try {
                          await partsService.createCategory(clean);
                          setCategories((prev) => Array.from(new Set([...prev, clean])).sort());
                          setValue('category', clean, { shouldValidate: true });
                          toast.success(`Category "${clean}" added!`);
                          setIsCreatingCategoryInline(false);
                        } catch (err) {
                          toast.error(err.message || 'Failed to add category');
                        }
                      }}
                      disabled={!inlineCategoryInput.trim()}
                    >
                      Save
                    </Button>
                  </div>
                  <p className="text-[10px] text-[var(--spatial-text-muted)]">Type custom category name to assign to this part</p>
                </div>
              ) : (
                <SpatialSelect
                  value={watch('category') || 'Screen / Display'}
                  onChange={(val) => {
                    if (val === '__CREATE_NEW__') {
                      setIsCreatingCategoryInline(true);
                      setInlineCategoryInput('');
                    } else {
                      setValue('category', val, { shouldValidate: true });
                    }
                  }}
                  options={[
                    ...categories.map((c) => ({ value: c, label: c })),
                    { value: '__CREATE_NEW__', label: '+ Create Category...' },
                  ]}
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">Brand</label>
              <input
                type="text"
                placeholder="e.g. Apple / Samsung"
                {...register('brand')}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Purchase Cost (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={MAX_CURRENCY_AMOUNT}
                {...numberInputProps()}
                {...register('purchase_cost', { valueAsNumber: true })}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={MAX_CURRENCY_AMOUNT}
                {...numberInputProps()}
                {...register('selling_price', { valueAsNumber: true })}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono font-bold tabular-nums"
              />
              {errors.selling_price && <p className="text-[11px] text-rose-500 mt-1">{errors.selling_price.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Initial Stock Qty
              </label>
              <input
                type="number"
                min="0"
                max={MAX_QUANTITY}
                {...numberInputProps({ allowDecimal: false })}
                {...register('stock_quantity', { valueAsNumber: true })}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
                Minimum Stock Alert
              </label>
              <input
                type="number"
                min="0"
                max={MAX_QUANTITY}
                {...numberInputProps({ allowDecimal: false })}
                {...register('minimum_stock', { valueAsNumber: true })}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs font-mono tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">Compatible Models</label>
            <input
              type="text"
              placeholder="e.g. iPhone 14 Pro, iPhone 14 Pro Max"
              {...register('compatible_models')}
              className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--spatial-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={isSubmitting}>Save Part</Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Adjust Inventory Stock"
        subtitle={selectedPartForAdjust ? `${selectedPartForAdjust.name} (Current Stock: ${selectedPartForAdjust.stock_quantity})` : ''}
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">
              Quantity Change (+ to add, - to deduct) *
            </label>
            <input
              type="number"
              required
              min={-MAX_QUANTITY}
              max={MAX_QUANTITY}
              {...numberInputProps({ allowDecimal: false, allowNegative: true })}
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2.5 spatial-input rounded-xl text-base font-bold font-mono text-center tabular-nums"
            />
            <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1.5 text-center">
              New stock will be: <strong className="text-[var(--spatial-text-title)] font-mono tabular-nums font-bold">{(selectedPartForAdjust?.stock_quantity || 0) + adjustQuantity}</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1">Reason / Notes</label>
            <input
              type="text"
              placeholder="e.g. Supplier delivery invoice #481 or damaged component write-off"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--spatial-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsAdjustModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={isSubmitting}>Update Stock</Button>
          </div>
        </form>
      </Modal>

      {/* Create Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setNewCategoryName('');
        }}
        title="Create Category"
        subtitle="Add a new category to organize inventory and replacement parts"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--spatial-text-title)] uppercase mb-1.5">
              Category Name *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Screen / Display, Camera Lens, Back Glass..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full px-3 py-2 spatial-input rounded-xl text-xs"
                autoFocus
                required
              />
              <Button
                type="submit"
                icon={Plus}
                loading={isSavingCategory}
                disabled={!newCategoryName.trim()}
              >
                Create
              </Button>
            </div>
            <p className="text-[11px] text-[var(--spatial-text-muted)] mt-1.5">
              Newly created categories will be available in parts creation, edit, and filter menus.
            </p>
          </div>

          <div className="pt-3 border-t border-[var(--spatial-border)]">
            <label className="block text-xs font-bold text-[var(--spatial-text-muted)] uppercase mb-2">
              Available Categories ({categories.length})
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2.5 bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] rounded-xl">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--spatial-card-bg)] border border-[var(--spatial-border)] text-[var(--spatial-text-title)]"
                >
                  <Tag className="w-3 h-3 text-apple-blue" />
                  <span>{cat}</span>
                </span>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
