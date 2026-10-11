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
  TrendingDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { partsService } from '../../services/partsService';
import { Card, LoadingSpinner, EmptyState } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

const partSchema = z.object({
  name: z.string().min(2, 'Part name is required'),
  brand: z.string().optional(),
  category: z.string().default('Display'),
  purchase_cost: z.number().min(0).default(0),
  selling_price: z.number().min(0, 'Selling price must be positive'),
  stock_quantity: z.number().int().min(0).default(0),
  minimum_stock: z.number().int().min(0).default(2),
  compatible_models: z.string().optional(),
  supplier: z.string().optional(),
});

export const PartsList = () => {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedPartForAdjust, setSelectedPartForAdjust] = useState(null);
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(partSchema),
    defaultValues: {
      name: '',
      brand: 'Apple',
      category: 'Display',
      purchase_cost: 0,
      selling_price: 0,
      stock_quantity: 5,
      minimum_stock: 2,
      compatible_models: '',
      supplier: '',
    },
  });

  const fetchParts = async () => {
    try {
      setLoading(true);
      const res = await partsService.getParts({
        search,
        category: categoryFilter,
        lowStockOnly: lowStockOnly ? 'true' : undefined,
      });
      setParts(res || []);
    } catch (err) {
      toast.error('Failed to load parts inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchParts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, lowStockOnly]);

  const onAddSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      await partsService.createPart(data);
      toast.success('Part added to inventory!');
      setIsAddModalOpen(false);
      reset();
      fetchParts();
    } catch (err) {
      toast.error(err.message || 'Failed to add part');
    } finally {
      setIsSubmitting(false);
    }
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

  const categories = ['Display', 'Battery', 'Charging Port', 'Camera', 'Speaker', 'Housing', 'Motherboard', 'Accessories'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Parts & Inventory</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage replacement stock, wholesale costs, retail pricing, and threshold alerts
          </p>
        </div>
        <Button icon={Plus} onClick={() => setIsAddModalOpen(true)}>
          Add New Part
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search part name, code, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
            />
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Low Stock Only
            </span>
          </label>
        </div>
      </div>

      {/* Parts Table */}
      <Card title={`Inventory Catalog (${parts.length})`} bodyClassName="p-0">
        {loading ? (
          <LoadingSpinner label="Fetching inventory parts..." />
        ) : parts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No parts found"
            description="Add common replacement components to speed up repair estimates and track stock."
            actionLabel="Add First Part"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Part Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Compatible Models</th>
                  <th className="px-5 py-3 text-right">Cost</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-center">Stock</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parts.map((p) => {
                  const isLow = p.stock_quantity <= p.minimum_stock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-600">{p.part_code}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {p.name}
                        {p.part_number && <span className="block text-[11px] font-mono text-slate-400 font-normal">{p.part_number}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{p.category}</td>
                      <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">{p.compatible_models || '—'}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-500">${Number(p.purchase_cost).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">${Number(p.selling_price).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          p.stock_quantity === 0
                            ? 'bg-rose-100 text-rose-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge status={p.stock_quantity > 0 ? (isLow ? 'LOW_STOCK' : 'ACTIVE') : 'OUT_OF_STOCK'} size="sm" />
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-[11px] transition-colors"
                            title="Restock or adjust quantity"
                          >
                            Adjust
                          </button>
                          <button
                            onClick={() => handleDeletePart(p)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
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
        )}
      </Card>

      {/* Add Part Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Replacement Part"
        subtitle="Register part in inventory catalog"
      >
        <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Part Name *
            </label>
            <input
              type="text"
              placeholder="e.g. OLED Display Assembly (OEM)"
              {...register('name')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
            {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Category</label>
              <select
                {...register('category')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Brand</label>
              <input
                type="text"
                placeholder="e.g. Apple / Samsung"
                {...register('brand')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Purchase Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('purchase_cost', { valueAsNumber: true })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Selling Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                {...register('selling_price', { valueAsNumber: true })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none"
              />
              {errors.selling_price && <p className="text-[11px] text-rose-500 mt-1">{errors.selling_price.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Initial Stock Qty
              </label>
              <input
                type="number"
                {...register('stock_quantity', { valueAsNumber: true })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Minimum Stock Alert
              </label>
              <input
                type="number"
                {...register('minimum_stock', { valueAsNumber: true })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Compatible Models</label>
            <input
              type="text"
              placeholder="e.g. iPhone 14 Pro, iPhone 14 Pro Max"
              {...register('compatible_models')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Quantity Change (+ to add, - to deduct) *
            </label>
            <input
              type="number"
              required
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-base font-bold font-mono focus:outline-none text-center"
            />
            <p className="text-[11px] text-slate-500 mt-1 text-center">
              New stock will be: <strong className="text-slate-900 font-mono">{(selectedPartForAdjust?.stock_quantity || 0) + adjustQuantity}</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Reason / Notes</label>
            <input
              type="text"
              placeholder="e.g. Supplier delivery invoice #481 or damaged component write-off"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsAdjustModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={isSubmitting}>Update Stock</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
