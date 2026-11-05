import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRoles, requireAdmin } from '../middleware/roleGuard.js';
import { publicReviewRateLimiter } from '../middleware/rateLimiter.js';
import {
  getReviewSettings,
  updateReviewSettings,
  getReviewDashboard,
  getReviewRequests,
  retryReviewRequest,
  revokeReviewRequest,
  getPublicReviewPage,
  generatePublicAiReview,
  submitPublicReviewFeedback,
  continuePublicGoogleReview,
} from '../controllers/reviewController.js';

const router = express.Router();

// ==========================================
// PUBLIC REVIEW ROUTES (NO LOGIN REQUIRED)
// ==========================================
router.get('/public/:token', publicReviewRateLimiter, getPublicReviewPage);
router.post('/public/:token/generate', publicReviewRateLimiter, generatePublicAiReview);
router.post('/public/:token/feedback', publicReviewRateLimiter, submitPublicReviewFeedback);
router.post('/public/:token/continue', publicReviewRateLimiter, continuePublicGoogleReview);

// ==========================================
// ADMIN MANAGEMENT ROUTES (AUTHENTICATED)
// ==========================================
router.get('/settings', authenticateToken, requireRoles(['admin', 'staff']), getReviewSettings);
router.put('/settings', authenticateToken, requireAdmin, updateReviewSettings);
router.get('/dashboard', authenticateToken, requireRoles(['admin', 'staff']), getReviewDashboard);
router.get('/requests', authenticateToken, requireRoles(['admin', 'staff']), getReviewRequests);
router.post('/requests/:id/retry', authenticateToken, requireRoles(['admin', 'staff']), retryReviewRequest);
router.post('/requests/:id/revoke', authenticateToken, requireAdmin, revokeReviewRequest);

export default router;
