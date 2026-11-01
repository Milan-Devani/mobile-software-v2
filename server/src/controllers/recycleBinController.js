import { db } from '../db/db.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Controller for managing the Recycle Bin
 * Supports Repair Jobs, Sales Invoices, Vendor Management, Customer Directory, and Parts & Stock
 * Automatic 30-day retention and purge policy
 */

// 1. Get all items in recycle bin (with search and category filter)
export const getRecycleBinItems = async (req, res, next) => {
  try {
    const { type = 'ALL', search = '' } = req.query;
    const result = await db.recycle_bin.list({ type, search });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// 2. Restore single item back to its original table
export const restoreRecycleBinItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restored = await db.recycle_bin.restore(id);
    res.json({
      success: true,
      message: `"${restored.title}" restored successfully to its original section.`,
      data: restored,
    });
  } catch (err) {
    next(err);
  }
};

// 3. Bulk restore items back to their original tables
export const bulkRestoreRecycleBinItems = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('Select at least one item to restore.', 400, 'IDS_REQUIRED');
    }
    const count = await db.recycle_bin.bulkRestore(ids);
    res.json({
      success: true,
      message: `${count} item(s) restored successfully.`,
      count,
    });
  } catch (err) {
    next(err);
  }
};

// 4. Permanently delete a single item immediately
export const deletePermanentlyRecycleBinItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await db.recycle_bin.delete(id);
    if (!deleted) {
      throw new AppError('Item not found or already permanently deleted.', 404, 'NOT_FOUND');
    }
    res.json({
      success: true,
      message: 'Item permanently deleted from recycle bin.',
    });
  } catch (err) {
    next(err);
  }
};

// 5. Bulk permanently delete items
export const bulkDeletePermanentlyRecycleBinItems = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('Select at least one item to permanently delete.', 400, 'IDS_REQUIRED');
    }
    const count = await db.recycle_bin.bulkDelete(ids);
    res.json({
      success: true,
      message: `${count} item(s) permanently deleted.`,
      count,
    });
  } catch (err) {
    next(err);
  }
};

// 6. Empty recycle bin (all items or by category)
export const emptyRecycleBin = async (req, res, next) => {
  try {
    const { type = 'ALL' } = req.body;
    const count = await db.recycle_bin.empty(type);
    res.json({
      success: true,
      message: `Recycle bin emptied (${count} items permanently deleted).`,
      count,
    });
  } catch (err) {
    next(err);
  }
};

