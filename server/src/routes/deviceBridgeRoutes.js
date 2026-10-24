import express from 'express';
import { detectDevice } from '../controllers/deviceBridgeController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Protected: Only authenticated shop staff / technicians can trigger hardware device detection
router.get('/detect', authenticateToken, detectDevice);

export default router;
