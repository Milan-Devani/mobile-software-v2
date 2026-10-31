import { v4 as uuidv4 } from 'uuid';

/**
 * Vendor Repository Helper Module
 * Provides unified data access for Vendors, Transactions, Mobiles, Ledger, Payments, and Reports.
 */

export const setupVendorRepo = (getLocalDb, saveLocalDb, supabaseHelpers = {}) => {
  const { safeInsert, safeUpdate, safeDelete, safeUpsert } = supabaseHelpers;
  // Ensure vendor collections exist in in-memory Supabase mirror
  const ensureCollections = () => {
    const db = getLocalDb();
    if (!db) return;
    db.vendors = db.vendors || [];
    db.vendor_transactions = db.vendor_transactions || [];
    db.vendor_mobiles = db.vendor_mobiles || [];
    db.vendor_status_history = db.vendor_status_history || [];
    db.vendor_ledger = db.vendor_ledger || [];
    db.vendor_payments = db.vendor_payments || [];
  };

  // Next Code & Sequence Generators
  const generateNextVendorCode = async () => {
    ensureCollections();
    const db = getLocalDb();
    const prefix = 'VND-';
    let highestSeq = 0;
    for (const v of (db?.vendors || [])) {
      if (v.vendor_code && v.vendor_code.startsWith(prefix)) {
        const num = parseInt(v.vendor_code.replace(prefix, ''), 10) || 0;
        if (num > highestSeq) highestSeq = num;
      }
    }
    return `${prefix}${String(highestSeq + 1).padStart(3, '0')}`;
  };

  const generateNextVendorTxnNumber = async (type = 'SEND_TO_VENDOR') => {
    ensureCollections();
    const db = getLocalDb();
    const year = new Date().getFullYear();
    let code = 'OUT';
    if (type === 'RECEIVE_FROM_VENDOR') code = 'IN';
    else if (type === 'VENDOR_JOB_INWARD') code = 'JOB';
    else if (type === 'VENDOR_JOB_RETURN') code = 'RET';

    const prefix = `VND-${code}-${year}-`;
    let highestSeq = 0;

    for (const t of (db?.vendor_transactions || [])) {
      if (t.txn_number && t.txn_number.startsWith(prefix)) {
        const num = parseInt(t.txn_number.replace(prefix, ''), 10) || 0;
        if (num > highestSeq) highestSeq = num;
      }
    }
    return `${prefix}${String(highestSeq + 1).padStart(4, '0')}`;
  };

  const generateNextVendorVoucherNumber = async () => {
    ensureCollections();
    const db = getLocalDb();
    const year = new Date().getFullYear();
    const prefix = `VND-PAY-${year}-`;
    let highestSeq = 0;

    for (const p of (db?.vendor_payments || [])) {
      if (p.voucher_no && p.voucher_no.startsWith(prefix)) {
        const num = parseInt(p.voucher_no.replace(prefix, ''), 10) || 0;
        if (num > highestSeq) highestSeq = num;
      }
    }
    return `${prefix}${String(highestSeq + 1).padStart(4, '0')}`;
  };

  // Balance calculation helper
  const calculateVendorBalance = (vendorId) => {
    const db = getLocalDb();
    const entries = (db?.vendor_ledger || []).filter((l) => l.vendor_id === vendorId);
    let balance = 0;
    entries.forEach((e) => {
      const credit = parseFloat(e.credit) || 0;
      const debit = parseFloat(e.debit) || 0;
      balance += (credit - debit);
    });
    return Math.round(balance * 100) / 100;
  };

  // Vendor Methods Object
  const vendorDbMethods = {
    // -------------------------------------------------------------
    // VENDORS MASTER
    // -------------------------------------------------------------
    vendors: {
      list: async ({ search = '', status = 'ALL', startDate = '', endDate = '', limit = 50, offset = 0, sortBy = 'created_at', sortDir = 'desc' } = {}) => {
        ensureCollections();
        const db = getLocalDb();
        let list = [...(db.vendors || [])];

        if (status && status !== 'ALL') {
          list = list.filter((v) => v.status === status);
        }

        if (startDate) {
          const sTime = new Date(`${startDate}T00:00:00.000Z`).getTime();
          list = list.filter((v) => new Date(v.created_at || 0).getTime() >= sTime);
        }

        if (endDate) {
          const eTime = new Date(`${endDate}T23:59:59.999Z`).getTime();
          list = list.filter((v) => new Date(v.created_at || 0).getTime() <= eTime);
        }

        if (search) {
          const q = search.toLowerCase();
          list = list.filter(
            (v) =>
              (v.name && v.name.toLowerCase().includes(q)) ||
              (v.shop_name && v.shop_name.toLowerCase().includes(q)) ||
              (v.mobile && v.mobile.includes(q)) ||
              (v.whatsapp && v.whatsapp.includes(q)) ||
              (v.vendor_code && v.vendor_code.toLowerCase().includes(q)) ||
              (v.gst_number && v.gst_number.toLowerCase().includes(q)) ||
              (v.address && v.address.toLowerCase().includes(q))
          );
        }

        // Hydrate live counts and live balance
        const hydrated = list.map((v) => {
          const allMobiles = (db.vendor_mobiles || []).filter((m) => m.vendor_id === v.id);
          const sentMobiles = allMobiles.filter((m) => m.flow_type === 'SENT_TO_VENDOR');
          const receivedMobiles = sentMobiles.filter((m) => m.current_status === 'RETURNED');
          const pendingWithVendor = sentMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status));

          const b2bInwardMobiles = allMobiles.filter((m) => m.flow_type === 'RECEIVED_FROM_VENDOR');
          const b2bPendingAtShop = b2bInwardMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status));

          const liveBalance = calculateVendorBalance(v.id);

          return {
            ...v,
            current_balance: liveBalance,
            total_mobiles_sent: sentMobiles.length,
            total_mobiles_received: receivedMobiles.length,
            mobiles_currently_at_vendor: pendingWithVendor.length,
            total_b2b_inward: b2bInwardMobiles.length,
            mobiles_currently_at_shop: b2bPendingAtShop.length,
          };
        });

        // Sorting
        hydrated.sort((a, b) => {
          let valA = a[sortBy] ?? '';
          let valB = b[sortBy] ?? '';
          if (sortBy === 'created_at') {
            valA = new Date(a.created_at || 0).getTime();
            valB = new Date(b.created_at || 0).getTime();
          } else if (sortBy === 'current_balance') {
            valA = parseFloat(a.current_balance) || 0;
            valB = parseFloat(b.current_balance) || 0;
          }
          if (sortDir === 'asc') return valA > valB ? 1 : valA < valB ? -1 : 0;
          return valA < valB ? 1 : valA > valB ? -1 : 0;
        });

        const total = hydrated.length;
        const paginated = hydrated.slice(offset, offset + limit);
        return { vendors: paginated, total };
      },

      findById: async (id) => {
        ensureCollections();
        const db = getLocalDb();
        const vendor = (db.vendors || []).find((v) => v.id === id || v.vendor_code === id);
        if (!vendor) return null;

        const allMobiles = (db.vendor_mobiles || []).filter((m) => m.vendor_id === vendor.id);
        const sentMobiles = allMobiles.filter((m) => m.flow_type === 'SENT_TO_VENDOR');
        const receivedMobiles = sentMobiles.filter((m) => m.current_status === 'RETURNED');
        const pendingWithVendor = sentMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status));

        const b2bInwardMobiles = allMobiles.filter((m) => m.flow_type === 'RECEIVED_FROM_VENDOR');
        const b2bPendingAtShop = b2bInwardMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status));

        const liveBalance = calculateVendorBalance(vendor.id);

        return {
          ...vendor,
          current_balance: liveBalance,
          total_mobiles_sent: sentMobiles.length,
          total_mobiles_received: receivedMobiles.length,
          mobiles_currently_at_vendor: pendingWithVendor.length,
          total_b2b_inward: b2bInwardMobiles.length,
          mobiles_currently_at_shop: b2bPendingAtShop.length,
        };
      },

      create: async (data) => {
        ensureCollections();
        const db = getLocalDb();
        const code = data.vendor_code || (await generateNextVendorCode());
        const openingBal = parseFloat(data.opening_balance) || 0;

        const newVendor = {
          id: uuidv4(),
          vendor_code: code,
          name: (data.name || '').trim(),
          shop_name: (data.shop_name || '').trim(),
          mobile: (data.mobile || '').trim(),
          whatsapp: (data.whatsapp || data.mobile || '').trim(),
          address: (data.address || '').trim(),
          gst_number: (data.gst_number || '').trim().toUpperCase(),
          opening_balance: openingBal,
          current_balance: openingBal,
          notes: data.notes || '',
          status: data.status || 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        db.vendors.push(newVendor);

        // Record opening balance in ledger if non-zero
        if (openingBal !== 0) {
          db.vendor_ledger.push({
            id: uuidv4(),
            vendor_id: newVendor.id,
            date: new Date().toISOString().split('T')[0],
            entry_type: 'OPENING_BALANCE',
            txn_id: null,
            vendor_mobile_id: null,
            debit: openingBal < 0 ? Math.abs(openingBal) : 0,
            credit: openingBal > 0 ? openingBal : 0,
            amount: Math.abs(openingBal),
            running_balance: openingBal,
            payment_mode: 'NONE',
            reference_no: 'OPN-BAL',
            description: openingBal > 0 ? 'Opening Balance Payable to Vendor' : 'Opening Balance Receivable from Vendor',
            created_by: 'System',
            created_at: new Date().toISOString(),
          });
        }

        saveLocalDb();

        if (safeInsert) {
          await safeInsert('vendors', newVendor);
          if (openingBal !== 0) {
            const opEntry = (db.vendor_ledger || []).find(l => l.vendor_id === newVendor.id && l.reference_no === 'OPN-BAL');
            if (opEntry) await safeInsert('vendor_ledger', opEntry);
          }
        }

        return newVendor;
      },

      update: async (id, updates) => {
        ensureCollections();
        const db = getLocalDb();
        const idx = (db.vendors || []).findIndex((v) => v.id === id);
        if (idx === -1) return null;

        const existing = db.vendors[idx];
        const updated = {
          ...existing,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        db.vendors[idx] = updated;
        saveLocalDb();
        if (safeUpdate) await safeUpdate('vendors', id, updates);
        return updated;
      },

      delete: async (id) => {
        ensureCollections();
        const db = getLocalDb();
        const idx = (db.vendors || []).findIndex((v) => v.id === id);
        if (idx === -1) return false;

        // Check if there are mobiles currently at vendor
        const activeMobiles = (db.vendor_mobiles || []).filter(
          (m) => m.vendor_id === id && !['RETURNED', 'CANCELLED'].includes(m.current_status)
        );

        if (activeMobiles.length > 0) {
          throw new Error(
            `Cannot delete vendor. There are still ${activeMobiles.length} mobile(s) actively in repair or pending return.`
          );
        }

        db.vendors.splice(idx, 1);
        saveLocalDb();
        if (safeDelete) await safeDelete('vendors', id);
        return true;
      },

      getStats: async () => {
        ensureCollections();
        const db = getLocalDb();
        const vendors = db.vendors || [];
        const mobiles = db.vendor_mobiles || [];

        const totalVendors = vendors.length;

        // Sent Mobiles (Outward)
        const sentMobiles = mobiles.filter((m) => m.flow_type === 'SENT_TO_VENDOR');
        const totalSent = sentMobiles.length;
        const totalReceived = sentMobiles.filter((m) => m.current_status === 'RETURNED').length;
        const currentlyAtVendors = sentMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status)).length;

        // Status Counts
        const pendingRepairs = mobiles.filter((m) => ['PENDING', 'IN_REPAIR', 'WAITING_PARTS'].includes(m.current_status)).length;
        const readyForCollection = mobiles.filter((m) => m.current_status === 'READY_FOR_RETURN' || m.current_status === 'COMPLETED').length;

        // Financial Balances
        let totalPayable = 0;
        let totalReceivable = 0;

        vendors.forEach((v) => {
          const bal = calculateVendorBalance(v.id);
          if (bal > 0) totalPayable += bal;
          if (bal < 0) totalReceivable += Math.abs(bal);
        });

        return {
          total_vendors: totalVendors,
          total_mobiles_sent: totalSent,
          total_mobiles_received: totalReceived,
          mobiles_currently_at_vendors: currentlyAtVendors,
          pending_repair_mobiles: pendingRepairs,
          ready_for_collection: readyForCollection,
          total_vendor_payable: Math.round(totalPayable * 100) / 100,
          total_vendor_receivable: Math.round(totalReceivable * 100) / 100,
        };
      },
    },

    // -------------------------------------------------------------
    // VENDOR TRANSACTIONS (Send / Receive Batches)
    // -------------------------------------------------------------
    vendor_transactions: {
      list: async ({
        search = '',
        vendorId = '',
        txnType = 'ALL',
        startDate = '',
        endDate = '',
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortDir = 'desc',
      } = {}) => {
        ensureCollections();
        const db = getLocalDb();
        let list = [...(db.vendor_transactions || [])];

        if (vendorId) {
          list = list.filter((t) => t.vendor_id === vendorId);
        }

        if (txnType && txnType !== 'ALL') {
          list = list.filter((t) => t.txn_type === txnType);
        }

        if (startDate) {
          list = list.filter((t) => (t.txn_date || t.created_at) >= startDate);
        }

        if (endDate) {
          list = list.filter((t) => (t.txn_date || t.created_at) <= endDate);
        }

        if (search) {
          const q = search.toLowerCase();
          list = list.filter((t) => {
            const v = (db.vendors || []).find((vnd) => vnd.id === t.vendor_id);
            const vendorMatch =
              v &&
              ((v.name && v.name.toLowerCase().includes(q)) ||
                (v.shop_name && v.shop_name.toLowerCase().includes(q)) ||
                (v.vendor_code && v.vendor_code.toLowerCase().includes(q)));
            const numMatch = t.txn_number && t.txn_number.toLowerCase().includes(q);
            const notesMatch = t.notes && t.notes.toLowerCase().includes(q);

            // Also search child mobiles
            const mobMatch = (db.vendor_mobiles || []).some(
              (m) =>
                (m.send_txn_id === t.id || m.return_txn_id === t.id) &&
                ((m.imei && m.imei.toLowerCase().includes(q)) ||
                  (m.model && m.model.toLowerCase().includes(q)) ||
                  (m.brand && m.brand.toLowerCase().includes(q)) ||
                  (m.customer_name && m.customer_name.toLowerCase().includes(q)))
            );

            return vendorMatch || numMatch || notesMatch || mobMatch;
          });
        }

        // Hydrate vendor and child mobiles
        const hydrated = list.map((t) => {
          const vendor = (db.vendors || []).find((v) => v.id === t.vendor_id) || null;
          const mobiles = (db.vendor_mobiles || []).filter(
            (m) => m.send_txn_id === t.id || m.return_txn_id === t.id
          );
          return {
            ...t,
            vendor,
            mobiles,
            total_mobiles: mobiles.length || t.total_mobiles || 0,
          };
        });

        // Sorting
        hydrated.sort((a, b) => {
          let valA = a[sortBy] ?? '';
          let valB = b[sortBy] ?? '';
          if (sortBy === 'created_at' || sortBy === 'txn_date') {
            valA = new Date(a.txn_date || a.created_at || 0).getTime();
            valB = new Date(b.txn_date || b.created_at || 0).getTime();
          } else if (sortBy === 'total_cost') {
            valA = parseFloat(a.total_cost) || 0;
            valB = parseFloat(b.total_cost) || 0;
          }
          if (sortDir === 'asc') return valA > valB ? 1 : valA < valB ? -1 : 0;
          return valA < valB ? 1 : valA > valB ? -1 : 0;
        });

        const total = hydrated.length;
        const paginated = hydrated.slice(offset, offset + limit);
        return { transactions: paginated, total };
      },

      findById: async (id) => {
        ensureCollections();
        const db = getLocalDb();
        const txn = (db.vendor_transactions || []).find((t) => t.id === id || t.txn_number === id);
        if (!txn) return null;

        const vendor = (db.vendors || []).find((v) => v.id === txn.vendor_id) || null;
        const mobiles = (db.vendor_mobiles || []).filter(
          (m) => m.send_txn_id === txn.id || m.return_txn_id === txn.id
        );

        return {
          ...txn,
          vendor,
          mobiles,
        };
      },

      // Action 1: Send Mobiles to Vendor (OUTWARD)
      createSendTransaction: async ({
        vendor_id,
        txn_date,
        notes = '',
        mobiles = [],
        paid_amount = 0,
        payment_mode = 'NONE',
        payment_ref = '',
        created_by = 'Shop Owner',
      }) => {
        ensureCollections();
        const db = getLocalDb();

        const vendor = (db.vendors || []).find((v) => v.id === vendor_id);
        if (!vendor) throw new Error('Selected vendor not found.');

        if (!Array.isArray(mobiles) || mobiles.length === 0) {
          throw new Error('Please add at least one mobile to send.');
        }

        const txnId = uuidv4();
        const txnNumber = await generateNextVendorTxnNumber('SEND_TO_VENDOR');
        const dateStr = txn_date || new Date().toISOString().split('T')[0];

        let totalEstCost = 0;
        const createdMobiles = [];

        for (const mob of mobiles) {
          const estCost = parseFloat(mob.estimated_cost) || 0;
          totalEstCost += estCost;

          const mobileId = uuidv4();
          const mobileRecord = {
            id: mobileId,
            vendor_id: vendor.id,
            send_txn_id: txnId,
            return_txn_id: null,
            flow_type: 'SENT_TO_VENDOR',
            brand: (mob.brand || '').trim(),
            model: (mob.model || '').trim(),
            imei: (mob.imei || mob.serial_number || '').trim(),
            customer_name: (mob.customer_name || '').trim(),
            repair_problem: (mob.repair_problem || '').trim(),
            condition: (mob.condition || '').trim(),
            accessories: (mob.accessories || '').trim(),
            expected_return_date: mob.expected_return_date || null,
            estimated_cost: estCost,
            actual_cost: 0,
            repair_result: 'PENDING',
            current_status: mob.status || 'PENDING',
            sent_date: dateStr,
            received_date: null,
            returned_date: null,
            notes: mob.notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          db.vendor_mobiles.push(mobileRecord);
          createdMobiles.push(mobileRecord);

          // Initial status history log
          db.vendor_status_history.push({
            id: uuidv4(),
            vendor_mobile_id: mobileId,
            previous_status: null,
            new_status: mobileRecord.current_status,
            changed_by: created_by,
            remarks: `Mobile sent to vendor ${vendor.name} (${vendor.shop_name || 'Lab'}). Problem: ${mobileRecord.repair_problem}`,
            created_at: new Date().toISOString(),
          });
        }

        const numPaid = parseFloat(paid_amount) || 0;

        const masterTxn = {
          id: txnId,
          txn_number: txnNumber,
          vendor_id: vendor.id,
          txn_type: 'SEND_TO_VENDOR',
          txn_date: dateStr,
          total_mobiles: mobiles.length,
          total_cost: totalEstCost,
          paid_amount: numPaid,
          payment_mode: payment_mode || 'NONE',
          payment_ref: payment_ref || '',
          notes,
          parent_txn_id: null,
          created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        db.vendor_transactions.push(masterTxn);

        // Record immediate advance payment if any
        if (numPaid > 0) {
          const voucherNo = await generateNextVendorVoucherNumber();
          db.vendor_payments.push({
            id: uuidv4(),
            voucher_no: voucherNo,
            vendor_id: vendor.id,
            payment_type: 'PAYMENT_TO_VENDOR',
            date: dateStr,
            amount: numPaid,
            payment_mode: payment_mode || 'CASH',
            reference_no: payment_ref || txnNumber,
            notes: `Advance payment for batch ${txnNumber}`,
            created_by,
            created_at: new Date().toISOString(),
          });

          db.vendor_ledger.push({
            id: uuidv4(),
            vendor_id: vendor.id,
            date: dateStr,
            entry_type: 'PAYMENT_MADE',
            txn_id: txnId,
            vendor_mobile_id: null,
            debit: numPaid,
            credit: 0,
            amount: numPaid,
            running_balance: calculateVendorBalance(vendor.id) - numPaid,
            payment_mode: payment_mode || 'CASH',
            reference_no: payment_ref || txnNumber,
            description: `Advance payment on Send (${txnNumber})`,
            created_by,
            created_at: new Date().toISOString(),
          });
        }

        saveLocalDb();

        if (safeInsert) {
          await safeInsert('vendor_transactions', masterTxn);
          await safeInsert('vendor_mobiles', createdMobiles);
          const historyForTxn = (db.vendor_status_history || []).filter(h => createdMobiles.some(m => m.id === h.vendor_mobile_id));
          if (historyForTxn.length > 0) await safeInsert('vendor_status_history', historyForTxn);
          if (numPaid > 0) {
            const payEntry = (db.vendor_payments || []).find(p => p.reference_no === txnNumber || (p.notes && p.notes.includes(txnNumber)));
            if (payEntry) await safeInsert('vendor_payments', payEntry);
            const legEntry = (db.vendor_ledger || []).find(l => l.txn_id === txnId);
            if (legEntry) await safeInsert('vendor_ledger', legEntry);
          }
        }

        return {
          ...masterTxn,
          vendor,
          mobiles: createdMobiles,
        };
      },

      // Action 2: Receive Mobiles from Vendor (INWARD RETURN with Partial Return support!)
      createReceiveTransaction: async ({
        vendor_id,
        txn_date,
        received_items = [], // Array of { mobile_id, actual_cost, repair_result, remarks, warranty }
        paid_amount = 0,
        payment_mode = 'NONE',
        payment_ref = '',
        notes = '',
        created_by = 'Shop Owner',
      }) => {
        ensureCollections();
        const db = getLocalDb();

        const vendor = (db.vendors || []).find((v) => v.id === vendor_id);
        if (!vendor) throw new Error('Selected vendor not found.');

        if (!Array.isArray(received_items) || received_items.length === 0) {
          throw new Error('Please select at least one mobile to receive.');
        }

        const txnId = uuidv4();
        const txnNumber = await generateNextVendorTxnNumber('RECEIVE_FROM_VENDOR');
        const dateStr = txn_date || new Date().toISOString().split('T')[0];

        let totalActualCost = 0;
        const updatedMobiles = [];

        for (const item of received_items) {
          const mobIdx = (db.vendor_mobiles || []).findIndex((m) => m.id === item.mobile_id);
          if (mobIdx === -1) continue;

          const existing = db.vendor_mobiles[mobIdx];
          const cost = parseFloat(item.actual_cost) || 0;
          totalActualCost += cost;

          const result = item.repair_result || 'REPAIRED';
          const newStatus = result === 'NOT_REPAIRED' ? 'NOT_REPAIRABLE' : 'RETURNED';

          const updatedMobile = {
            ...existing,
            return_txn_id: txnId,
            actual_cost: cost,
            repair_result: result,
            current_status: newStatus,
            received_date: dateStr,
            returned_date: dateStr,
            warranty: item.warranty || existing.warranty || '',
            notes: item.remarks ? `${existing.notes || ''} | ${item.remarks}`.trim() : existing.notes,
            updated_at: new Date().toISOString(),
          };

          db.vendor_mobiles[mobIdx] = updatedMobile;
          updatedMobiles.push(updatedMobile);

          // Status history entry
          db.vendor_status_history.push({
            id: uuidv4(),
            vendor_mobile_id: existing.id,
            previous_status: existing.current_status,
            new_status: newStatus,
            changed_by: created_by,
            remarks: `Received back from ${vendor.name}. Result: ${result}. Actual Charge: ₹${cost}. ${item.remarks || ''}`.trim(),
            created_at: new Date().toISOString(),
          });
        }

        const numPaid = parseFloat(paid_amount) || 0;

        const masterTxn = {
          id: txnId,
          txn_number: txnNumber,
          vendor_id: vendor.id,
          txn_type: 'RECEIVE_FROM_VENDOR',
          txn_date: dateStr,
          total_mobiles: updatedMobiles.length,
          total_cost: totalActualCost,
          paid_amount: numPaid,
          payment_mode: payment_mode || 'NONE',
          payment_ref: payment_ref || '',
          notes,
          parent_txn_id: updatedMobiles[0]?.send_txn_id || null,
          created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        db.vendor_transactions.push(masterTxn);

        // Ledger: Post total repair charge as Credit (we owe the vendor)
        if (totalActualCost > 0) {
          db.vendor_ledger.push({
            id: uuidv4(),
            vendor_id: vendor.id,
            date: dateStr,
            entry_type: 'REPAIR_CHARGE',
            txn_id: txnId,
            vendor_mobile_id: updatedMobiles[0]?.id || null,
            debit: 0,
            credit: totalActualCost,
            amount: totalActualCost,
            running_balance: 0, // Recalculated below
            payment_mode: 'NONE',
            reference_no: txnNumber,
            description: `Repair charges for ${updatedMobiles.length} mobile(s) received (${txnNumber})`,
            created_by,
            created_at: new Date().toISOString(),
          });
        }

        // Ledger: Post payment made if any
        if (numPaid > 0) {
          const voucherNo = await generateNextVendorVoucherNumber();
          db.vendor_payments.push({
            id: uuidv4(),
            voucher_no: voucherNo,
            vendor_id: vendor.id,
            payment_type: 'PAYMENT_TO_VENDOR',
            date: dateStr,
            amount: numPaid,
            payment_mode: payment_mode || 'CASH',
            reference_no: payment_ref || txnNumber,
            notes: `Payment on Receive ${txnNumber}`,
            created_by,
            created_at: new Date().toISOString(),
          });

          db.vendor_ledger.push({
            id: uuidv4(),
            vendor_id: vendor.id,
            date: dateStr,
            entry_type: 'PAYMENT_MADE',
            txn_id: txnId,
            vendor_mobile_id: null,
            debit: numPaid,
            credit: 0,
            amount: numPaid,
            running_balance: 0, // Recalculated below
            payment_mode: payment_mode || 'CASH',
            reference_no: payment_ref || txnNumber,
            description: `Payment to vendor on receive (${txnNumber})`,
            created_by,
            created_at: new Date().toISOString(),
          });
        }

        // Recalculate running balance
        const updatedBal = calculateVendorBalance(vendor.id);
        vendor.current_balance = updatedBal;

        saveLocalDb();

        if (safeInsert) {
          await safeInsert('vendor_transactions', masterTxn);
          for (const mob of updatedMobiles) {
            if (safeUpdate) await safeUpdate('vendor_mobiles', mob.id, mob);
          }
          const historyForTxn = (db.vendor_status_history || []).filter(h => updatedMobiles.some(m => m.id === h.vendor_mobile_id));
          if (historyForTxn.length > 0) await safeInsert('vendor_status_history', historyForTxn);
          if (totalActualCost > 0) {
            const repairLedger = (db.vendor_ledger || []).find(l => l.txn_id === txnId && l.entry_type === 'REPAIR_CHARGE');
            if (repairLedger) await safeInsert('vendor_ledger', repairLedger);
          }
          if (numPaid > 0) {
            const payEntry = (db.vendor_payments || []).find(p => p.reference_no === txnNumber || (p.notes && p.notes.includes(txnNumber)));
            if (payEntry) await safeInsert('vendor_payments', payEntry);
            const legEntry = (db.vendor_ledger || []).find(l => l.txn_id === txnId && l.entry_type === 'PAYMENT_MADE');
            if (legEntry) await safeInsert('vendor_ledger', legEntry);
          }
          if (safeUpdate) await safeUpdate('vendors', vendor.id, { current_balance: vendor.current_balance });
        }

        return {
          ...masterTxn,
          vendor,
          mobiles: updatedMobiles,
        };
      },

      // Action 3: Receive New Mobiles from Vendor (B2B Vendor Job - Inward at our shop)
      createVendorJobInward: async ({
        vendor_id,
        txn_date,
        notes = '',
        mobiles = [],
        created_by = 'Shop Owner',
      }) => {
        ensureCollections();
        const db = getLocalDb();

        const vendor = (db.vendors || []).find((v) => v.id === vendor_id);
        if (!vendor) throw new Error('Selected vendor not found.');

        if (!Array.isArray(mobiles) || mobiles.length === 0) {
          throw new Error('Please add at least one mobile.');
        }

        const txnId = uuidv4();
        const txnNumber = await generateNextVendorTxnNumber('VENDOR_JOB_INWARD');
        const dateStr = txn_date || new Date().toISOString().split('T')[0];

        let totalEstCost = 0;
        const createdMobiles = [];

        for (const mob of mobiles) {
          const estCost = parseFloat(mob.estimated_cost) || 0;
          totalEstCost += estCost;

          const mobileId = uuidv4();
          const mobileRecord = {
            id: mobileId,
            vendor_id: vendor.id,
            send_txn_id: txnId,
            return_txn_id: null,
            flow_type: 'RECEIVED_FROM_VENDOR',
            brand: (mob.brand || '').trim(),
            model: (mob.model || '').trim(),
            imei: (mob.imei || mob.serial_number || '').trim(),
            customer_name: (mob.customer_name || vendor.shop_name || vendor.name).trim(),
            repair_problem: (mob.repair_problem || '').trim(),
            condition: (mob.condition || '').trim(),
            accessories: (mob.accessories || '').trim(),
            expected_return_date: mob.expected_return_date || null,
            estimated_cost: estCost,
            actual_cost: 0,
            repair_result: 'PENDING',
            current_status: 'PENDING',
            sent_date: null,
            received_date: dateStr,
            returned_date: null,
            notes: mob.notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          db.vendor_mobiles.push(mobileRecord);
          createdMobiles.push(mobileRecord);

          db.vendor_status_history.push({
            id: uuidv4(),
            vendor_mobile_id: mobileId,
            previous_status: null,
            new_status: 'PENDING',
            changed_by: created_by,
            remarks: `Received handset from vendor ${vendor.name} for repair at our shop.`,
            created_at: new Date().toISOString(),
          });
        }

        const masterTxn = {
          id: txnId,
          txn_number: txnNumber,
          vendor_id: vendor.id,
          txn_type: 'VENDOR_JOB_INWARD',
          txn_date: dateStr,
          total_mobiles: mobiles.length,
          total_cost: totalEstCost,
          paid_amount: 0,
          payment_mode: 'NONE',
          payment_ref: '',
          notes,
          parent_txn_id: null,
          created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        db.vendor_transactions.push(masterTxn);
        saveLocalDb();

        if (safeInsert) {
          await safeInsert('vendor_transactions', masterTxn);
          await safeInsert('vendor_mobiles', createdMobiles);
          const historyForTxn = (db.vendor_status_history || []).filter(h => createdMobiles.some(m => m.id === h.vendor_mobile_id));
          if (historyForTxn.length > 0) await safeInsert('vendor_status_history', historyForTxn);
        }

        return {
          ...masterTxn,
          vendor,
          mobiles: createdMobiles,
        };
      },

      // Action 4: Return B2B Vendor Mobiles back to Vendor
      createVendorJobReturn: async ({
        vendor_id,
        txn_date,
        return_items = [], // Array of { mobile_id, actual_charge, repair_result, remarks }
        received_amount = 0,
        payment_mode = 'NONE',
        payment_ref = '',
        notes = '',
        created_by = 'Shop Owner',
      }) => {
        ensureCollections();
        const db = getLocalDb();

        const vendor = (db.vendors || []).find((v) => v.id === vendor_id);
        if (!vendor) throw new Error('Selected vendor not found.');

        if (!Array.isArray(return_items) || return_items.length === 0) {
          throw new Error('Please select at least one mobile to return.');
        }

        const txnId = uuidv4();
        const txnNumber = await generateNextVendorTxnNumber('VENDOR_JOB_RETURN');
        const dateStr = txn_date || new Date().toISOString().split('T')[0];

        let totalCharges = 0;
        const updatedMobiles = [];

        for (const item of return_items) {
          const mobIdx = (db.vendor_mobiles || []).findIndex((m) => m.id === item.mobile_id);
          if (mobIdx === -1) continue;

          const existing = db.vendor_mobiles[mobIdx];
          const charge = parseFloat(item.actual_charge) || 0;
          totalCharges += charge;

          const result = item.repair_result || 'REPAIRED';
          const newStatus = result === 'NOT_REPAIRED' ? 'NOT_REPAIRABLE' : 'RETURNED';

          const updatedMobile = {
            ...existing,
            return_txn_id: txnId,
            actual_cost: charge,
            repair_result: result,
            current_status: newStatus,
            returned_date: dateStr,
            notes: item.remarks ? `${existing.notes || ''} | ${item.remarks}`.trim() : existing.notes,
            updated_at: new Date().toISOString(),
          };

          db.vendor_mobiles[mobIdx] = updatedMobile;
          updatedMobiles.push(updatedMobile);

          db.vendor_status_history.push({
            id: uuidv4(),
            vendor_mobile_id: existing.id,
            previous_status: existing.current_status,
            new_status: newStatus,
            changed_by: created_by,
            remarks: `Returned repaired device to vendor ${vendor.name}. Repair Charge: ₹${charge}. Result: ${result}`,
            created_at: new Date().toISOString(),
          });
        }

        const numReceived = parseFloat(received_amount) || 0;

        const masterTxn = {
          id: txnId,
          txn_number: txnNumber,
          vendor_id: vendor.id,
          txn_type: 'VENDOR_JOB_RETURN',
          txn_date: dateStr,
          total_mobiles: updatedMobiles.length,
          total_cost: totalCharges,
          paid_amount: numReceived,
          payment_mode: payment_mode || 'NONE',
          payment_ref: payment_ref || '',
          notes,
          parent_txn_id: updatedMobiles[0]?.send_txn_id || null,
          created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        db.vendor_transactions.push(masterTxn);

        // Ledger: Post repair charge as Debit (vendor owes us money)
        if (totalCharges > 0) {
          db.vendor_ledger.push({
            id: uuidv4(),
            vendor_id: vendor.id,
            date: dateStr,
            entry_type: 'REPAIR_CHARGE',
            txn_id: txnId,
            vendor_mobile_id: updatedMobiles[0]?.id || null,
            debit: totalCharges,
            credit: 0,
            amount: totalCharges,
            running_balance: 0,
            payment_mode: 'NONE',
            reference_no: txnNumber,
            description: `Our repair service charges for ${updatedMobiles.length} device(s) returned (${txnNumber})`,
            created_by,
            created_at: new Date().toISOString(),
          });
        }

        // Ledger: Post payment received from vendor if any
        if (numReceived > 0) {
          const voucherNo = await generateNextVendorVoucherNumber();
          db.vendor_payments.push({
            id: uuidv4(),
            voucher_no: voucherNo,
            vendor_id: vendor.id,
            payment_type: 'PAYMENT_FROM_VENDOR',
            date: dateStr,
            amount: numReceived,
            payment_mode: payment_mode || 'CASH',
            reference_no: payment_ref || txnNumber,
            notes: `Payment collected from vendor on return ${txnNumber}`,
            created_by,
            created_at: new Date().toISOString(),
          });

          db.vendor_ledger.push({
            id: uuidv4(),
            vendor_id: vendor.id,
            date: dateStr,
            entry_type: 'PAYMENT_RECEIVED',
            txn_id: txnId,
            vendor_mobile_id: null,
            debit: 0,
            credit: numReceived,
            amount: numReceived,
            running_balance: 0,
            payment_mode: payment_mode || 'CASH',
            reference_no: payment_ref || txnNumber,
            description: `Payment received from vendor (${txnNumber})`,
            created_by,
            created_at: new Date().toISOString(),
          });
        }

        // Recalculate balance
        vendor.current_balance = calculateVendorBalance(vendor.id);
        saveLocalDb();

        if (safeInsert) {
          await safeInsert('vendor_transactions', masterTxn);
          for (const mob of updatedMobiles) {
            if (safeUpdate) await safeUpdate('vendor_mobiles', mob.id, mob);
          }
          const historyForTxn = (db.vendor_status_history || []).filter(h => updatedMobiles.some(m => m.id === h.vendor_mobile_id));
          if (historyForTxn.length > 0) await safeInsert('vendor_status_history', historyForTxn);
          if (totalCharges > 0) {
            const repairLedger = (db.vendor_ledger || []).find(l => l.txn_id === txnId && l.entry_type === 'REPAIR_CHARGE');
            if (repairLedger) await safeInsert('vendor_ledger', repairLedger);
          }
          if (numReceived > 0) {
            const payEntry = (db.vendor_payments || []).find(p => p.reference_no === txnNumber || (p.notes && p.notes.includes(txnNumber)));
            if (payEntry) await safeInsert('vendor_payments', payEntry);
            const legEntry = (db.vendor_ledger || []).find(l => l.txn_id === txnId && l.entry_type === 'PAYMENT_RECEIVED');
            if (legEntry) await safeInsert('vendor_ledger', legEntry);
          }
          if (safeUpdate) await safeUpdate('vendors', vendor.id, { current_balance: vendor.current_balance });
        }

        return {
          ...masterTxn,
          vendor,
          mobiles: updatedMobiles,
        };
      },
    },

    // -------------------------------------------------------------
    // VENDOR MOBILES & STATUS TRACKING
    // -------------------------------------------------------------
    vendor_mobiles: {
      list: async ({
        search = '',
        vendorId = '',
        flowType = 'ALL',
        status = 'ALL',
        imei = '',
        startDate = '',
        endDate = '',
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortDir = 'desc',
      } = {}) => {
        ensureCollections();
        const db = getLocalDb();
        let list = [...(db.vendor_mobiles || [])];

        if (vendorId) {
          list = list.filter((m) => m.vendor_id === vendorId);
        }

        if (flowType && flowType !== 'ALL') {
          list = list.filter((m) => m.flow_type === flowType);
        }

        if (status && status !== 'ALL') {
          list = list.filter((m) => m.current_status === status);
        }

        if (startDate) {
          const sTime = new Date(`${startDate}T00:00:00.000Z`).getTime();
          list = list.filter((m) => {
            const d = new Date(m.sent_date || m.created_at || 0).getTime();
            return d >= sTime;
          });
        }

        if (endDate) {
          const eTime = new Date(`${endDate}T23:59:59.999Z`).getTime();
          list = list.filter((m) => {
            const d = new Date(m.sent_date || m.created_at || 0).getTime();
            return d <= eTime;
          });
        }

        if (imei) {
          const qImei = imei.toLowerCase().trim();
          list = list.filter((m) => m.imei && m.imei.toLowerCase().includes(qImei));
        }

        if (search) {
          const q = search.toLowerCase();
          list = list.filter((m) => {
            const v = (db.vendors || []).find((vnd) => vnd.id === m.vendor_id);
            const vendorMatch = v && (v.name?.toLowerCase().includes(q) || v.shop_name?.toLowerCase().includes(q));
            return (
              (m.brand && m.brand.toLowerCase().includes(q)) ||
              (m.model && m.model.toLowerCase().includes(q)) ||
              (m.imei && m.imei.toLowerCase().includes(q)) ||
              (m.customer_name && m.customer_name.toLowerCase().includes(q)) ||
              (m.repair_problem && m.repair_problem.toLowerCase().includes(q)) ||
              vendorMatch
            );
          });
        }

        // Hydrate vendor and latest txn
        const hydrated = list.map((m) => {
          const vendor = (db.vendors || []).find((v) => v.id === m.vendor_id) || null;
          const sendTxn = (db.vendor_transactions || []).find((t) => t.id === m.send_txn_id) || null;
          const returnTxn = (db.vendor_transactions || []).find((t) => t.id === m.return_txn_id) || null;
          return {
            ...m,
            vendor,
            send_txn: sendTxn,
            return_txn: returnTxn,
          };
        });

        // Sorting
        hydrated.sort((a, b) => {
          let valA = a[sortBy] ?? '';
          let valB = b[sortBy] ?? '';
          if (sortBy === 'created_at' || sortBy === 'sent_date') {
            valA = new Date(a.sent_date || a.created_at || 0).getTime();
            valB = new Date(b.sent_date || b.created_at || 0).getTime();
          }
          if (sortDir === 'asc') return valA > valB ? 1 : valA < valB ? -1 : 0;
          return valA < valB ? 1 : valA > valB ? -1 : 0;
        });

        const total = hydrated.length;
        const paginated = hydrated.slice(offset, offset + limit);
        return { mobiles: paginated, total };
      },

      getPendingWithVendor: async (vendorId) => {
        ensureCollections();
        const db = getLocalDb();
        const mobiles = (db.vendor_mobiles || []).filter(
          (m) =>
            m.vendor_id === vendorId &&
            m.flow_type === 'SENT_TO_VENDOR' &&
            !['RETURNED', 'CANCELLED'].includes(m.current_status)
        );
        return mobiles;
      },

      getPendingAtMyShop: async (vendorId) => {
        ensureCollections();
        const db = getLocalDb();
        const mobiles = (db.vendor_mobiles || []).filter(
          (m) =>
            m.vendor_id === vendorId &&
            m.flow_type === 'RECEIVED_FROM_VENDOR' &&
            !['RETURNED', 'CANCELLED'].includes(m.current_status)
        );
        return mobiles;
      },

      findById: async (id) => {
        ensureCollections();
        const db = getLocalDb();
        const mobile = (db.vendor_mobiles || []).find((m) => m.id === id);
        if (!mobile) return null;

        const vendor = (db.vendors || []).find((v) => v.id === mobile.vendor_id) || null;
        const sendTxn = (db.vendor_transactions || []).find((t) => t.id === mobile.send_txn_id) || null;
        const returnTxn = (db.vendor_transactions || []).find((t) => t.id === mobile.return_txn_id) || null;
        const history = (db.vendor_status_history || [])
          .filter((h) => h.vendor_mobile_id === mobile.id)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return {
          ...mobile,
          vendor,
          send_txn: sendTxn,
          return_txn: returnTxn,
          status_history: history,
        };
      },

      updateStatus: async (id, newStatus, changedBy = 'Shop Owner', remarks = '') => {
        ensureCollections();
        const db = getLocalDb();
        const idx = (db.vendor_mobiles || []).findIndex((m) => m.id === id);
        if (idx === -1) throw new Error('Mobile record not found.');

        const existing = db.vendor_mobiles[idx];
        const oldStatus = existing.current_status;

        db.vendor_mobiles[idx] = {
          ...existing,
          current_status: newStatus,
          updated_at: new Date().toISOString(),
        };

        const historyRecord = {
          id: uuidv4(),
          vendor_mobile_id: id,
          previous_status: oldStatus,
          new_status: newStatus,
          changed_by: changedBy,
          remarks: remarks || `Status changed from ${oldStatus} to ${newStatus}`,
          created_at: new Date().toISOString(),
        };

        db.vendor_status_history.push(historyRecord);
        saveLocalDb();

        if (safeUpdate) {
          await safeUpdate('vendor_mobiles', id, { current_status: newStatus, updated_at: new Date().toISOString() });
        }
        if (safeInsert) {
          await safeInsert('vendor_status_history', historyRecord);
        }

        return {
          mobile: db.vendor_mobiles[idx],
          history: historyRecord,
        };
      },
    },

    // -------------------------------------------------------------
    // VENDOR ACCOUNTING LEDGER & PAYMENTS
    // -------------------------------------------------------------
    vendor_ledger: {
      getVendorStatement: async (vendorId, { startDate = '', endDate = '' } = {}) => {
        ensureCollections();
        const db = getLocalDb();
        const vendor = (db.vendors || []).find((v) => v.id === vendorId);
        if (!vendor) throw new Error('Vendor not found.');

        let entries = (db.vendor_ledger || []).filter((l) => l.vendor_id === vendorId);

        if (startDate) {
          entries = entries.filter((e) => e.date >= startDate);
        }
        if (endDate) {
          entries = entries.filter((e) => e.date <= endDate);
        }

        // Sort chronologically
        entries.sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));

        let runningBal = 0;
        let totalDebit = 0;
        let totalCredit = 0;

        const statementEntries = entries.map((e) => {
          const debit = parseFloat(e.debit) || 0;
          const credit = parseFloat(e.credit) || 0;
          totalDebit += debit;
          totalCredit += credit;
          runningBal += (credit - debit);

          return {
            ...e,
            debit,
            credit,
            running_balance: Math.round(runningBal * 100) / 100,
          };
        });

        return {
          vendor,
          entries: statementEntries,
          total_debit: Math.round(totalDebit * 100) / 100,
          total_credit: Math.round(totalCredit * 100) / 100,
          closing_balance: Math.round(runningBal * 100) / 100,
        };
      },
    },

    vendor_payments: {
      recordPayment: async ({
        vendor_id,
        payment_type = 'PAYMENT_TO_VENDOR', // or 'PAYMENT_FROM_VENDOR'
        amount,
        payment_mode = 'CASH',
        reference_no = '',
        notes = '',
        created_by = 'Shop Owner',
        date,
      }) => {
        ensureCollections();
        const db = getLocalDb();

        const vendor = (db.vendors || []).find((v) => v.id === vendor_id);
        if (!vendor) throw new Error('Vendor not found.');

        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount <= 0) {
          throw new Error('Please enter a valid payment amount greater than zero.');
        }

        const voucherNo = await generateNextVendorVoucherNumber();
        const dateStr = date || new Date().toISOString().split('T')[0];

        const paymentRecord = {
          id: uuidv4(),
          voucher_no: voucherNo,
          vendor_id: vendor.id,
          payment_type,
          date: dateStr,
          amount: numAmount,
          payment_mode,
          reference_no: reference_no || voucherNo,
          notes,
          created_by,
          created_at: new Date().toISOString(),
        };

        db.vendor_payments.push(paymentRecord);

        // Ledger Entry
        const isToVendor = payment_type === 'PAYMENT_TO_VENDOR';
        db.vendor_ledger.push({
          id: uuidv4(),
          vendor_id: vendor.id,
          date: dateStr,
          entry_type: isToVendor ? 'PAYMENT_MADE' : 'PAYMENT_RECEIVED',
          txn_id: null,
          vendor_mobile_id: null,
          debit: isToVendor ? numAmount : 0,
          credit: !isToVendor ? numAmount : 0,
          amount: numAmount,
          running_balance: 0,
          payment_mode,
          reference_no: reference_no || voucherNo,
          description: isToVendor
            ? `Payment made to vendor via ${payment_mode} (${voucherNo})`
            : `Payment received from vendor via ${payment_mode} (${voucherNo})`,
          created_by,
          created_at: new Date().toISOString(),
        });

        // Recalculate vendor balance
        vendor.current_balance = calculateVendorBalance(vendor.id);
        saveLocalDb();

        if (safeInsert) {
          await safeInsert('vendor_payments', paymentRecord);
          const ledgerEntry = (db.vendor_ledger || []).find(l => l.reference_no === (reference_no || voucherNo) && l.amount === numAmount);
          if (ledgerEntry) await safeInsert('vendor_ledger', ledgerEntry);
        }
        if (safeUpdate) {
          await safeUpdate('vendors', vendor.id, { current_balance: vendor.current_balance });
        }

        return {
          ...paymentRecord,
          vendor,
          updated_balance: vendor.current_balance,
        };
      },

      list: async ({ vendorId = '', limit = 50, offset = 0 } = {}) => {
        ensureCollections();
        const db = getLocalDb();
        let list = [...(db.vendor_payments || [])];

        if (vendorId) {
          list = list.filter((p) => p.vendor_id === vendorId);
        }

        list.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

        const hydrated = list.map((p) => {
          const vendor = (db.vendors || []).find((v) => v.id === p.vendor_id) || null;
          return {
            ...p,
            vendor,
          };
        });

        const total = hydrated.length;
        const paginated = hydrated.slice(offset, offset + limit);
        return { payments: paginated, total };
      },
    },

    // -------------------------------------------------------------
    // VENDOR COMPREHENSIVE REPORTS
    // -------------------------------------------------------------
    vendor_reports: {
      getSummary: async ({
        vendorId = '',
        startDate = '',
        endDate = '',
        status = 'ALL',
        flowType = 'ALL',
      } = {}) => {
        ensureCollections();
        const db = getLocalDb();

        let mobiles = [...(db.vendor_mobiles || [])];
        let txns = [...(db.vendor_transactions || [])];
        let payments = [...(db.vendor_payments || [])];

        if (vendorId) {
          mobiles = mobiles.filter((m) => m.vendor_id === vendorId);
          txns = txns.filter((t) => t.vendor_id === vendorId);
          payments = payments.filter((p) => p.vendor_id === vendorId);
        }

        if (status && status !== 'ALL') {
          mobiles = mobiles.filter((m) => m.current_status === status);
        }

        if (flowType && flowType !== 'ALL') {
          mobiles = mobiles.filter((m) => m.flow_type === flowType);
        }

        if (startDate) {
          mobiles = mobiles.filter((m) => (m.sent_date || m.received_date || m.created_at) >= startDate);
          txns = txns.filter((t) => (t.txn_date || t.created_at) >= startDate);
          payments = payments.filter((p) => (p.date || p.created_at) >= startDate);
        }

        if (endDate) {
          mobiles = mobiles.filter((m) => (m.sent_date || m.received_date || m.created_at) <= endDate);
          txns = txns.filter((t) => (t.txn_date || t.created_at) <= endDate);
          payments = payments.filter((p) => (p.date || p.created_at) <= endDate);
        }

        const hydratedMobiles = mobiles.map((m) => {
          const v = (db.vendors || []).find((vnd) => vnd.id === m.vendor_id) || null;
          return { ...m, vendor: v };
        });

        // Totals
        const totalEstimated = mobiles.reduce((acc, m) => acc + (parseFloat(m.estimated_cost) || 0), 0);
        const totalActual = mobiles.reduce((acc, m) => acc + (parseFloat(m.actual_cost) || 0), 0);
        const totalPaidToVendors = payments
          .filter((p) => p.payment_type === 'PAYMENT_TO_VENDOR')
          .reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
        const totalReceivedFromVendors = payments
          .filter((p) => p.payment_type === 'PAYMENT_FROM_VENDOR')
          .reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

        return {
          mobiles: hydratedMobiles,
          transactions: txns,
          payments,
          metrics: {
            total_mobiles: mobiles.length,
            sent_count: mobiles.filter((m) => m.flow_type === 'SENT_TO_VENDOR').length,
            returned_count: mobiles.filter((m) => m.current_status === 'RETURNED').length,
            pending_count: mobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status)).length,
            total_estimated_cost: Math.round(totalEstimated * 100) / 100,
            total_actual_cost: Math.round(totalActual * 100) / 100,
            total_paid_to_vendors: Math.round(totalPaidToVendors * 100) / 100,
            total_received_from_vendors: Math.round(totalReceivedFromVendors * 100) / 100,
          },
        };
      },
    },
  };

  return {
    generateNextVendorCode,
    generateNextVendorTxnNumber,
    generateNextVendorVoucherNumber,
    vendorDbMethods,
  };
};
