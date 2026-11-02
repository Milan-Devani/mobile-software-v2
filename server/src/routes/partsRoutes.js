import express from 'express';
import {
  getParts,
  getPartById,
  createPart,
  updatePart,
  adjustStock,
  deletePart,
  bulkDeleteParts,
  getCategories,
  createCategory,
  deleteCategory,
  bulkDeleteCategories
} from '../controllers/partsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin, requireTechnicianOrAdmin, requireAnyRole } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', requireAnyRole, getParts);
router.get('/categories', requireAnyRole, getCategories);
router.post('/categories', requireTechnicianOrAdmin, createCategory);
router.post('/categories/bulk-delete', requireTechnicianOrAdmin, bulkDeleteCategories);
router.delete('/categories/:name', requireTechnicianOrAdmin, deleteCategory);
router.post('/bulk-delete', requireTechnicianOrAdmin, bulkDeleteParts);
router.get('/:id', requireAnyRole, getPartById);
router.post('/', requireTechnicianOrAdmin, createPart);
router.put('/:id', requireTechnicianOrAdmin, updatePart);
router.post('/:id/adjust-stock', requireTechnicianOrAdmin, adjustStock);
router.delete('/:id', requireTechnicianOrAdmin, deletePart);

export default router;
