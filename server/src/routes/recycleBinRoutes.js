import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAnyRole, requireAdmin } from '../middleware/roleGuard.js';
import {
  getRecycleBinItems,
  restoreRecycleBinItem,
  bulkRestoreRecycleBinItems,
  deletePermanentlyRecycleBinItem,
  bulkDeletePermanentlyRecycleBinItems,
  emptyRecycleBin,
} from '../controllers/recycleBinController.js';

const router = Router();

router.use(authenticateToken);

// List deleted items (with search & category filter)
router.get('/', requireAnyRole, getRecycleBinItems);

// Bulk operations (must be declared BEFORE :id param routes)
router.post('/bulk-restore', requireAnyRole, bulkRestoreRecycleBinItems);
router.post('/bulk-delete', requireAdmin, bulkDeletePermanentlyRecycleBinItems);
router.post('/empty', requireAdmin, emptyRecycleBin);

// Single item operations
router.post('/:id/restore', requireAnyRole, restoreRecycleBinItem);
router.delete('/:id', requireAdmin, deletePermanentlyRecycleBinItem);

export default router;

