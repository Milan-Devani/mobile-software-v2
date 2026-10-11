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

    const { payment, job } = await db.payments.create({
      jobId: job_id,
      amount: parsedAmount,
      paymentMethod: payment_method,
      transactionReference: transaction_reference,
      notes,
      userId: req.user.id,
    });

    // Automatically synchronize/generate the invoice
    const invoice = await db.invoices.createOrUpdateForJob({
      jobId: job_id,
      userId: req.user.id,
    });

    const fullJob = await db.jobs.findById(job_id);
    const customer = await db.customers.findById(fullJob.customer_id);

    // Send confirmation notification
    dispatchNotification({
      job: fullJob,
      customer,
      type: 'PAYMENT_RECEIVED',
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
