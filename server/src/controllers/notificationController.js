import { db } from '../db/db.js';
import { dispatchNotification } from '../services/notificationService.js';
import { AppError } from '../middleware/errorHandler.js';

export const getNotificationLogs = async (req, res, next) => {
  try {
    const { jobId, limit = 100 } = req.query;
    const logs = await db.notifications.getLogs({ jobId, limit: parseInt(limit, 10) });

    res.json({
      success: true,
      data: { logs },
    });
  } catch (err) {
    next(err);
  }
};

export const resendNotification = async (req, res, next) => {
  try {
    const { jobId, channel, type } = req.body;

    const job = await db.jobs.findById(jobId);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    const customer = await db.customers.findById(job.customer_id);
    if (!customer) throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');

    const result = await dispatchNotification({
      job,
      customer,
      type: type || 'JOB_CREATED',
      channels: [channel],
    });

    res.json({
      success: true,
      message: `Notification resent through ${channel}.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
