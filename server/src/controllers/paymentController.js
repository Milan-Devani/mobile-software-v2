import { db } from '../db/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { dispatchNotification } from '../services/notificationService.js';

export const recordPayment = async (req, res, next) => {
  try {
    const { job_id, amount, payment_method = 'CASH', transaction_reference = '', notes = '' } = req.body;

    if (!job_id) {
      throw new AppError('Job ID is required.', 400, 'JOB_ID_REQUIRED');
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new AppError('Payment amount must be greater than zero.', 400, 'INVALID_AMOUNT');
    }

    let paymentResult;
    try {
      paymentResult = await db.payments.create({
        jobId: job_id,
        amount: parsedAmount,
        paymentMethod: payment_method,
        transactionReference: transaction_reference,
        notes,
        userId: req.user.id,
      });
    } catch (dbErr) {
      throw new AppError(dbErr.message, 400, 'PAYMENT_FAILED');
    }
    const { payment, job } = paymentResult;

    // Automatically synchronize/generate the invoice
    const invoice = await db.invoices.createOrUpdateForJob({
      jobId: job_id,
      userId: req.user.id,
    });

    const fullJob = await db.jobs.findById(job_id);
    const customer = await db.customers.findById(fullJob.customer_id);

    // Send payment confirmation receipt notification (without full invoice)
    dispatchNotification({
      job: fullJob,
      customer,
      type: 'PAYMENT_RECEIVED',
      channels: ['EMAIL', 'WHATSAPP', 'SMS'],
      metadata: {
        paymentAmount: parsedAmount,
        paymentMethod: payment_method,
      },
    }).catch(err => console.error('Payment notification error:', err));

    res.status(201).json({
      success: true,
      message: `Payment of $${parsedAmount.toFixed(2)} recorded successfully. Remaining balance: $${job.balance_due.toFixed(2)}.`,
      data: {
        payment,
        job: fullJob,
        invoice,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getJobPayments = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const payments = await db.payments.listByJobId(jobId);

    res.json({
      success: true,
      data: { payments },
    });
  } catch (err) {
    next(err);
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const { search = '', method = 'ALL', limit = 50, offset = 0 } = req.query;
    const result = await db.payments.list({
      search,
      method,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await db.payments.delete(id);
    if (!deleted) {
      throw new AppError('Payment not found.', 404, 'PAYMENT_NOT_FOUND');
    }
    res.json({
      success: true,
      message: 'Payment record deleted and job balance updated.',
    });
  } catch (err) {
    next(err);
  }
};

export const bulkDeletePayments = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('No payment IDs provided for bulk deletion.', 400, 'IDS_REQUIRED');
    }
    const count = await db.payments.bulkDelete(ids);
    res.json({
      success: true,
      message: `Successfully deleted ${count} payment record(s).`,
      data: { count },
    });
  } catch (err) {
    next(err);
  }
};
