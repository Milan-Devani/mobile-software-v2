import { v4 as uuidv4 } from 'uuid';

/**
 * Vendor Repository Helper Module
 * Provides unified data access for Vendors, Transactions, Mobiles, Ledger, Payments, and Reports.
 */

export const setupVendorRepo = (getLocalDb, saveLocalDb, supabaseHelpers = {}, getRecycleBin = null, ensureFreshSync = null) => {
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

  // -------------------------------------------------------------
  // PERSISTENT BLACKLIST GUARDS & CASCADING DELETION HELPERS
  // Prevents deleted records from resurrecting when Supabase sync runs
  // -------------------------------------------------------------
  const addToDeletedVendorBlacklist = async (vendorIds = []) => {
    if (!Array.isArray(vendorIds) || vendorIds.length === 0) return;
    const db = getLocalDb();
    if (!db) return;
    db.settings = db.settings || [];
    let setting = db.settings.find((s) => s.key === 'deleted_vendor_ids');
    const existing = Array.isArray(setting?.value) ? setting.value : [];
    const updated = Array.from(new Set([...existing, ...vendorIds]));
    if (setting) {
      setting.value = updated;
      setting.updated_at = new Date().toISOString();
    } else {
      setting = {
        key: 'deleted_vendor_ids',
        value: updated,
        description: 'Blacklist of deleted vendor IDs to prevent resurrection on sync',
        updated_at: new Date().toISOString(),
      };
      db.settings.push(setting);
    }
    saveLocalDb();
    if (safeUpsert) {
      await safeUpsert('settings', setting, 'key');
    }
  };

  const removeFromDeletedVendorBlacklist = async (vendorId) => {
    if (!vendorId) return;
    const db = getLocalDb();
    if (!db) return;
    db.settings = db.settings || [];
    let setting = db.settings.find((s) => s.key === 'deleted_vendor_ids');
    if (setting && Array.isArray(setting.value)) {
      setting.value = setting.value.filter((id) => id !== vendorId);
      setting.updated_at = new Date().toISOString();
      saveLocalDb();
      if (safeUpsert) {
        await safeUpsert('settings', setting, 'key');
      }
    }
  };

  const addToDeletedMobileBlacklist = async (mobileIds = []) => {
    if (!Array.isArray(mobileIds) || mobileIds.length === 0) return;
    const db = getLocalDb();
    if (!db) return;
    db.settings = db.settings || [];
    let setting = db.settings.find((s) => s.key === 'deleted_vendor_mobile_ids');
    const existing = Array.isArray(setting?.value) ? setting.value : [];
    const updated = Array.from(new Set([...existing, ...mobileIds]));
    if (setting) {
      setting.value = updated;
      setting.updated_at = new Date().toISOString();
    } else {
      setting = {
        key: 'deleted_vendor_mobile_ids',
        value: updated,
        description: 'Blacklist of deleted vendor mobile IDs to prevent resurrection on sync',
        updated_at: new Date().toISOString(),
      };
      db.settings.push(setting);
    }
    saveLocalDb();
    if (safeUpsert) {
      await safeUpsert('settings', setting, 'key');
    }
  };

  const performCascadingVendorDelete = async (ids = [], deletedBy = 'Staff', force = true) => {
    ensureCollections();
    const db = getLocalDb();
    if (!Array.isArray(ids) || ids.length === 0) return 0;

    const vendorIdSet = new Set(ids);
    const vendorsToDelete = (db.vendors || []).filter((v) => vendorIdSet.has(v.id));
    if (vendorsToDelete.length === 0) return 0;

    // Find all mobiles for these vendors
    const associatedMobiles = (db.vendor_mobiles || []).filter((m) => vendorIdSet.has(m.vendor_id));
    const associatedMobileIds = associatedMobiles.map((m) => m.id);
    const mobileIdSet = new Set(associatedMobileIds);

    // Active mobiles check if !force
    const activeMobiles = associatedMobiles.filter(
      (m) => !['RETURNED', 'CANCELLED'].includes(m.current_status)
    );
    if (activeMobiles.length > 0 && !force) {
      const err = new Error(
        `Cannot delete vendor(s). There are still ${activeMobiles.length} mobile(s) actively in repair. Please force delete to proceed.`
      );
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    // Archive into Recycle Bin
    try {
      const recycleBin = typeof getRecycleBin === 'function' ? getRecycleBin() : null;
      if (recycleBin && typeof recycleBin.add === 'function') {
        for (const v of vendorsToDelete) {
          const linkedMobiles = associatedMobiles.filter((m) => m.vendor_id === v.id);
          const linkedLedger = (db.vendor_ledger || []).filter((l) => l.vendor_id === v.id);
          const linkedPayments = (db.vendor_payments || []).filter((p) => p.vendor_id === v.id);
          const linkedTxns = (db.vendor_transactions || []).filter((t) => t.vendor_id === v.id);
          await recycleBin.add({
            entity_type: 'vendor',
            original_id: v.id,
            title: `Vendor: ${v.name} (${v.shop_name || 'Repair Partner'})`,
            subtitle: `Code: ${v.vendor_code} • Phone: ${v.mobile || 'N/A'} • Balance: ₹${v.current_balance || 0}`,
            data: {
              vendor: { ...v },
              mobiles: linkedMobiles,
              ledger: linkedLedger,
              payments: linkedPayments,
              transactions: linkedTxns,
            },
            deleted_by: deletedBy,
          });
        }
      }
    } catch (recycleErr) {
      console.warn('Recycle bin vendor archive error:', recycleErr);
    }

    // 1. Clean in-memory collections
    db.vendor_status_history = (db.vendor_status_history || []).filter((h) => !mobileIdSet.has(h.vendor_mobile_id));
    db.vendor_mobiles = (db.vendor_mobiles || []).filter((m) => !vendorIdSet.has(m.vendor_id));
    db.vendor_ledger = (db.vendor_ledger || []).filter((l) => !vendorIdSet.has(l.vendor_id));
    db.vendor_payments = (db.vendor_payments || []).filter((p) => !vendorIdSet.has(p.vendor_id));
    db.vendor_transactions = (db.vendor_transactions || []).filter((t) => !vendorIdSet.has(t.vendor_id));
    db.vendors = (db.vendors || []).filter((v) => !vendorIdSet.has(v.id));

    // 2. Add to persistent blacklist in db.settings (and sync to Supabase settings)
    await addToDeletedVendorBlacklist(ids);
    if (associatedMobileIds.length > 0) {
      await addToDeletedMobileBlacklist(associatedMobileIds);
    }

    saveLocalDb();

    // 3. Cascading delete in Supabase PostgreSQL in exact foreign-key order
    if (safeDelete) {
      try {
        if (associatedMobileIds.length > 0) {
          await safeDelete('vendor_status_history', associatedMobileIds, 'vendor_mobile_id');
          await safeDelete('vendor_mobiles', associatedMobileIds, 'id');
        }
        await safeDelete('vendor_ledger', ids, 'vendor_id');
        await safeDelete('vendor_payments', ids, 'vendor_id');
        await safeDelete('vendor_transactions', ids, 'vendor_id');
        await safeDelete('vendors', ids, 'id');
      } catch (sbErr) {
        console.warn('Supabase vendor cascade delete notice:', sbErr.message);
      }
    }

    return vendorsToDelete.length;
  };

  // Vendor Methods Object
  const vendorDbMethods = {
    // -------------------------------------------------------------
    // VENDORS MASTER
    // -------------------------------------------------------------
    vendors: {
      list: async ({ search = '', status = 'ALL', startDate = '', endDate = '', limit = 50, offset = 0, sortBy = 'created_at', sortDir = 'desc' } = {}) => {
        if (ensureFreshSync) {
          try { await ensureFreshSync(); } catch (_) {}
        }
        ensureCollections();
        const db = getLocalDb();
        let list = [...(db.vendors || [])];

        // Apply deleted blacklist guard
        const delSetting = (db.settings || []).find((s) => s.key === 'deleted_vendor_ids');
        const deletedIds = new Set(Array.isArray(delSetting?.value) ? delSetting.value : []);
        list = list.filter((v) => !deletedIds.has(v.id));

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
              (v.email && v.email.toLowerCase().includes(q)) ||
              (v.specialization && v.specialization.toLowerCase().includes(q)) ||
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
        const delSetting = (db.settings || []).find((s) => s.key === 'deleted_vendor_ids');
        const deletedIds = new Set(Array.isArray(delSetting?.value) ? delSetting.value : []);
        if (deletedIds.has(id)) return null;

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
          email: (data.email || data.mail_id || data.mailid || '').trim(),
          specialization: (data.specialization || data.specialize || '').trim(),
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
        await removeFromDeletedVendorBlacklist(newVendor.id);

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

      delete: async (id, deletedBy = 'Staff', force = false) => {
        const count = await performCascadingVendorDelete([id], deletedBy, force);
        return count > 0;
      },

      bulkDelete: async (ids = [], deletedBy = 'Staff', force = true) => {
        return await performCascadingVendorDelete(ids, deletedBy, force);
      },

      getStats: async () => {
        ensureCollections();
        const db = getLocalDb();
        const delVndSetting = (db.settings || []).find((s) => s.key === 'deleted_vendor_ids');
        const deletedVndIds = new Set(Array.isArray(delVndSetting?.value) ? delVndSetting.value : []);
        const delMobSetting = (db.settings || []).find((s) => s.key === 'deleted_vendor_mobile_ids');
        const deletedMobIds = new Set(Array.isArray(delMobSetting?.value) ? delMobSetting.value : []);

        const vendors = (db.vendors || []).filter((v) => !deletedVndIds.has(v.id));
        const mobiles = (db.vendor_mobiles || []).filter((m) => !deletedMobIds.has(m.id) && !deletedVndIds.has(m.vendor_id));

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
        if (ensureFreshSync) {
          try { await ensureFreshSync(); } catch (_) {}
        }
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
            repair_problem: (mob.repair_problem || mob.why_send || mob.reason || '').trim(),
            condition: (mob.condition || '').trim(),
            accessories: (mob.accessories || '').trim(),
            expected_return_date: mob.expected_return_date || null,
            estimated_cost: estCost,
            actual_cost: 0,
            repair_result: 'PENDING',
            current_status: mob.status || 'PENDING',
            payment_status: mob.payment_status || 'PENDING',
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
            repair_problem: (mob.repair_problem || mob.why_send || mob.reason || '').trim(),
            condition: (mob.condition || '').trim(),
            accessories: (mob.accessories || '').trim(),
            expected_return_date: mob.expected_return_date || null,
            estimated_cost: estCost,
            actual_cost: 0,
            repair_result: 'PENDING',
            current_status: mob.status || 'PENDING',
            payment_status: mob.payment_status || 'PENDING',
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
        paymentStatus = 'ALL',
        imei = '',
        startDate = '',
        endDate = '',
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortDir = 'desc',
      } = {}) => {
        if (ensureFreshSync) {
          try { await ensureFreshSync(); } catch (_) {}
        }
        ensureCollections();
        const db = getLocalDb();
        let list = [...(db.vendor_mobiles || [])];

        // Filter out deleted mobiles and mobiles belonging to deleted vendors
        const delMobSetting = (db.settings || []).find((s) => s.key === 'deleted_vendor_mobile_ids');
        const deletedMobIds = new Set(Array.isArray(delMobSetting?.value) ? delMobSetting.value : []);
        const delVndSetting = (db.settings || []).find((s) => s.key === 'deleted_vendor_ids');
        const deletedVndIds = new Set(Array.isArray(delVndSetting?.value) ? delVndSetting.value : []);
        list = list.filter((m) => !deletedMobIds.has(m.id) && !deletedVndIds.has(m.vendor_id));

        if (vendorId) {
          list = list.filter((m) => m.vendor_id === vendorId);
        }

        if (flowType && flowType !== 'ALL') {
          if (flowType === 'VENDOR_JOB_INWARD' || flowType === 'RECEIVED_FROM_VENDOR') {
            list = list.filter((m) => m.flow_type === 'RECEIVED_FROM_VENDOR' || m.flow_type === 'VENDOR_JOB_INWARD');
          } else {
            list = list.filter((m) => m.flow_type === flowType);
          }
        }

        if (status && status !== 'ALL') {
          list = list.filter((m) => m.current_status === status);
        }

        if (paymentStatus && paymentStatus !== 'ALL') {
          list = list.filter((m) => (m.payment_status || 'PENDING') === paymentStatus);
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
        const delMobSetting = (db.settings || []).find((s) => s.key === 'deleted_vendor_mobile_ids');
        const deletedMobIds = new Set(Array.isArray(delMobSetting?.value) ? delMobSetting.value : []);
        if (deletedMobIds.has(id)) return null;

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

      updatePaymentStatus: async (id, paymentStatus, changedBy = 'Shop Owner', remarks = '') => {
        ensureCollections();
        const db = getLocalDb();
        const idx = (db.vendor_mobiles || []).findIndex((m) => m.id === id);
        if (idx === -1) throw new Error('Mobile record not found.');

        const existing = db.vendor_mobiles[idx];
        const oldPaymentStatus = existing.payment_status || 'PENDING';

        db.vendor_mobiles[idx] = {
          ...existing,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        };

        const historyRecord = {
          id: uuidv4(),
          vendor_mobile_id: id,
          previous_status: oldPaymentStatus,
          new_status: paymentStatus,
          changed_by: changedBy,
          remarks: remarks || `Payment status updated from ${oldPaymentStatus} to ${paymentStatus}`,
          created_at: new Date().toISOString(),
        };

        db.vendor_status_history.push(historyRecord);
        saveLocalDb();

        if (safeUpdate) {
          await safeUpdate('vendor_mobiles', id, { payment_status: paymentStatus, updated_at: new Date().toISOString() });
        }
        if (safeInsert) {
          await safeInsert('vendor_status_history', historyRecord);
        }

        return {
          mobile: db.vendor_mobiles[idx],
          history: historyRecord,
        };
      },

      bulkDelete: async (ids = [], deletedBy = 'Staff') => {
        ensureCollections();
        const db = getLocalDb();
        const idSet = new Set(ids);
        const selected = (db.vendor_mobiles || []).filter((mobile) => idSet.has(mobile.id));
        if (selected.length === 0) return 0;

        // Archive into Recycle Bin
        try {
          const recycleBin = typeof getRecycleBin === 'function' ? getRecycleBin() : null;
          if (recycleBin && typeof recycleBin.add === 'function') {
            for (const m of selected) {
              const vendor = (db.vendors || []).find((v) => v.id === m.vendor_id);
              await recycleBin.add({
                entity_type: 'vendor_mobile',
                original_id: m.id,
                title: `Handset: ${m.brand} ${m.model}`,
                subtitle: `IMEI: ${m.imei || 'N/A'} • Lab: ${vendor?.name || 'Vendor'} • Flow: ${m.flow_type === 'SENT_TO_VENDOR' ? 'Dispatched' : 'Received Inward'} • Problem: ${m.repair_problem || 'N/A'}`,
                data: {
                  mobile: { ...m },
                  history: (db.vendor_status_history || []).filter((h) => h.vendor_mobile_id === m.id),
                },
                deleted_by: deletedBy,
              });
            }
          }
        } catch (recycleErr) {
          console.warn('Recycle bin vendor mobile archive error:', recycleErr);
        }

        db.vendor_mobiles = (db.vendor_mobiles || []).filter((mobile) => !idSet.has(mobile.id));
        db.vendor_status_history = (db.vendor_status_history || []).filter((history) => !idSet.has(history.vendor_mobile_id));
        (db.vendor_ledger || []).forEach((l) => {
          if (idSet.has(l.vendor_mobile_id)) {
            l.vendor_mobile_id = null;
          }
        });

        await addToDeletedMobileBlacklist(ids);
        saveLocalDb();

        if (safeDelete) {
          try {
            await safeDelete('vendor_status_history', Array.from(idSet), 'vendor_mobile_id');
            await safeDelete('vendor_mobiles', Array.from(idSet), 'id');
          } catch (sbErr) {
            console.warn('Supabase vendor mobile delete notice:', sbErr.message);
          }
        }
        return selected.length;
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
          if (flowType === 'VENDOR_JOB_INWARD' || flowType === 'RECEIVED_FROM_VENDOR') {
            mobiles = mobiles.filter((m) => m.flow_type === 'RECEIVED_FROM_VENDOR' || m.flow_type === 'VENDOR_JOB_INWARD');
          } else {
            mobiles = mobiles.filter((m) => m.flow_type === flowType);
          }
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
