import { db } from '../db/db.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { dispatchNotification } from '../services/notificationService.js';
import { generateInvoicePdfBuffer } from '../services/pdfService.js';

export const getJobInvoice = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await db.jobs.findById(jobId);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    let invoice = await db.invoices.getByJobId(job.id);
    if (!invoice) {
      // Auto-generate invoice from job details if not yet generated
      invoice = await db.invoices.createOrUpdateForJob({
        jobId: job.id,
        userId: req.user?.id,
      });
    }

    const shop = await db.shops.getProfile();

    res.json({
      success: true,
      data: {
        invoice,
        job,
        shop,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const generateInvoice = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { warranty_days = 90, notes = '' } = req.body;

    const invoice = await db.invoices.createOrUpdateForJob({
      jobId,
      warrantyDays: warranty_days,
      notes,
      userId: req.user.id,
    });

    const job = await db.jobs.findById(jobId);
    const shop = await db.shops.getProfile();

    res.json({
      success: true,
      message: 'Invoice created / refreshed successfully.',
      data: {
        invoice,
        job,
        shop,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const resendInvoice = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { channels = ['EMAIL', 'WHATSAPP', 'SMS'] } = req.body;

    const job = await db.jobs.findById(jobId);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    const customer = await db.customers.findById(job.customer_id);

    const result = await dispatchNotification({
      job,
      customer,
      type: 'INVOICE_GENERATED',
      channels,
    });

    res.json({
      success: true,
      message: 'Invoice dispatched through selected channels.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const downloadInvoicePdf = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await db.jobs.findById(jobId);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    let invoice = await db.invoices.getByJobId(job.id);
    if (!invoice) {
      invoice = await db.invoices.createOrUpdateForJob({
        jobId: job.id,
        userId: req.user?.id,
      });
    }

    const shop = await db.shops.getProfile();
    const clientBase = req.get('origin') || (env.CLIENT_URL && env.CLIENT_URL !== '*' && env.CLIENT_URL.startsWith('http') ? env.CLIENT_URL : env.APP_URL && env.APP_URL !== '*' && env.APP_URL.startsWith('http') ? env.APP_URL : (env.NODE_ENV === 'production' ? 'https://mobile-software-v2.vercel.app' : 'http://localhost:5173'));
    const trackingUrl = `${clientBase.replace(/\/+$/, '')}/repair/${job.job_number}/approval?token=${job.approval_token || ''}`;

    const pdfBuffer = await generateInvoicePdfBuffer({ job, invoice, shop, trackingUrl });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Mobotech_Invoice_${job.job_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};
