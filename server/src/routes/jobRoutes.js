import express from 'express';
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  startDiagnosis,
  saveDiagnosis,
  saveEstimate,
  publicGetApprovalDetails,
  publicSubmitApproval,
  startRepair,
  completeRepair,
  saveTests,
  markReadyForPickup,
  recordPickup,
  cancelJob,
  deleteJob
} from '../controllers/jobController.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  requireAnyRole,
  requireTechnicianOrAdmin,
  requireStaffOrAdmin
} from '../middleware/roleGuard.js';

const router = express.Router();

// 1. PUBLIC ROUTES (For Customer Approval Link)
router.get('/public/approval/:tokenOrJobNumber', publicGetApprovalDetails);
router.post('/public/approval/:tokenOrJobNumber', publicSubmitApproval);

// 2. PROTECTED EMPLOYEE ROUTES
router.use(authenticateToken);

router.get('/', requireAnyRole, getJobs);
router.get('/:id', requireAnyRole, getJobById);
router.post('/', requireStaffOrAdmin, createJob);
router.put('/:id', requireAnyRole, updateJob);
router.delete('/:id', requireAnyRole, deleteJob);

// Step transitions & actions
router.post('/:id/start-diagnosis', requireTechnicianOrAdmin, startDiagnosis);
router.post('/:id/diagnosis', requireTechnicianOrAdmin, saveDiagnosis);
router.post('/:id/estimate', requireTechnicianOrAdmin, saveEstimate);
router.post('/:id/start-repair', requireTechnicianOrAdmin, startRepair);
router.post('/:id/complete-repair', requireTechnicianOrAdmin, completeRepair);
router.post('/:id/testing', requireTechnicianOrAdmin, saveTests);
router.post('/:id/ready-for-pickup', requireTechnicianOrAdmin, markReadyForPickup);
router.post('/:id/pickup', requireStaffOrAdmin, recordPickup);
router.post('/:id/cancel', requireStaffOrAdmin, cancelJob);

export default router;
