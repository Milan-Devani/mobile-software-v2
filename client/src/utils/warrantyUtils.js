/**
 * Utility to extract and synthesize all warranty claim records for a repair job.
 * Handles:
 * - Structured `job.warranty_history` array
 * - Historical `job.history` (job_status_history) records
 * - Fallback to top-level `job.last_warranty_issue` and `job.reopen_count`
 */
export const getAllWarrantyClaims = (job) => {
  if (!job) return [];

  const isWarranty = Boolean(
    job.is_warranty_claim ||
    (job.reopen_count && job.reopen_count > 0) ||
    job.warranty_same_issue ||
    job.warranty_free_rework ||
    (Array.isArray(job.warranty_history) && job.warranty_history.length > 0) ||
    (Array.isArray(job.device_condition?.warranty_history) && job.device_condition.warranty_history.length > 0) ||
    (Array.isArray(job.warranty_parts) && job.warranty_parts.length > 0) ||
    (Array.isArray(job.device_condition?.warranty_parts) && job.device_condition.warranty_parts.length > 0)
  );

  if (!isWarranty) return [];

  const claimsMap = new Map();
  const warrantyDuration = job.warranty_days || 30;

  const rawHistory = (Array.isArray(job.warranty_history) && job.warranty_history.length > 0)
    ? job.warranty_history
    : (Array.isArray(job.device_condition?.warranty_history) ? job.device_condition.warranty_history : []);

  // 1. First, populate from rawHistory if array exists
  if (rawHistory.length > 0) {
    rawHistory.forEach((entry, idx) => {
      if (!entry) return;
      const claimNum = Number(entry.claim_number) || (job.reopen_count ? job.reopen_count - idx : idx + 1);
      claimsMap.set(claimNum, {
        claim_number: claimNum,
        claimed_at: entry.claimed_at || entry.created_at || job.reopened_at || job.updated_at,
        claimed_by_name: entry.claimed_by_name || job.technician?.full_name || 'Staff',
        claim_type: entry.claim_type || (entry.is_free_rework ? 'SAME_ISSUE' : 'NEW_ISSUE'),
        is_free_rework: entry.is_free_rework !== false,
        days_after_delivery: entry.days_after_delivery !== undefined ? entry.days_after_delivery : null,
        warranty_issue:
          entry.warranty_issue ||
          entry.reason ||
          (claimNum === job.reopen_count ? job.last_warranty_issue : '') ||
          'Customer reported issue within warranty coverage period',
        rework_reason:
          entry.rework_reason ||
          entry.warranty_rework_reason ||
          (claimNum === job.reopen_count ? (job.warranty_rework_reason || job.reopen_notes) : '') ||
          'Technical inspection verified failure in previous replacement assembly. Re-servicing and part replacement authorized under free warranty policy.',
        staff_notes: entry.staff_notes || entry.notes || '',
        status: entry.status || (claimNum === job.reopen_count ? 'ACTIVE' : 'COMPLETED'),
      });
    });
  }

  // 2. Scan job.history (job_status_history) to find any historical reopen/warranty claims
  if (Array.isArray(job.history)) {
    job.history.forEach((h) => {
      const title = h.action_title || '';
      const notes = h.notes || '';
      const match = title.match(/Warranty Claim #(\d+)/i) || notes.match(/Warranty Claim #(\d+)/i) || title.match(/Reopen.*#(\d+)/i);
      if (match) {
        const claimNum = parseInt(match[1], 10);
        let warrantyIssue = '';
        let reworkReason = '';

        const issueMatch = notes.match(/Customer Warranty Issue:\s*([^.]+)/i) || notes.match(/Reason:\s*([^.]+)/i);
        if (issueMatch) warrantyIssue = issueMatch[1].trim();

        const reworkMatch = notes.match(/Rework \/ Part Action:\s*([^.]+)/i) || notes.match(/Rework Reason:\s*([^.]+)/i);
        if (reworkMatch) reworkReason = reworkMatch[1].trim();

        if (!warrantyIssue) warrantyIssue = 'Customer reported issue under warranty period';
        if (!reworkReason) reworkReason = 'Free warranty rework / part replacement authorized at ₹0.00';

        const existing = claimsMap.get(claimNum) || {};
        claimsMap.set(claimNum, {
          claim_number: claimNum,
          claimed_at: existing.claimed_at || h.created_at,
          claimed_by_name: existing.claimed_by_name || h.performed_by?.full_name || 'Staff',
          claim_type: title.toLowerCase().includes('chargeable') ? 'NEW_ISSUE' : 'SAME_ISSUE',
          is_free_rework: !title.toLowerCase().includes('chargeable'),
          days_after_delivery: existing.days_after_delivery !== undefined ? existing.days_after_delivery : null,
          warranty_issue: existing.warranty_issue || warrantyIssue,
          rework_reason: existing.rework_reason || reworkReason,
          staff_notes: existing.staff_notes || '',
          status: claimNum === job.reopen_count ? 'ACTIVE' : 'COMPLETED',
        });
      }
    });
  }

  // 3. Ensure all claims up to job.reopen_count exist
  const totalClaims = Math.max(
    Number(job.reopen_count || 0),
    claimsMap.size,
    job.is_warranty_claim ? 1 : 0
  );

  const initialDeliveredDate = job.previous_delivered_at || job.delivered_at;

  for (let c = 1; c <= totalClaims; c++) {
    if (!claimsMap.has(c)) {
      const isLatest = c === totalClaims;
      let days = null;
      const claimDate = isLatest ? (job.reopened_at || job.updated_at) : job.created_at;

      if (initialDeliveredDate && claimDate) {
        const d1 = new Date(initialDeliveredDate).getTime();
        const d2 = new Date(claimDate).getTime();
        if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
          days = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
        }
      }

      claimsMap.set(c, {
        claim_number: c,
        claimed_at: claimDate,
        claimed_by_name: job.technician?.full_name || 'Staff',
        claim_type: job.warranty_claim_type || (job.warranty_same_issue ? 'SAME_ISSUE' : 'NEW_ISSUE'),
        is_free_rework: job.warranty_free_rework !== false,
        days_after_delivery: days,
        warranty_issue: isLatest
          ? (job.last_warranty_issue || 'Customer reported issue under warranty period')
          : `Warranty Claim #${c} - Hardware issue reported within warranty period`,
        rework_reason: isLatest
          ? (job.warranty_rework_reason || job.reopen_notes || 'Technical inspection verified component failure. Free rework / replacement authorized under warranty policy.')
          : `Warranty Claim #${c} - Technical diagnosis & free component rework authorized`,
        staff_notes: isLatest ? (job.reopen_notes || '') : '',
        status: isLatest ? 'ACTIVE' : 'COMPLETED',
      });
    }
  }

  // Calculate days_after_delivery if missing
  claimsMap.forEach((claim) => {
    if ((claim.days_after_delivery === null || claim.days_after_delivery === undefined) && initialDeliveredDate && claim.claimed_at) {
      const d1 = new Date(initialDeliveredDate).getTime();
      const d2 = new Date(claim.claimed_at).getTime();
      if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
        claim.days_after_delivery = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
      }
    }
  });

  // Sort ascending by claim_number (Claim #1, Claim #2, ...)
  return Array.from(claimsMap.values()).sort((a, b) => a.claim_number - b.claim_number);
};

export const formatDateTime = (iso) => {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(iso);
  }
};
