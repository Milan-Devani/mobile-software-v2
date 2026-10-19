import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '../controllers/customerController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin, requireAnyRole } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', requireAnyRole, getCustomers);
router.get('/:id', requireAnyRole, getCustomerById);
router.post('/', requireAnyRole, createCustomer);
router.put('/:id', requireAnyRole, updateCustomer);
router.delete('/:id', requireAnyRole, deleteCustomer);

export default router;
