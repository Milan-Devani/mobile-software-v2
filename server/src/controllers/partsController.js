import { db } from '../db/db.js';
import { AppError } from '../middleware/errorHandler.js';

export const getParts = async (req, res, next) => {
  try {
    const { category, search, lowStockOnly, limit = 50, offset = 0 } = req.query;
    const result = await db.parts.list({
      category,
      search,
      lowStockOnly: lowStockOnly === 'true',
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      success: true,
      data: {
        parts: result.parts,
        total: result.total,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getPartById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const part = await db.parts.findById(id);
    if (!part) throw new AppError('Part not found.', 404, 'PART_NOT_FOUND');

    res.json({
      success: true,
      data: { part },
    });
  } catch (err) {
    next(err);
  }
};

export const createPart = async (req, res, next) => {
  try {
    const { name, brand, category, purchase_cost, selling_price, stock_quantity, minimum_stock, compatible_models, supplier } = req.body;

    if (!name || selling_price === undefined) {
      throw new AppError('Part name and selling price are required.', 400, 'VALIDATION_ERROR');
    }

    const newPart = await db.parts.create({
      name,
      brand: brand || '',
      category: category || 'Display',
      purchase_cost: purchase_cost || 0,
      selling_price: selling_price || 0,
      stock_quantity: stock_quantity || 0,
      minimum_stock: minimum_stock || 2,
      compatible_models: compatible_models || '',
      supplier: supplier || '',
    });

    res.status(201).json({
      success: true,
      message: 'Part added to inventory successfully.',
      data: { part: newPart },
    });
  } catch (err) {
    next(err);
  }
};

export const updatePart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.parts.findById(id);
    if (!existing) throw new AppError('Part not found.', 404, 'PART_NOT_FOUND');

    const updated = await db.parts.update(id, req.body);
    res.json({
      success: true,
      message: 'Part updated successfully.',
      data: { part: updated },
    });
  } catch (err) {
    next(err);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity_change, movement_type = 'ADJUSTMENT', reference_number = '', notes = '' } = req.body;

    const parsedQty = parseInt(quantity_change, 10);
    if (isNaN(parsedQty) || parsedQty === 0) {
      throw new AppError('Quantity change must be a non-zero integer.', 400, 'INVALID_QUANTITY');
    }

    const updatedPart = await db.parts.adjustStock({
      partId: id,
      quantityChange: parsedQty,
      movementType: movement_type,
      referenceNumber: reference_number,
      notes,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: `Stock adjusted. Current stock for "${updatedPart.name}": ${updatedPart.stock_quantity}.`,
      data: { part: updatedPart },
    });
  } catch (err) {
    next(err);
  }
};

export const deletePart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.parts.findById(id);
    if (!existing) throw new AppError('Part not found.', 404, 'PART_NOT_FOUND');

    await db.parts.delete(id);
    res.json({
      success: true,
      message: 'Part deleted successfully from catalog.',
    });
  } catch (err) {
    next(err);
  }
};

export const bulkDeleteParts = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('No part IDs provided for bulk deletion.', 400, 'IDS_REQUIRED');
    }
    const count = await db.parts.bulkDelete(ids);
    res.json({
      success: true,
      message: `Successfully deleted ${count} part(s).`,
      data: { count },
    });
  } catch (err) {
    next(err);
  }
};
