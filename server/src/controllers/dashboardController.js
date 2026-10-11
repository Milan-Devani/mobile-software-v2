import { db } from '../db/db.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const { jobs } = await db.jobs.list({ limit: 5000 });
    const payments = await db.payments.listByJobId(''); // list all
    const allPayments = (await db.payments.listByJobId('')) || []; // or fetch all
    // Since payments in localDb is an array:
    // Let's get payments
    const today = new Date().toISOString().slice(0, 10);

    const counts = {
      TOTAL: jobs.length,
      RECEIVED: 0,
      DIAGNOSING: 0,
      ESTIMATE_SENT: 0,
      AWAITING_APPROVAL: 0,
      APPROVED: 0,
      REJECTED: 0,
      IN_PROGRESS: 0,
      TESTING: 0,
      READY_FOR_PICKUP: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    let totalPendingPayments = 0;
    let todayJobsCount = 0;
    let todayRevenue = 0;
    let totalRevenue = 0;

    for (const j of jobs) {
      if (counts[j.status] !== undefined) {
        counts[j.status] += 1;
      }

      if (j.balance_due && j.balance_due > 0 && !['CANCELLED', 'REJECTED'].includes(j.status)) {
        totalPendingPayments += Number(j.balance_due);
      }

      if (j.created_at && j.created_at.slice(0, 10) === today) {
        todayJobsCount += 1;
      }
    }

    // Calculate revenue from all completed payments
    // Look across job payments
    for (const j of jobs) {
      if (Array.isArray(j.payments)) {
        for (const p of j.payments) {
          totalRevenue += Number(p.amount || 0);
          if (p.paid_at && p.paid_at.slice(0, 10) === today) {
            todayRevenue += Number(p.amount || 0);
          }
        }
      } else {
        totalRevenue += Number(j.paid_amount || 0);
      }
    }

    // Recent 10 jobs
    const recentJobs = jobs.slice(0, 10);

    // Grouping for the pipeline overview
    const pipeline = [
      { status: 'RECEIVED', label: 'Received / Intake', count: counts.RECEIVED, color: 'sky' },
      { status: 'DIAGNOSING', label: 'Diagnosing', count: counts.DIAGNOSING, color: 'indigo' },
      { status: 'ESTIMATE_SENT', label: 'Estimate Sent', count: counts.ESTIMATE_SENT + counts.AWAITING_APPROVAL, color: 'amber' },
      { status: 'APPROVED', label: 'Approved', count: counts.APPROVED, color: 'blue' },
      { status: 'IN_PROGRESS', label: 'In Progress', count: counts.IN_PROGRESS, color: 'violet' },
      { status: 'TESTING', label: 'Quality Testing', count: counts.TESTING, color: 'purple' },
      { status: 'READY_FOR_PICKUP', label: 'Ready for Pickup', count: counts.READY_FOR_PICKUP, color: 'emerald' },
      { status: 'DELIVERED', label: 'Delivered / Completed', count: counts.DELIVERED, color: 'teal' },
      { status: 'CANCELLED', label: 'Cancelled / Rejected', count: counts.CANCELLED + counts.REJECTED, color: 'rose' },
    ];

    res.json({
      success: true,
      data: {
        summary: {
          total_jobs: jobs.length,
          new_jobs: counts.RECEIVED,
          awaiting_diagnosis: counts.DIAGNOSING,
          awaiting_approval: counts.ESTIMATE_SENT + counts.AWAITING_APPROVAL,
          in_progress: counts.IN_PROGRESS,
          testing: counts.TESTING,
          ready_for_pickup: counts.READY_FOR_PICKUP,
          completed: counts.DELIVERED,
          cancelled: counts.CANCELLED,
          pending_payments: parseFloat(totalPendingPayments.toFixed(2)),
          today_jobs: todayJobsCount,
          today_revenue: parseFloat(todayRevenue.toFixed(2)),
          total_revenue: parseFloat(totalRevenue.toFixed(2)),
        },
        pipeline,
        recent_jobs: recentJobs,
      },
    });
  } catch (err) {
    next(err);
  }
};
