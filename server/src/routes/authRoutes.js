import express from 'express';
import {
  login,
  getProfile,
  listUsers,
  createUser,
  deleteUser,
  bulkDeleteUsers
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleGuard.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', authRateLimiter, login);
router.get('/me', authenticateToken, getProfile);
router.get('/users', authenticateToken, requireAdmin, listUsers);
router.post('/users', authenticateToken, requireAdmin, createUser);
router.post('/users/bulk-delete', authenticateToken, requireAdmin, bulkDeleteUsers);
router.delete('/users/:id', authenticateToken, requireAdmin, deleteUser);

export default router;
