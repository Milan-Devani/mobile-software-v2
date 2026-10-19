import { db } from '../db/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { dispatchNotification } from '../services/notificationService.js';

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
        invoice_date: device_data.invoice_date || '',
        invoice_number: device_data.invoice_number || '',
        expiry_date: device_data.expiry_date || '',
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
    const { labor_charge, items, discount, tax_rate, notes, valid_until, send_notification = true } = req.body;

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
      taxRate: tax_rate !== undefined ? tax_rate : 8.25,
      notes: notes || '',
      validUntil: valid_until,
      userId: req.user.id,
    });

    // Move status to ESTIMATE_SENT (or AWAITING_APPROVAL)
    await db.jobs.updateStatus(
      id,
      'ESTIMATE_SENT',
      'Repair Estimate Generated & Sent',
      `Estimate of $${estimate.total_amount.toFixed(2)} prepared (Labor: $${estimate.labor_charge.toFixed(2)}, Parts: $${estimate.parts_subtotal.toFixed(2)}).`,
      req.user.id
    );

    const updatedJob = await db.jobs.findById(id);
    const customer = await db.customers.findById(updatedJob.customer_id);

    if (send_notification) {
      dispatchNotification({
        job: updatedJob,
        customer,
        type: 'ESTIMATE_SENT',
      }).catch(err => console.error('Estimate notification error:', err));
    }

    res.json({
      success: true,
      message: `Estimate of $${estimate.total_amount.toFixed(2)} saved and sent to customer.`,
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
        tax_amount: job.estimate.tax_amount,
        total_amount: job.estimate.total_amount,
        items: (job.estimate.items || []).map(i => ({
          item_name: i.item_name,
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

    if (!['APPROVE', 'REJECT'].includes(decision)) {
      throw new AppError('Decision must be either APPROVE or REJECT.', 400, 'INVALID_DECISION');
    }

    const isApproved = decision === 'APPROVE';
    const newStatus = isApproved ? 'APPROVED' : 'REJECTED';

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

    res.json({
      success: true,
      message: isApproved ? 'Thank you! Your repair authorization has been received.' : 'Repair estimate rejection recorded.',
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

    if (job.status !== 'APPROVED') {
      throw new AppError(`Cannot start repair when status is "${job.status}". Estimate must be APPROVED by customer first.`, 400, 'APPROVAL_REQUIRED');
    }

    // Deduct stock for parts attached to the estimate
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

    await db.jobs.updateStatus(
      id,
      'IN_PROGRESS',
      'Repair In Progress',
      `Technician ${req.user.full_name} commenced hardware repair and replacement.`,
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
    const { customer_tested_device, customer_acceptance_confirmed, customer_signature, delivery_notes, channels = ['EMAIL', 'WHATSAPP', 'SMS'] } = req.body;

    const job = await db.jobs.findById(id);
    if (!job) throw new AppError('Job not found.', 404, 'JOB_NOT_FOUND');

    if (!customer_tested_device || !customer_acceptance_confirmed) {
      throw new AppError('Customer device testing and confirmation are required before handover.', 400, 'CUSTOMER_CONFIRMATION_REQUIRED');
    }

    // Check payment balance
    if (job.balance_due > 0) {
      throw new AppError(`Outstanding balance of $${job.balance_due.toFixed(2)} must be settled before delivering device.`, 400, 'PAYMENT_PENDING');
    }

    await db.jobs.update(id, {
      customer_tested_device: true,
      customer_acceptance_confirmed: true,
      customer_signature: customer_signature || null,
      delivery_notes: delivery_notes || '',
      delivered_at: new Date().toISOString(),
      delivered_by_user_id: req.user.id,
      status: 'DELIVERED',
    });

    await db.jobs.updateStatus(
      id,
      'DELIVERED',
      'Device Delivered to Customer',
      `Customer tested phone and signed confirmation: "Device received and working properly." Handled by staff ${req.user.full_name}.`,
      req.user.id
    );

    // Ensure final invoice is generated
    await db.invoices.createOrUpdateForJob({ jobId: id, userId: req.user.id });

    const updatedJob = await db.jobs.findById(id);
    const customer = await db.customers.findById(updatedJob.customer_id);

    // Automatically send final invoice & receipt via Email (Brevo), WhatsApp, and SMS
    dispatchNotification({
      job: updatedJob,
      customer,
      type: 'INVOICE_GENERATED',
      channels,
    }).catch(err => console.error('Invoice delivery notification error:', err));

    res.json({
      success: true,
      message: 'Job completed and device successfully delivered to customer.',
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
