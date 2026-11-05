import { db } from '../db/db.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateReviewText } from '../services/aiReview.service.js';
import { retryReviewInvitation } from '../services/reviewInvitationService.js';

const extractClientUrl = (req) => {
  const origin = req.get('origin');
  if (origin && origin.startsWith('http')) return origin.replace(/\/+$/, '');
  const referer = req.get('referer');
  if (referer && referer.startsWith('http')) {
    try {
      const parsed = new URL(referer);
      return `${parsed.protocol}//${parsed.host}`;
    } catch (_) {}
  }
  return null;
};

// ==========================================
// ADMIN CONTROLLERS (PROTECTED)
// ==========================================

export const getReviewSettings = async (req, res, next) => {
  try {
    const settings = await db.reviewSettings.get();

    // Never return private API keys. Provide provider status cleanly.
    const safeData = {
      ...settings,
      ai_providers_status: {
        primary: env.AI_PRIMARY_PROVIDER,
        fallbacks: env.AI_FALLBACK_PROVIDERS,
        gemini_configured: Boolean(env.GEMINI_API_KEY),
        groq_configured: Boolean(env.GROQ_API_KEY),
        openrouter_configured: Boolean(env.OPENROUTER_API_KEY),
        gemini_model: env.GEMINI_TEXT_MODEL,
        groq_model: env.GROQ_TEXT_MODEL,
        openrouter_model: env.OPENROUTER_TEXT_MODEL,
      },
    };

    res.json({ success: true, data: safeData });
  } catch (err) {
    next(err);
  }
};

