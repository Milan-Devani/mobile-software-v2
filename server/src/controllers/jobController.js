import { db } from '../db/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { dispatchNotification } from '../services/notificationService.js';

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

export const getJobs = async (req, res, next) => {
  try {
    const {
      status,
      customerId,
      technicianId,
      search = '',
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortDir = 'desc'
    } = req.query;

    const result = await db.jobs.list({
      status,
      customerId,
      technicianId,
      search,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      sortBy,
      sortDir
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await db.jobs.findById(id);

    if (!job) {
      throw new AppError('Repair Job not found.', 404, 'JOB_NOT_FOUND');
    }

    res.json({
      success: true,
      data: { job },
    });
  } catch (err) {
    next(err);
  }
};

export const createJob = async (req, res, next) => {
  try {
    const {
      customer_id,
      device_data, // { brand, model, color, storage_capacity, imei, serial_number, passcode, operating_system }
      device_id,
      assigned_technician_id,
      priority = 'NORMAL',
      customer_complaint,
      device_condition,
      accessories_received,
      photos = []
    } = req.body;

    if (!customer_id) {
      throw new AppError('Customer selection is required.', 400, 'CUSTOMER_REQUIRED');
    }

    if (!customer_complaint || customer_complaint.trim() === '') {
      throw new AppError('Customer complaint / reported issue is required.', 400, 'COMPLAINT_REQUIRED');
    }

    let finalDeviceId = device_id;

    // Create device if not already existing
    if (!finalDeviceId && device_data) {
      if (!device_data.brand || !device_data.model) {
        throw new AppError('Device brand and model are required.', 400, 'DEVICE_INFO_REQUIRED');
      }
      const newDevice = await db.devices.create({
        customer_id,
        brand: device_data.brand,
        model: device_data.model,
        color: device_data.color || '',
        storage_capacity: device_data.storage_capacity || '',
        imei: device_data.imei || '',
        serial_number: device_data.serial_number || '',
        passcode: device_data.passcode || '',
        operating_system: device_data.operating_system || 'iOS',
        invoice_date: device_data.invoice_date || null,
        invoice_number: device_data.invoice_number || '',
        expiry_date: device_data.expiry_date || null,
        cosmetic_condition: device_data.cosmetic_condition || 'Wear And Tear',
      });
      finalDeviceId = newDevice.id;
    }

    if (!finalDeviceId) {
      throw new AppError('Device information is required to create a Job Sheet.', 400, 'DEVICE_REQUIRED');
    }

    const { service_type = 'Pending' } = req.body;

    const newJob = await db.jobs.create({
      jobData: {
        customer_id,
        device_id: finalDeviceId,
        assigned_technician_id: assigned_technician_id || null,
        priority,
        service_type,
        customer_complaint: customer_complaint.trim(),
        device_condition: device_condition || {},
        accessories_received: accessories_received || [],
      },
      userId: req.user.id,
    });

    // Save photos if provided
    if (Array.isArray(photos) && photos.length > 0) {
      for (const p of photos) {
        await db.attachments.create({
          jobId: newJob.id,
          fileType: 'DEVICE_CHECKIN_PHOTO',
          fileName: p.name || 'device_checkin.jpg',
          filePath: p.path || p.url,
          fileUrl: p.url,
          sizeBytes: p.size || 0,
          mimeType: p.mimeType || 'image/jpeg',
          userId: req.user.id,
        });
      }
    }

    // Load full job for response and notifications
    const fullJob = await db.jobs.findById(newJob.id);
    const customer = await db.customers.findById(customer_id);

    // Send asynchronous notification
    dispatchNotification({
      job: fullJob,
      customer,
      type: 'JOB_CREATED',
      metadata: { clientUrl: extractClientUrl(req) },
    }).catch(err => console.error('Notification dispatch error:', err));

    res.status(201).json({
      success: true,
      message: `Repair Job Sheet #${newJob.job_number} created successfully.`,
      data: { job: fullJob },
    });
  } catch (err) {
    next(err);
  }
};

export const updateJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.jobs.findById(id);
    if (!existing) {
      throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');
    }

    if (['DELIVERED', 'CANCELLED'].includes(existing.status)) {
      throw new AppError(`Cannot edit a job with status "${existing.status}".`, 400, 'JOB_LOCKED');
    }

    const {
      customer_complaint,
      device_data,
      device_condition,
      accessories_received,
      assigned_technician_id,
      priority,
      estimated_delivery_date,
      internal_notes,
      ...otherUpdates
    } = req.body;

    // If device details are being updated
    if (device_data && existing.device_id) {
      await db.devices.update(existing.device_id, {
        ...(device_data.brand && { brand: device_data.brand }),
        ...(device_data.model && { model: device_data.model }),
        ...(device_data.color !== undefined && { color: device_data.color }),
        ...(device_data.storage_capacity !== undefined && { storage_capacity: device_data.storage_capacity }),
        ...(device_data.imei !== undefined && { imei: device_data.imei }),
        ...(device_data.serial_number !== undefined && { serial_number: device_data.serial_number }),
        ...(device_data.passcode !== undefined && { passcode: device_data.passcode }),
        ...(device_data.operating_system !== undefined && { operating_system: device_data.operating_system }),
      });
    }

    const updates = {
      ...otherUpdates,
      ...(customer_complaint !== undefined && { customer_complaint }),
      ...(device_condition !== undefined && { device_condition }),
      ...(accessories_received !== undefined && { accessories_received }),
      ...(assigned_technician_id !== undefined && { assigned_technician_id }),
      ...(priority !== undefined && { priority }),
      ...(estimated_delivery_date !== undefined && { estimated_delivery_date }),
      ...(internal_notes !== undefined && { internal_notes }),
    };

    if (req.body.status && req.body.status !== existing.status) {
      updates.status = req.body.status;
      await db.jobs.updateStatus(
        id,
        req.body.status,
        `Status Changed to ${req.body.status} (Job Sheet Edit)`,
        req.body.status_notes || `Status modified from ${existing.status} to ${req.body.status} by ${req.user.full_name || 'Staff'}.`,
        req.user.id
      );
    }

    await db.jobs.update(id, updates);
    const fullJob = await db.jobs.findById(id);

    res.json({
      success: true,
      message: 'Job Sheet updated successfully.',
      data: { job: fullJob },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.jobs.findById(id);
    if (!existing) {
      throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');
    }

    await db.jobs.delete(id);

    res.json({
      success: true,
      message: `Job Sheet #${existing.job_number} deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

export const bulkDeleteJobs = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('No job IDs provided for bulk deletion.', 400, 'IDS_REQUIRED');
    }
    const count = await db.jobs.bulkDelete(ids);
    res.json({
      success: true,
      message: `Successfully deleted ${count} job(s).`,
      data: { count },
    });
  } catch (err) {
    next(err);
  }
};

export const bulkUpdateJobStatus = async (req, res, next) => {
  try {
    const { ids, status, notes } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('No job IDs provided for bulk update.', 400, 'IDS_REQUIRED');
    }
    if (!status) {
      throw new AppError('Status is required for bulk update.', 400, 'STATUS_REQUIRED');
    }

    // Delivered jobs cannot have status changed directly without reopening
    const validIds = [];
    const skippedDelivered = [];
    for (const id of ids) {
      const j = await db.jobs.findById(id);
      if (j && j.status === 'DELIVERED') {
        skippedDelivered.push(j.job_number || id);
      } else {
        validIds.push(id);
      }
    }

    if (validIds.length === 0 && skippedDelivered.length > 0) {
      throw new AppError(
        'Delivered jobs cannot have their status changed directly. Please reopen the job for warranty claims.',
        400,
        'DELIVERED_JOB_LOCKED'
      );
    }

    const updated = await db.jobs.bulkUpdateStatus({
      ids: validIds,
      status,
      actionTitle: `Bulk Status Update to ${status}`,
      notes: notes || `Batch updated by staff ${req.user?.full_name || 'Staff'}.`,
      userId: req.user?.id,
    });

    res.json({
      success: true,
      message: skippedDelivered.length > 0
        ? `Updated status to ${status} for ${updated.length} job(s). Note: ${skippedDelivered.length} delivered job(s) were skipped (must be reopened first).`
        : `Updated status to ${status} for ${updated.length} job(s).`,
      data: { count: updated.length, updated, skippedDelivered },
    });
  } catch (err) {
    next(err);
  }
};

export const startDiagnosis = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    if (job.status !== 'RECEIVED') {
      throw new AppError(`Cannot start diagnosis from status "${job.status}". Expected: RECEIVED.`, 400, 'INVALID_STATUS_TRANSITION');
    }

    await db.jobs.updateStatus(
      id,
      'DIAGNOSING',
      'Diagnostic Assessment Started',
      `Technician ${req.user.full_name} has begun device bench testing and inspection.`,
      req.user.id
    );

    const updatedJob = await db.jobs.findById(id);
    res.json({
      success: true,
      message: 'Device moved to Diagnosing stage.',
      data: { job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

export const saveDiagnosis = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reported_issue, technician_findings, root_cause, recommended_solution, internal_technician_notes } = req.body;

    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    if (['DELIVERED', 'CANCELLED'].includes(job.status)) {
      throw new AppError(`Cannot update diagnosis for ${job.status} job. Reopen job first.`, 400, 'JOB_LOCKED');
    }

    if (!technician_findings || !recommended_solution) {
      throw new AppError('Technician findings and recommended solution are required.', 400, 'DIAGNOSIS_DATA_REQUIRED');
    }

    const diagnosis = await db.diagnoses.upsert({
      jobId: id,
      reportedIssue: reported_issue || job.customer_complaint,
      technicianFindings: technician_findings,
      rootCause: root_cause || '',
      recommendedSolution: recommended_solution,
      internalNotes: internal_technician_notes || '',
      userId: req.user.id,
    });

    await db.jobs.updateStatus(
      id,
      job.status === 'RECEIVED' ? 'DIAGNOSING' : job.status,
      'Diagnosis Findings Recorded',
      `Technician noted: ${technician_findings.slice(0, 100)}... Solution: ${recommended_solution.slice(0, 100)}...`,
      req.user.id
    );

    const updatedJob = await db.jobs.findById(id);
    res.json({
      success: true,
      message: 'Diagnosis saved successfully.',
      data: { diagnosis, job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

export const saveEstimate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      labor_charge,
      items,
      discount,
      discount_type = 'AMOUNT',
      discount_value = 0,
      tax_rate,
      notes,
      valid_until,
      send_notification = true
    } = req.body;

    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    if (['DELIVERED', 'CANCELLED'].includes(job.status)) {
      throw new AppError(`Cannot create estimate for ${job.status} job.`, 400, 'JOB_LOCKED');
    }

    const estimate = await db.estimates.save({
      jobId: id,
      laborCharge: labor_charge || 0,
      items: items || [],
      discount: discount || 0,
      discountType: discount_type,
      discountValue: discount_value !== undefined ? discount_value : (discount || 0),
      taxRate: tax_rate !== undefined ? tax_rate : 8.25,
      notes: notes || '',
      validUntil: valid_until,
      userId: req.user.id,
    });

    const isFreeWarranty = estimate.total_amount === 0 || (job.is_warranty_claim && (job.warranty_same_issue || job.warranty_free_rework));

    if (isFreeWarranty) {
      await db.jobs.update(id, {
        approval_status: 'APPROVED',
        approval_decision_at: new Date().toISOString(),
        approval_notes: 'Covered under warranty - Pre-authorized free rework',
        warranty_same_issue: true,
        warranty_free_rework: true,
        balance_due: 0.00,
        total_amount: 0.00,
      });

      await db.jobs.updateStatus(
        id,
        ['DIAGNOSING', 'RECEIVED', 'ESTIMATE_SENT'].includes(job.status) ? 'APPROVED' : job.status,
        'Free Warranty Rework Authorized',
        'Total amount is ₹0.00 (covered under warranty). Customer authorization pre-approved.',
        req.user.id
      );
    } else {
      await db.jobs.update(id, {
        approval_status: 'PENDING',
        warranty_same_issue: false,
      });

      // Move status to ESTIMATE_SENT (or AWAITING_APPROVAL)
      await db.jobs.updateStatus(
        id,
        'ESTIMATE_SENT',
        'Repair Estimate Generated & Sent',
        `Estimate of ₹${estimate.total_amount.toFixed(2)} prepared (Labor: ₹${estimate.labor_charge.toFixed(2)}, Parts: ₹${estimate.parts_subtotal.toFixed(2)}).`,
        req.user.id
      );
    }

    const updatedJob = await db.jobs.findById(id);
    const customer = await db.customers.findById(updatedJob.customer_id);

    if (send_notification) {
      dispatchNotification({
        job: updatedJob,
        customer,
        type: isFreeWarranty ? 'JOB_REOPENED' : 'ESTIMATE_SENT',
        metadata: { clientUrl: extractClientUrl(req) },
      }).catch(err => console.error('Estimate notification error:', err));
    }

    res.json({
      success: true,
      message: isFreeWarranty
        ? 'Free warranty rework estimate confirmed (₹0 balance, pre-approved).'
        : `Estimate of ₹${estimate.total_amount.toFixed(2)} saved and sent to customer.`,
      data: { estimate, job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

// PUBLIC CUSTOMER APPROVAL ENDPOINT
export const publicGetApprovalDetails = async (req, res, next) => {
  try {
    const { tokenOrJobNumber } = req.params;
    const job = (await db.jobs.findById(tokenOrJobNumber)) ||
      (await db.jobs.list({ limit: 1000 })).jobs.find(j => j.approval_token === tokenOrJobNumber || j.job_number === tokenOrJobNumber);

    if (!job) {
      throw new AppError('Approval link is invalid or expired.', 404, 'APPROVAL_NOT_FOUND');
    }

    const shop = await db.shops.getProfile();

    // Sanitize response: do NOT expose internal technician notes
    const sanitizedJob = {
      job_number: job.job_number,
      status: job.status,
      approval_status: job.approval_status,
      approval_decision_at: job.approval_decision_at,
      customer_complaint: job.customer_complaint,
      customer: {
        full_name: job.customer?.full_name,
      },
      device: {
        brand: job.device?.brand,
        model: job.device?.model,
        color: job.device?.color,
      },
      diagnosis: job.diagnosis ? {
        reported_issue: job.diagnosis.reported_issue,
        recommended_solution: job.diagnosis.recommended_solution,
      } : null,
      estimate: job.estimate ? {
        labor_charge: job.estimate.labor_charge,
        parts_subtotal: job.estimate.parts_subtotal,
        discount: job.estimate.discount,
        discount_type: job.estimate.discount_type || 'AMOUNT',
        discount_value: job.estimate.discount_value !== undefined ? job.estimate.discount_value : job.estimate.discount,
        tax_amount: job.estimate.tax_amount,
        total_amount: job.estimate.total_amount,
        items: (job.estimate.items || []).map(i => ({
          item_name: i.item_name,
          warranty: i.warranty || '',
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.total_price
        }))
      } : null,
      shop: {
        name: shop?.name,
        phone: shop?.phone,
        email: shop?.email,
        address: shop?.address,
        warranty_terms: shop?.warranty_terms,
      }
    };

    res.json({
      success: true,
      data: sanitizedJob,
    });
  } catch (err) {
    next(err);
  }
};

export const publicSubmitApproval = async (req, res, next) => {
  try {
    const { tokenOrJobNumber } = req.params;
    const { decision, reason = '' } = req.body; // decision: 'APPROVE' or 'REJECT'

    const job = (await db.jobs.findById(tokenOrJobNumber)) ||
      (await db.jobs.list({ limit: 1000 })).jobs.find(j => j.approval_token === tokenOrJobNumber || j.job_number === tokenOrJobNumber);

    if (!job) {
      throw new AppError('Repair job not found or invalid approval link.', 404, 'JOB_NOT_FOUND');
    }

    const isJobClosed = ['DELIVERED', 'CANCELLED'].includes(job.status);
    const isPaymentSettled = (Number(job.balance_due || 0) <= 0 && (Number(job.paid_amount || 0) > 0 || Number(job.total_amount || 0) > 0)) || isJobClosed;
    if (isPaymentSettled || isJobClosed) {
      throw new AppError('Customer payment is already completed and this repair order has finalized. Approval link is deactivated.', 400, 'APPROVAL_LINK_CLOSED');
    }

    if (!['APPROVE', 'REJECT'].includes(decision)) {
      throw new AppError('Decision must be either APPROVE or REJECT.', 400, 'INVALID_DECISION');
    }

    const isApproved = decision === 'APPROVE';
    const newStatus = isApproved ? 'APPROVED' : 'REJECTED';

    // Duplicate submission guard - return current status if already decided
    if (job.approval_status === newStatus) {
      return res.json({
        success: true,
        message: isApproved ? 'Thank you! Your repair authorization was already confirmed.' : 'Repair estimate rejection is already recorded.',
        data: { job },
      });
    }

    await db.jobs.update(job.id, {
      approval_status: newStatus,
      approval_decision_at: new Date().toISOString(),
      rejection_reason: isApproved ? null : reason,
    });

    await db.jobs.updateStatus(
      job.id,
      newStatus,
      isApproved ? 'Customer Approved Repair Estimate' : 'Customer Rejected Repair Estimate',
      isApproved
        ? 'Customer confirmed and approved the repair estimate online.'
        : `Customer declined repair estimate. Reason: "${reason || 'No reason provided'}".`,
      null
    );

    const updatedJob = await db.jobs.findById(job.id);
    const customer = await db.customers.findById(updatedJob.customer_id);

    // Automatically send WhatsApp & Email notification acknowledging approval / rejection
    if (customer) {
      dispatchNotification({
        job: updatedJob,
        customer,
        type: isApproved ? 'ESTIMATE_APPROVED' : 'ESTIMATE_REJECTED',
        channels: ['EMAIL', 'WHATSAPP', 'SMS'],
        metadata: { reason, clientUrl: extractClientUrl(req) },
      }).catch(err => console.error('Estimate decision notification error:', err));
    }

    res.json({
      success: true,
      message: isApproved ? 'Thank you! Your repair authorization has been received.' : 'Repair estimate rejection recorded and notification sent to customer.',
      data: { job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

export const startRepair = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    const isFreeWarranty = job.is_warranty_claim && (job.warranty_same_issue || job.warranty_free_rework || (job.approval_status === 'APPROVED' && Number(job.balance_due || 0) === 0));
    if (job.status !== 'APPROVED' && !(isFreeWarranty && ['DIAGNOSING', 'RECEIVED', 'APPROVED', 'ESTIMATE_SENT', 'AWAITING_APPROVAL'].includes(job.status))) {
      throw new AppError(`Cannot start repair when status is "${job.status}". Estimate must be APPROVED by customer first.`, 400, 'APPROVAL_REQUIRED');
    }

    // Deduct stock for parts attached to the estimate (only for new/chargeable repairs, skip duplicate deduction on same-issue warranty rework)
    if (!isFreeWarranty || !job.warranty_same_issue) {
      const estimate = await db.estimates.getByJobId(id);
      if (estimate && Array.isArray(estimate.items)) {
        for (const item of estimate.items) {
          if (item.part_id) {
            try {
              await db.parts.adjustStock({
                partId: item.part_id,
                quantityChange: -item.quantity,
                movementType: 'JOB_USAGE',
                referenceNumber: job.job_number,
                notes: `Component used for Job #${job.job_number} repair`,
                jobId: job.id,
                userId: req.user.id,
              });
            } catch (stockErr) {
              console.warn(`Stock deduction warning for part ${item.part_id}:`, stockErr.message);
            }
          }
        }
      }
    }

    await db.jobs.updateStatus(
      id,
      'IN_PROGRESS',
      isFreeWarranty ? 'Warranty Repair In Progress (Free Rework)' : 'Repair In Progress',
      isFreeWarranty
        ? `Technician ${req.user.full_name} commenced warranty rework on workbench (Covered under warranty - ₹0 balance).`
        : `Technician ${req.user.full_name} commenced hardware repair and replacement.`,
      req.user.id
    );

    const updatedJob = await db.jobs.findById(id);
    res.json({
      success: true,
      message: 'Repair started. Status moved to IN_PROGRESS.',
      data: { job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

export const completeRepair = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    if (job.status !== 'IN_PROGRESS') {
      throw new AppError(`Cannot complete repair from status "${job.status}". Expected: IN_PROGRESS.`, 400, 'INVALID_TRANSITION');
    }

    await db.jobs.updateStatus(
      id,
      'TESTING',
      'Hardware Repair Finished - Testing Required',
      `Physical repair work completed by ${req.user.full_name}. Device sent to Quality Check testing bench.`,
      req.user.id
    );

    const updatedJob = await db.jobs.findById(id);
    res.json({
      success: true,
      message: 'Repair finished. Device ready for Quality Check testing.',
      data: { job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

export const saveTests = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tests = [] } = req.body;

    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    if (['DELIVERED', 'CANCELLED'].includes(job.status)) {
      throw new AppError(`Cannot update tests for ${job.status} job. Reopen job first.`, 400, 'JOB_LOCKED');
    }

    const updatedTests = await db.tests.saveTests(id, tests, req.user.id);

    // Activity timeline entry
    const passedCount = updatedTests.filter(t => t.result === 'PASS').length;
    const failedCount = updatedTests.filter(t => t.result === 'FAIL').length;

    await db.jobs.updateStatus(
      id,
      job.status,
      'Quality Testing Checklist Updated',
      `Quality inspection updated: ${passedCount} PASS, ${failedCount} FAIL, ${updatedTests.length - passedCount - failedCount} NOT TESTED.`,
      req.user.id
    );

    const updatedJob = await db.jobs.findById(id);
    res.json({
      success: true,
      message: 'Quality check tests saved.',
      data: { tests: updatedTests, job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

export const markReadyForPickup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    if (!['TESTING', 'IN_PROGRESS'].includes(job.status)) {
      throw new AppError(`Cannot mark ready for pickup from status "${job.status}". Expected: TESTING.`, 400, 'INVALID_TRANSITION');
    }

    // Verify QC tests
    const tests = await db.tests.getByJobId(id);
    const hasFailedTests = tests.some(t => t.result === 'FAIL');
    if (hasFailedTests) {
      throw new AppError('Cannot mark Ready for Pickup: One or more Quality Check tests have failed. Resolve failed tests or record pass before releasing device.', 400, 'TESTS_FAILED');
    }

    await db.jobs.updateStatus(
      id,
      'READY_FOR_PICKUP',
      'Device Marked Ready for Customer Pickup',
      `All quality checks verified. Device cleaned and packaged for pickup.`,
      req.user.id
    );

    const updatedJob = await db.jobs.findById(id);
    const customer = await db.customers.findById(updatedJob.customer_id);

    // Notify customer
    dispatchNotification({
      job: updatedJob,
      customer,
      type: 'READY_FOR_PICKUP',
      metadata: { clientUrl: extractClientUrl(req) },
    }).catch(err => console.error('Ready for pickup notification error:', err));

    res.json({
      success: true,
      message: 'Device marked Ready for Pickup and customer notified.',
      data: { job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

export const recordPickup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      customer_tested_device,
      customer_acceptance_confirmed,
      customer_signature,
      delivery_notes,
      allow_payment_remaining = false,
      channels = ['EMAIL', 'WHATSAPP', 'SMS']
    } = req.body;

    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    if (!customer_tested_device || !customer_acceptance_confirmed) {
      throw new AppError('Customer device testing and confirmation are required before handover.', 400, 'CUSTOMER_CONFIRMATION_REQUIRED');
    }

    // Check payment balance (waived for free warranty rework AND rejected estimate returns, or if staff authorized payment remaining)
    const isEstimateRejected = job.status === 'REJECTED' || job.approval_status === 'REJECTED';
    const isFreeWarranty = job.warranty_same_issue || job.warranty_free_rework || (job.is_warranty_claim && (Number(job.balance_due) === 0 || Number(job.total_amount) === 0));

    if (!isFreeWarranty && !isEstimateRejected && job.balance_due > 0 && !allow_payment_remaining) {
      throw new AppError(
        `Outstanding balance of ₹${Number(job.balance_due).toFixed(2)} must be settled before delivering device (or check "Payment Remaining" to proceed).`,
        400,
        'PAYMENT_PENDING'
      );
    }

    await db.jobs.update(id, {
      customer_tested_device: true,
      customer_acceptance_confirmed: true,
      customer_signature: customer_signature || null,
      delivery_notes: delivery_notes || '',
      delivered_at: new Date().toISOString(),
      delivered_by_user_id: req.user.id,
      status: 'DELIVERED',
      ...(allow_payment_remaining ? { payment_remaining_authorized: true } : {}),
      ...(isEstimateRejected ? { balance_due: 0 } : {}),
    });

    await db.jobs.updateStatus(
      id,
      'DELIVERED',
      isEstimateRejected ? 'Device Handed Over Unrepaired (Estimate Declined)' : 'Device Delivered to Customer',
      isEstimateRejected
        ? `Device returned to customer in original intake condition without repair. Handled by staff ${req.user.full_name}.`
        : `Customer tested phone and signed confirmation: "Device received and working properly." Handled by staff ${req.user.full_name}.${job.balance_due > 0 && allow_payment_remaining ? ` (Delivered with pending balance of ₹${Number(job.balance_due).toFixed(2)})` : ''}`,
      req.user.id
    );

    if (!isEstimateRejected) {
      // Ensure final invoice is generated
      await db.invoices.createOrUpdateForJob({ jobId: id, userId: req.user.id });
    }

    const updatedJob = await db.jobs.findById(id);
    const customer = await db.customers.findById(updatedJob.customer_id);

    // Automatically send final receipt/handover notification via Email (Brevo), WhatsApp, and SMS
    dispatchNotification({
      job: updatedJob,
      customer,
      type: isEstimateRejected ? 'DEVICE_RETURNED_UNREPAIRED' : 'INVOICE_GENERATED',
      channels,
      metadata: { isWarrantyHandover: isFreeWarranty, isRejectedReturn: isEstimateRejected, clientUrl: extractClientUrl(req) },
    }).catch(err => console.error('Invoice delivery notification error:', err));

    res.json({
      success: true,
      message: isEstimateRejected
        ? 'Device successfully returned to customer in original condition.'
        : 'Job completed and device successfully delivered to customer.',
      data: { job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

export const cancelJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by staff or customer' } = req.body;

    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    if (job.status === 'DELIVERED') {
      throw new AppError('Cannot cancel an already delivered job.', 400, 'CANNOT_CANCEL_DELIVERED');
    }

    await db.jobs.updateStatus(
      id,
      'CANCELLED',
      'Repair Job Cancelled',
      `Reason: ${reason}. Processed by ${req.user.full_name}.`,
      req.user.id
    );

    const updatedJob = await db.jobs.findById(id);
    res.json({
      success: true,
      message: 'Job has been cancelled.',
      data: { job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

export const reopenJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      reason = 'Warranty issue reported by customer',
      target_status = 'DIAGNOSING',
      notes = '',
      claim_type = 'SAME_ISSUE', // 'SAME_ISSUE' or 'NEW_ISSUE'
    } = req.body;

    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    const allowedStatuses = ['DELIVERED', 'CANCELLED', 'REJECTED'];
    if (!allowedStatuses.includes(job.status)) {
      throw new AppError(
        `Cannot reopen job with current status "${job.status}". Only delivered, cancelled, or rejected jobs can be reopened.`,
        400,
        'INVALID_REOPEN_STATUS'
      );
    }

    const validTargets = ['DIAGNOSING', 'ESTIMATE_SENT', 'IN_PROGRESS', 'RECEIVED', 'TESTING'];
    const finalTargetStatus = validTargets.includes(target_status) ? target_status : 'DIAGNOSING';
    const isEstimateRejected = job.approval_status === 'REJECTED';
    const isWarrantyClaim = job.status === 'DELIVERED' && !isEstimateRejected;
    const isSameIssue = isWarrantyClaim && (claim_type === 'SAME_ISSUE');
    const reopenCount = (job.reopen_count || 0) + 1;

    const updatePayload = {
      status: finalTargetStatus,
      reopened_at: new Date().toISOString(),
      reopened_by_user_id: req.user.id,
      reopen_count: reopenCount,
      is_warranty_claim: isWarrantyClaim,
      warranty_claim_type: isSameIssue ? 'SAME_ISSUE' : (isWarrantyClaim ? 'NEW_ISSUE' : null),
      warranty_same_issue: isSameIssue,
      warranty_free_rework: isSameIssue,
      last_warranty_issue: isWarrantyClaim ? (reason || 'Customer returned under warranty') : null,
      reopen_notes: notes || '',
      customer_tested_device: false,
      customer_acceptance_confirmed: false,
      customer_signature: null,
      previous_delivered_at: job.delivered_at || null,
      delivered_at: null,
    };

    if (isEstimateRejected) {
      // Job was returned or closed without repair because estimate was declined.
      // Reopening resets approval status to PENDING so owner can revise and resend quote to customer
      updatePayload.approval_status = 'PENDING';
      updatePayload.rejection_reason = null;
      updatePayload.is_warranty_claim = false;
      updatePayload.warranty_claim_type = null;
      updatePayload.warranty_same_issue = false;
      updatePayload.warranty_free_rework = false;
      updatePayload.last_warranty_issue = null;
      const estimate = await db.estimates.getByJobId(id);
      if (estimate && Number(estimate.total_amount) > 0) {
        updatePayload.total_amount = Number(estimate.total_amount);
        updatePayload.balance_due = Number(estimate.total_amount) - Number(job.paid_amount || 0);
      }
    } else if (isSameIssue) {
      // 1. Same issue: Customer approval is pre-authorized, no approval required
      updatePayload.approval_status = 'APPROVED';
      updatePayload.approval_decision_at = new Date().toISOString();
      updatePayload.approval_notes = 'Pre-approved under warranty: Free rework for same issue';
      // 2. No payment required: rework cost is ₹0
      updatePayload.previous_total_amount = job.total_amount;
      updatePayload.previous_balance_due = job.balance_due;
      updatePayload.total_amount = 0.00;
      updatePayload.balance_due = 0.00;
      updatePayload.payment_status = 'PAID';
    } else if (isWarrantyClaim) {
      updatePayload.approval_status = 'PENDING';
      updatePayload.warranty_same_issue = false;
    }

    await db.jobs.update(id, updatePayload);

    const statusTitle = isEstimateRejected
      ? `Job Reopened for Revised Estimate (${finalTargetStatus})`
      : isSameIssue
      ? `Job Reopened (Free Warranty Claim #${reopenCount})`
      : isWarrantyClaim
      ? `Job Reopened (Warranty Claim #${reopenCount} - Chargeable)`
      : `Job Reopened (${finalTargetStatus})`;

    const statusNotes = isEstimateRejected
      ? `Job reopened after estimate decline. Target: ${finalTargetStatus}. Notes: ${reason || 'Customer requested revised estimate'}. Staff: ${req.user.full_name || req.user.email}.`
      : `Reason: ${reason || 'Customer reported issue under warranty period'}. Moved to ${finalTargetStatus}. Staff: ${req.user.full_name || req.user.email}.${isSameIssue ? ' Covered under warranty: ₹0 balance, no approval needed.' : ''}${notes ? ` Staff notes: ${notes}` : ''}`;

    await db.jobs.updateStatus(
      id,
      finalTargetStatus,
      statusTitle,
      statusNotes,
      req.user.id
    );

    const updatedJob = await db.jobs.findById(id);

    if (!isEstimateRejected) {
      try {
        const customer = await db.customers.findById(updatedJob.customer_id);
        dispatchNotification({
          job: updatedJob,
          customer,
          type: 'JOB_REOPENED',
          metadata: { clientUrl: extractClientUrl(req) },
        }).catch((notifyErr) => console.warn('Reopen notification ignored:', notifyErr.message));
      } catch (notifyErr) {
        console.warn('Reopen notification error:', notifyErr.message);
      }
    }

    res.json({
      success: true,
      message: isEstimateRejected
        ? `Job #${job.job_number} reopened! You can now revise the estimate and send it to the customer.`
        : isSameIssue
        ? `Job #${job.job_number} reopened under Warranty Claim! Free rework authorized (₹0 balance, pre-approved). Stage set to ${finalTargetStatus}.`
        : isWarrantyClaim
        ? `Job #${job.job_number} reopened under Warranty Claim! Stage set to ${finalTargetStatus}.`
        : `Job #${job.job_number} successfully reopened! Stage set to ${finalTargetStatus}.`,
      data: { job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

export const authorizeWarrantyRework = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_same_issue = true, notes = 'Free warranty rework authorized by shop' } = req.body;

    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    const updatePayload = {
      is_warranty_claim: true,
      warranty_same_issue: is_same_issue,
      warranty_free_rework: is_same_issue,
      warranty_claim_type: is_same_issue ? 'SAME_ISSUE' : 'NEW_ISSUE',
      reopen_notes: notes || job.reopen_notes,
    };

    if (is_same_issue) {
      updatePayload.approval_status = 'APPROVED';
      updatePayload.approval_decision_at = new Date().toISOString();
      updatePayload.approval_notes = 'Pre-authorized under warranty: Free rework for same issue';
      updatePayload.previous_total_amount = job.previous_total_amount || job.total_amount;
      updatePayload.previous_balance_due = job.previous_balance_due || job.balance_due;
      updatePayload.total_amount = 0.00;
      updatePayload.balance_due = 0.00;
      updatePayload.payment_status = 'PAID';
    } else {
      updatePayload.approval_status = 'PENDING';
    }

    await db.jobs.update(id, updatePayload);

    await db.jobs.updateStatus(
      id,
      job.status,
      is_same_issue ? 'Warranty Rework Authorized (Free - Same Issue)' : 'Warranty Settings Updated',
      `Shop staff ${req.user.full_name}: ${notes}. ${is_same_issue ? 'Pre-authorized under warranty. No customer approval or payment required (₹0 balance due).' : 'New issue: requires customer approval.'}`,
      req.user.id
    );

    const updatedJob = await db.jobs.findById(id);
    res.json({
      success: true,
      message: is_same_issue
        ? `Job #${job.job_number} authorized as Free Warranty Rework! Customer approval and payment set to ₹0.`
        : `Job #${job.job_number} warranty status updated.`,
      data: { job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

export const updateJobStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, send_notification = false } = req.body;

    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    const validStatuses = [
      'RECEIVED',
      'DIAGNOSING',
      'ESTIMATE_SENT',
      'APPROVED',
      'REJECTED',
      'IN_PROGRESS',
      'TESTING',
      'READY_FOR_PICKUP',
      'DELIVERED',
      'CANCELLED',
    ];

    if (!status || !validStatuses.includes(status)) {
      throw new AppError(
        `Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}`,
        400,
        'INVALID_STATUS'
      );
    }

    if (job.status === 'DELIVERED') {
      throw new AppError(
        'Device has already been delivered. Status cannot be changed directly. To process a warranty claim or return, please click "Reopen Job".',
        400,
        'DELIVERED_STATUS_LOCKED'
      );
    }

    if (status === job.status) {
      return res.json({
        success: true,
        message: `Job #${job.job_number} is already in ${status} status.`,
        data: { job },
      });
    }

    const actionTitle = `Status Changed to ${status} (Owner Override)`;
    const actionNotes = notes?.trim()
      ? `Status changed from ${job.status} to ${status}. Notes: ${notes.trim()} (Staff: ${req.user.full_name || 'Owner'}).`
      : `Status changed from ${job.status} to ${status} by ${req.user.full_name || 'Shop Owner'}.`;

    const jobUpdates = {};

    if (status === 'DELIVERED') {
      jobUpdates.delivered_at = new Date().toISOString();
      jobUpdates.delivered_by_user_id = req.user.id;
      jobUpdates.customer_tested_device = true;
      jobUpdates.customer_acceptance_confirmed = true;
    } else if (status === 'REJECTED') {
      jobUpdates.approval_status = 'REJECTED';
      jobUpdates.rejection_reason = notes?.trim() || job.rejection_reason || 'Declined by customer';
      jobUpdates.approval_decision_at = new Date().toISOString();
    } else if (status === 'APPROVED') {
      jobUpdates.approval_status = 'APPROVED';
      jobUpdates.approval_decision_at = new Date().toISOString();
    } else if (['RECEIVED', 'DIAGNOSING', 'IN_PROGRESS', 'TESTING'].includes(status)) {
      if (job.status === 'DELIVERED') {
        jobUpdates.customer_acceptance_confirmed = false;
        jobUpdates.delivered_at = null;
      }
    }

    if (Object.keys(jobUpdates).length > 0) {
      await db.jobs.update(id, jobUpdates);
    }

    await db.jobs.updateStatus(
      id,
      status,
      actionTitle,
      actionNotes,
      req.user.id
    );

    if (status === 'DELIVERED') {
      await db.invoices.createOrUpdateForJob({ jobId: id, userId: req.user.id }).catch(() => {});
    }

    const updatedJob = await db.jobs.findById(id);

    if (send_notification || status === 'REJECTED') {
      try {
        const customer = await db.customers.findById(updatedJob.customer_id);
        const notificationType = status === 'DELIVERED'
          ? (updatedJob.approval_status === 'REJECTED' ? 'DEVICE_RETURNED_UNREPAIRED' : 'INVOICE_GENERATED')
          : status === 'READY_FOR_PICKUP'
          ? 'READY_FOR_PICKUP'
          : status === 'REJECTED'
          ? 'ESTIMATE_REJECTED'
          : 'STATUS_UPDATE';

        dispatchNotification({
          job: updatedJob,
          customer,
          type: notificationType,
          metadata: { clientUrl: extractClientUrl(req) },
        }).catch((notifyErr) => console.warn('Status notification error:', notifyErr.message));
      } catch (err) {
        console.warn('Customer notification failed:', err.message);
      }
    }

    res.json({
      success: true,
      message: `Job #${job.job_number} status successfully updated to ${status}.`,
      data: { job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

export const applyDiscount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { discount_type = 'AMOUNT', discount_value = 0, notes = '' } = req.body;

    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    const isJobClosed = ['DELIVERED', 'CANCELLED'].includes(job.status);
    const isPaymentSettled = (Number(job.balance_due || 0) <= 0 && (Number(job.paid_amount || 0) > 0 || Number(job.total_amount || 0) > 0)) || isJobClosed;
    if (isPaymentSettled) {
      throw new AppError('Payment has already been settled in full. Discounts cannot be modified after settlement.', 400, 'PAYMENT_ALREADY_SETTLED');
    }

    const isPercentage = String(discount_type).toUpperCase() === 'PERCENTAGE';
    const numValue = Math.max(0, parseFloat(discount_value) || 0);

    const estimate = await db.estimates.getByJobId(id);
    let baseSubtotal = 0;
    const taxRate = job.tax_rate !== undefined ? job.tax_rate : (estimate?.tax_rate || 0);

    if (estimate && ((estimate.parts_subtotal || 0) > 0 || (estimate.labor_charge || 0) > 0)) {
      baseSubtotal = (estimate.parts_subtotal || 0) + (estimate.labor_charge || 0);
    } else if (job.subtotal > 0) {
      baseSubtotal = job.subtotal;
    } else {
      baseSubtotal = Math.max(0, (job.total_amount || 0) + (job.discount || 0));
    }

    let parsedDiscount = 0;
    let finalDiscountValue = 0;

    if (isPercentage) {
      const clampedPercent = Math.min(100, numValue);
      parsedDiscount = parseFloat(((baseSubtotal * clampedPercent) / 100).toFixed(2));
      finalDiscountValue = clampedPercent;
    } else {
      parsedDiscount = Math.min(baseSubtotal, numValue);
      finalDiscountValue = numValue;
    }

    const subtotalAfterDiscount = Math.max(0, baseSubtotal - parsedDiscount);
    const taxAmount = parseFloat(((subtotalAfterDiscount * (taxRate || 0)) / 100).toFixed(2));
    const newTotal = parseFloat((subtotalAfterDiscount + taxAmount).toFixed(2));
    const paidAmount = job.paid_amount || 0;
    const newBalanceDue = Math.max(0, parseFloat((newTotal - paidAmount).toFixed(2)));

    // Update job
    await db.jobs.update(id, {
      discount: parsedDiscount,
      discount_type: isPercentage ? 'PERCENTAGE' : 'AMOUNT',
      discount_value: finalDiscountValue,
      subtotal: parseFloat(baseSubtotal.toFixed(2)),
      tax_amount: taxAmount,
      total_amount: newTotal,
      balance_due: newBalanceDue,
      payment_status: newBalanceDue === 0 && paidAmount > 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID'),
    });

    // Update estimate if exists
    if (estimate) {
      await db.estimates.updateDiscount({
        jobId: id,
        discount: parsedDiscount,
        discountType: isPercentage ? 'PERCENTAGE' : 'AMOUNT',
        discountValue: finalDiscountValue,
        taxAmount,
        totalAmount: newTotal,
      });
    }

    // Refresh invoice
    await db.invoices.createOrUpdateForJob({ jobId: id, userId: req.user.id }).catch(() => {});

    // Log history
    await db.jobs.updateStatus(
      id,
      job.status,
      'Discount Applied',
      `Discount updated: ${isPercentage ? `${finalDiscountValue}%` : `₹${finalDiscountValue.toFixed(2)}`} applied. New Total: ₹${newTotal.toFixed(2)}, Balance Due: ₹${newBalanceDue.toFixed(2)}.${notes ? ` (${notes})` : ''}`,
      req.user.id
    );

    const updatedJob = await db.jobs.findById(id);

    res.json({
      success: true,
      message: `Discount successfully applied. New total: ₹${newTotal.toFixed(2)}.`,
      data: { job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};



