import { db } from '../db/db.js';
import { dispatchNotification } from '../services/notificationService.js';
import { AppError } from '../middleware/errorHandler.js';

export const getNotificationLogs = async (req, res, next) => {
  try {
    const { jobId, channel, search, startDate = '', endDate = '', limit = 50, offset = 0 } = req.query;
    const result = await db.notifications.getLogs({
      jobId,
      channel,
      search,
      startDate,
      endDate,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      success: true,
      data: {
        logs: result.logs,
        total: result.total,
      },
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

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await db.notifications.delete(id);
    if (!deleted) {
      throw new AppError('Notification log entry not found.', 404, 'LOG_NOT_FOUND');
    }
    res.json({
      success: true,
      message: 'Notification log entry deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const bulkDeleteNotifications = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('No notification log IDs provided for bulk deletion.', 400, 'IDS_REQUIRED');
    }
    const count = await db.notifications.bulkDelete(ids);
    res.json({
      success: true,
      message: `Successfully deleted ${count} notification log(s).`,
      data: { count },
    });
  } catch (err) {
    next(err);
  }
};