export const updateReviewSettings = async (req, res, next) => {
  try {
    const {
      google_review_url,
      is_enabled,
      invitation_channel,
      invitation_message,
      ai_enabled,
    } = req.body;

    const updates = {};
    if (google_review_url !== undefined) updates.google_review_url = String(google_review_url).trim();
    if (is_enabled !== undefined) updates.is_enabled = Boolean(is_enabled);
    if (invitation_channel !== undefined) updates.invitation_channel = invitation_channel;
    if (invitation_message !== undefined) updates.invitation_message = String(invitation_message).trim();
    if (ai_enabled !== undefined) updates.ai_enabled = Boolean(ai_enabled);

    const updated = await db.reviewSettings.update(updates);

    res.json({
      success: true,
      message: 'Google Review Assistant settings updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const getReviewDashboard = async (req, res, next) => {
  try {
    const stats = await db.reviewRequests.getStats();
    const { requests: recent } = await db.reviewRequests.list({ page: 1, limit: 5 });

    res.json({
      success: true,
      data: {
        stats,
        recent,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getReviewRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = 'ALL', search = '', rating = 'ALL' } = req.query;

    const result = await db.reviewRequests.list({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      status,
      search,
      rating,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const retryReviewRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const clientUrl = extractClientUrl(req);

    const updated = await retryReviewInvitation(id, clientUrl);
    if (!updated) {
      throw new AppError('Could not retry review invitation.', 400);
    }

    res.json({
      success: true,
      message: updated.invitation_status === 'SENT'
        ? 'Review invitation sent successfully!'
        : `Invitation failed: ${updated.error_message || 'Please check contact number'}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const revokeReviewRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reqRecord = await db.reviewRequests.findById(id);
    if (!reqRecord) throw new AppError('Review request not found.', 404);

    const updated = await db.reviewRequests.update(id, {
      invitation_status: 'REVOKED',
      error_message: 'Link revoked by staff',
    });

    res.json({
      success: true,
      message: 'Review invitation link has been revoked.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC CONTROLLERS (NO LOGIN REQUIRED)
// ==========================================

export const getPublicReviewPage = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string' || token.length < 10) {
      throw new AppError('Invalid or missing review token.', 400);
    }

    const reviewRequest = await db.reviewRequests.findByToken(token);
    if (!reviewRequest) {
      throw new AppError('This review link is invalid, expired, or not found.', 404);
    }

    if (reviewRequest.invitation_status === 'REVOKED') {
      throw new AppError('This review link has been revoked.', 403);
    }

    // Record open timestamp on first visit
    if (!reviewRequest.review_page_opened_at) {
      await db.reviewRequests.update(reviewRequest.id, {
        review_page_opened_at: new Date().toISOString(),
      });
    }

    const settings = await db.reviewSettings.get();
    const shop = reviewRequest.shop || (await db.shops.getProfile());
    const job = reviewRequest.job;

    // Filter to safe public payload (never expose customer personal phone, exact costs, or private notes)
    const publicData = {
      token,
      shop: {
        name: shop?.name || 'Mobotech Mobile Care',
        tagline: shop?.tagline || 'Professional Smartphone Repair Care',
        logo_url: shop?.logo_url || null,
        phone: shop?.phone || '',
        google_review_url: settings?.google_review_url || 'https://g.page/r/CX_tsygbzKLqEBM/review',
      },
      repair: {
        job_number: job?.job_number || 'JOB-001',
        device_brand: job?.device?.brand || '',
        device_model: job?.device?.model || 'Device',
        problem: job?.customer_complaint || 'Mobile Device Repair',
        service_summary: job?.diagnoses?.[0]?.diagnosis || 'Hardware & System Repair Service',
        delivered_at: job?.delivered_at || null,
      },
      customer: {
        first_name: (reviewRequest.customer?.full_name || 'Customer').split(' ')[0],
      },
      rating: reviewRequest.rating,
      customer_feedback: reviewRequest.customer_feedback,
      generated_review: reviewRequest.generated_review,
      edited_review: reviewRequest.edited_review,
      ai_enabled: settings?.ai_enabled !== false,
      google_redirected: Boolean(reviewRequest.google_redirected_at),
    };

    res.json({
      success: true,
      data: publicData,
    });
  } catch (err) {
    next(err);
  }
};

export const generatePublicAiReview = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { rating, customerFeedback } = req.body;

    const reviewRequest = await db.reviewRequests.findByToken(token);
    if (!reviewRequest) {
      throw new AppError('Invalid or expired review link.', 404);
    }

    if (reviewRequest.invitation_status === 'REVOKED') {
      throw new AppError('This review link has been revoked.', 403);
    }

    const settings = await db.reviewSettings.get();
    if (settings?.ai_enabled === false) {
      throw new AppError('AI review suggestions are currently disabled by the shop.', 400);
    }

    const job = reviewRequest.job;
    const stars = Math.min(5, Math.max(1, parseInt(rating || 5, 10)));

    const aiResult = await generateReviewText({
      rating: stars,
      customerFeedback: customerFeedback || '',
      deviceBrand: job?.device?.brand || '',
      deviceModel: job?.device?.model || '',
      problem: job?.customer_complaint || '',
      servicePerformed: job?.diagnoses?.[0]?.diagnosis || 'repair service',
    });

    if (!aiResult.success) {
      return res.status(503).json({
        success: false,
        message: aiResult.error || 'AI generation temporarily unavailable. Please try again or write your own review.',
      });
    }

    // Persist generated text & provider internally
    await db.reviewRequests.update(reviewRequest.id, {
      rating: stars,
      customer_feedback: customerFeedback || null,
      generated_review: aiResult.reviewText,
      edited_review: aiResult.reviewText,
      ai_provider: aiResult.provider,
    });

    res.json({
      success: true,
      data: {
        reviewText: aiResult.reviewText,
        provider: aiResult.provider,
        wordCount: aiResult.wordCount,
        durationMs: aiResult.durationMs,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const submitPublicReviewFeedback = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { rating, customerFeedback, editedReview } = req.body;

    const reviewRequest = await db.reviewRequests.findByToken(token);
    if (!reviewRequest) {
      throw new AppError('Invalid or expired review link.', 404);
    }

    const updates = {};
    if (rating !== undefined) updates.rating = Math.min(5, Math.max(1, parseInt(rating, 10)));
    if (customerFeedback !== undefined) updates.customer_feedback = String(customerFeedback).trim();
    if (editedReview !== undefined) updates.edited_review = String(editedReview).trim();

    const updated = await db.reviewRequests.update(reviewRequest.id, updates);

    res.json({
      success: true,
      message: 'Feedback recorded successfully.',
      data: {
        rating: updated.rating,
        edited_review: updated.edited_review,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const continuePublicGoogleReview = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { rating, editedReview } = req.body || {};

    const reviewRequest = await db.reviewRequests.findByToken(token);
    if (!reviewRequest) {
      throw new AppError('Invalid or expired review link.', 404);
    }

    const settings = await db.reviewSettings.get();

    // Record redirect timestamp and save any final edits
    const updates = {
      google_redirected_at: new Date().toISOString(),
    };
    if (rating !== undefined) updates.rating = Math.min(5, Math.max(1, parseInt(rating, 10)));
    if (editedReview !== undefined) updates.edited_review = String(editedReview).trim();

    await db.reviewRequests.update(reviewRequest.id, updates);

    res.json({
      success: true,
      data: {
        google_review_url: settings?.google_review_url || 'https://g.page/r/CX_tsygbzKLqEBM/review',
      },
    });
  } catch (err) {
    next(err);
  }
};
