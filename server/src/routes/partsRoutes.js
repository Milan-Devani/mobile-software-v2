import express from 'express';
import {
  getParts,
  getPartById,
  createPart,
  updatePart,
  adjustStock,
  deletePart
} from '../controllers/partsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin, requireTechnicianOrAdmin, requireAnyRole } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', requireAnyRole, getParts);
router.get('/:id', requireAnyRole, getPartById);
router.post('/', requireTechnicianOrAdmin, createPart);
router.put('/:id', requireTechnicianOrAdmin, updatePart);
router.post('/:id/adjust-stock', requireTechnicianOrAdmin, adjustStock);
router.delete('/:id', requireAdmin, deletePart);

export default router;
