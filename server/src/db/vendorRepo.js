import { v4 as uuidv4 } from 'uuid';
import { getSupabase, isSupabaseConfigured } from '../config/supabase.js';

/**
 * Vendor Repository Helper Module
 * Provides unified, direct Supabase PostgreSQL data access for Vendors, Transactions,
 * Mobiles, Ledger, Payments, and Reports, with automatic fallback to local memory
 * when Supabase is unconfigured or offline.
 */

export const setupVendorRepo = (getLocalDb, saveLocalDb, supabaseHelpers = {}, getRecycleBin = null, ensureFreshSync = null) => {
  const { safeInsert, safeUpdate, safeDelete, safeUpsert } = supabaseHelpers;

  // Ensure vendor collections exist in in-memory Supabase mirror for fallback
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
    const prefix = 'VND-';
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('vendors')
          .select('vendor_code')
          .order('created_at', { ascending: false })
          .limit(100);
        let highestSeq = 0;
        for (const v of (data || [])) {
          if (v.vendor_code && v.vendor_code.startsWith(prefix)) {
            const num = parseInt(v.vendor_code.replace(prefix, ''), 10) || 0;
            if (num > highestSeq) highestSeq = num;
          }
        }
        return `${prefix}${String(highestSeq + 1).padStart(3, '0')}`;
      } catch (_) {}
    }
    ensureCollections();
    const db = getLocalDb();
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
    const year = new Date().getFullYear();
    let code = 'OUT';
    if (type === 'RECEIVE_FROM_VENDOR') code = 'IN';
    else if (type === 'VENDOR_JOB_INWARD') code = 'JOB';
    else if (type === 'VENDOR_JOB_RETURN') code = 'RET';

    const prefix = `VND-${code}-${year}-`;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('vendor_transactions')
          .select('txn_number')
          .like('txn_number', `${prefix}%`)
          .order('created_at', { ascending: false })
          .limit(100);
        let highestSeq = 0;
        for (const t of (data || [])) {
          if (t.txn_number && t.txn_number.startsWith(prefix)) {
            const num = parseInt(t.txn_number.replace(prefix, ''), 10) || 0;
            if (num > highestSeq) highestSeq = num;
          }
        }
        return `${prefix}${String(highestSeq + 1).padStart(4, '0')}`;
      } catch (_) {}
    }

    ensureCollections();
    const db = getLocalDb();
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
    const year = new Date().getFullYear();
    const prefix = `VND-PAY-${year}-`;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('vendor_payments')
          .select('voucher_no')
          .like('voucher_no', `${prefix}%`)
          .order('created_at', { ascending: false })
          .limit(100);
        let highestSeq = 0;
        for (const p of (data || [])) {
          if (p.voucher_no && p.voucher_no.startsWith(prefix)) {
            const num = parseInt(p.voucher_no.replace(prefix, ''), 10) || 0;
            if (num > highestSeq) highestSeq = num;
          }
        }
        return `${prefix}${String(highestSeq + 1).padStart(4, '0')}`;
      } catch (_) {}
    }

    ensureCollections();
    const db = getLocalDb();
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
  const calculateVendorBalance = async (vendorId) => {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('vendor_ledger')
          .select('credit, debit')
          .eq('vendor_id', vendorId);
        let balance = 0;
        (data || []).forEach((e) => {
          const credit = parseFloat(e.credit) || 0;
          const debit = parseFloat(e.debit) || 0;
          balance += (credit - debit);
        });
        return Math.round(balance * 100) / 100;
      } catch (_) {}
    }

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

  // Cascading Deletion
  const performCascadingVendorDelete = async (ids = [], deletedBy = 'Staff', force = true) => {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const vendorIdSet = new Set(ids);
    const db = getLocalDb();

    let vendorsToDelete = [];
    let associatedMobiles = [];
    let associatedMobileIds = [];

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data: vData } = await supabase.from('vendors').select('*').in('id', ids);
        vendorsToDelete = vData || [];
        const { data: mData } = await supabase.from('vendor_mobiles').select('*').in('vendor_id', ids);
        associatedMobiles = mData || [];
        associatedMobileIds = associatedMobiles.map((m) => m.id);
      } catch (_) {}
    }

    if (vendorsToDelete.length === 0 && db) {
      vendorsToDelete = (db.vendors || []).filter((v) => vendorIdSet.has(v.id));
      associatedMobiles = (db.vendor_mobiles || []).filter((m) => vendorIdSet.has(m.vendor_id));
      associatedMobileIds = associatedMobiles.map((m) => m.id);
    }

    if (vendorsToDelete.length === 0) return 0;

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

    // 1. Archive into Recycle Bin
    try {
      const recycleBin = typeof getRecycleBin === 'function' ? getRecycleBin() : null;
      if (recycleBin && typeof recycleBin.add === 'function') {
        for (const v of vendorsToDelete) {
          const linkedMobiles = associatedMobiles.filter((m) => m.vendor_id === v.id);
          await recycleBin.add({
            entity_type: 'vendor',
            original_id: v.id,
            title: `Vendor: ${v.name} (${v.shop_name || 'Repair Partner'})`,
            subtitle: `Code: ${v.vendor_code} • Phone: ${v.mobile || 'N/A'} • Balance: ₹${v.current_balance || 0}`,
            data: {
              vendor: { ...v },
              mobiles: linkedMobiles,
            },
            deleted_by: deletedBy,
          });
        }
      }
    } catch (recycleErr) {
      console.warn('Recycle bin vendor archive error:', recycleErr);
    }

    // 2. Cascading delete directly in Supabase in exact foreign-key order
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

    // 3. Mirror deletion in localDb memory
    if (db) {
      const mobileIdSet = new Set(associatedMobileIds);
      db.vendor_status_history = (db.vendor_status_history || []).filter((h) => !mobileIdSet.has(h.vendor_mobile_id));
      db.vendor_mobiles = (db.vendor_mobiles || []).filter((m) => !vendorIdSet.has(m.vendor_id));
      db.vendor_ledger = (db.vendor_ledger || []).filter((l) => !vendorIdSet.has(l.vendor_id));
      db.vendor_payments = (db.vendor_payments || []).filter((p) => !vendorIdSet.has(p.vendor_id));
      db.vendor_transactions = (db.vendor_transactions || []).filter((t) => !vendorIdSet.has(t.vendor_id));
      db.vendors = (db.vendors || []).filter((v) => !vendorIdSet.has(v.id));
      saveLocalDb();
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
        if (isSupabaseConfigured()) {
          try {
            const supabase = getSupabase();
            let query = supabase.from('vendors').select('*', { count: 'exact' });

            if (status && status !== 'ALL') {
              query = query.eq('status', status);
            }
            if (startDate) {
              query = query.gte('created_at', startDate.length === 10 ? `${startDate}T00:00:00.000Z` : startDate);
            }
            if (endDate) {
              query = query.lte('created_at', endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate);
            }
            if (search) {
              const q = search.trim();
              query = query.or(
                `name.ilike.%${q}%,shop_name.ilike.%${q}%,mobile.ilike.%${q}%,whatsapp.ilike.%${q}%,email.ilike.%${q}%,specialization.ilike.%${q}%,vendor_code.ilike.%${q}%,gst_number.ilike.%${q}%,address.ilike.%${q}%`
              );
            }

            const isAsc = sortDir === 'asc';
            const orderCol = ['name', 'created_at', 'status', 'vendor_code'].includes(sortBy) ? sortBy : 'created_at';
            query = query.order(orderCol, { ascending: isAsc }).range(offset, offset + limit - 1);

            const { data: vendorRows, count, error } = await query;
            if (error) throw error;

            const vendors = vendorRows || [];
            if (vendors.length === 0) {
              return { vendors: [], total: count || 0 };
            }

            const vendorIds = vendors.map((v) => v.id);

            // Fetch live mobile counts for these vendors in batch
            const { data: mobileRows } = await supabase
              .from('vendor_mobiles')
              .select('id, vendor_id, flow_type, current_status')
              .in('vendor_id', vendorIds);

            // Fetch live ledger entries for these vendors in batch
            const { data: ledgerRows } = await supabase
              .from('vendor_ledger')
              .select('vendor_id, debit, credit')
              .in('vendor_id', vendorIds);

            const mobilesByVendor = {};
            (mobileRows || []).forEach((m) => {
              mobilesByVendor[m.vendor_id] = mobilesByVendor[m.vendor_id] || [];
              mobilesByVendor[m.vendor_id].push(m);
            });

            const balancesByVendor = {};
            (ledgerRows || []).forEach((l) => {
              const cr = parseFloat(l.credit) || 0;
              const db = parseFloat(l.debit) || 0;
              balancesByVendor[l.vendor_id] = (balancesByVendor[l.vendor_id] || 0) + (cr - db);
            });

            const hydrated = vendors.map((v) => {
              const allMobiles = mobilesByVendor[v.id] || [];
              const sentMobiles = allMobiles.filter((m) => m.flow_type === 'SENT_TO_VENDOR');
              const receivedMobiles = sentMobiles.filter((m) => m.current_status === 'RETURNED');
              const pendingWithVendor = sentMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status));

              const b2bInwardMobiles = allMobiles.filter((m) => m.flow_type === 'RECEIVED_FROM_VENDOR');
              const b2bPendingAtShop = b2bInwardMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status));

              const liveBalance = balancesByVendor[v.id] !== undefined
                ? Math.round(balancesByVendor[v.id] * 100) / 100
                : (parseFloat(v.current_balance) || 0);

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

            if (sortBy === 'current_balance') {
              hydrated.sort((a, b) => {
                const valA = parseFloat(a.current_balance) || 0;
                const valB = parseFloat(b.current_balance) || 0;
                return isAsc ? valA - valB : valB - valA;
              });
            }

            return { vendors: hydrated, total: count || hydrated.length };
          } catch (err) {
            console.warn('⚠️ Supabase vendors.list fallback to local:', err.message);
          }
        }

        // Fallback to local memory
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
              (v.email && v.email.toLowerCase().includes(q)) ||
              (v.specialization && v.specialization.toLowerCase().includes(q)) ||
              (v.mobile && v.mobile.includes(q)) ||
              (v.whatsapp && v.whatsapp.includes(q)) ||
              (v.vendor_code && v.vendor_code.toLowerCase().includes(q)) ||
              (v.gst_number && v.gst_number.toLowerCase().includes(q)) ||
              (v.address && v.address.toLowerCase().includes(q))
          );
        }

        const hydrated = list.map((v) => {
          const allMobiles = (db.vendor_mobiles || []).filter((m) => m.vendor_id === v.id);
          const sentMobiles = allMobiles.filter((m) => m.flow_type === 'SENT_TO_VENDOR');
          const receivedMobiles = sentMobiles.filter((m) => m.current_status === 'RETURNED');
          const pendingWithVendor = sentMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status));

          const b2bInwardMobiles = allMobiles.filter((m) => m.flow_type === 'RECEIVED_FROM_VENDOR');
          const b2bPendingAtShop = b2bInwardMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status));

          let balance = 0;
          (db?.vendor_ledger || []).filter((l) => l.vendor_id === v.id).forEach((e) => {
            balance += ((parseFloat(e.credit) || 0) - (parseFloat(e.debit) || 0));
          });

          return {
            ...v,
            current_balance: Math.round(balance * 100) / 100,
            total_mobiles_sent: sentMobiles.length,
            total_mobiles_received: receivedMobiles.length,
            mobiles_currently_at_vendor: pendingWithVendor.length,
            total_b2b_inward: b2bInwardMobiles.length,
            mobiles_currently_at_shop: b2bPendingAtShop.length,
          };
        });

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
        if (isSupabaseConfigured()) {
          try {
            const supabase = getSupabase();
            const { data: vendor, error } = await supabase
              .from('vendors')
              .select('*')
              .or(`id.eq.${id},vendor_code.eq.${id}`)
              .maybeSingle();
            if (error) throw error;
            if (!vendor) return null;

            const { data: allMobiles } = await supabase
              .from('vendor_mobiles')
              .select('*')
              .eq('vendor_id', vendor.id);

            const sentMobiles = (allMobiles || []).filter((m) => m.flow_type === 'SENT_TO_VENDOR');
            const receivedMobiles = sentMobiles.filter((m) => m.current_status === 'RETURNED');
            const pendingWithVendor = sentMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status));

            const b2bInwardMobiles = (allMobiles || []).filter((m) => m.flow_type === 'RECEIVED_FROM_VENDOR');
            const b2bPendingAtShop = b2bInwardMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status));

            const liveBalance = await calculateVendorBalance(vendor.id);

            return {
              ...vendor,
              current_balance: liveBalance,
              total_mobiles_sent: sentMobiles.length,
              total_mobiles_received: receivedMobiles.length,
              mobiles_currently_at_vendor: pendingWithVendor.length,
              total_b2b_inward: b2bInwardMobiles.length,
              mobiles_currently_at_shop: b2bPendingAtShop.length,
            };
          } catch (err) {
            console.warn('⚠️ Supabase vendors.findById fallback to local:', err.message);
          }
        }

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

        let balance = 0;
        (db?.vendor_ledger || []).filter((l) => l.vendor_id === vendor.id).forEach((e) => {
          balance += ((parseFloat(e.credit) || 0) - (parseFloat(e.debit) || 0));
        });

        return {
          ...vendor,
          current_balance: Math.round(balance * 100) / 100,
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

        if (db) {
          db.vendors.push(newVendor);
        }

        let opEntry = null;
        if (openingBal !== 0) {
          opEntry = {
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
          };
          if (db) {
            db.vendor_ledger.push(opEntry);
          }
        }

        saveLocalDb();

        if (safeInsert) {
          await safeInsert('vendors', newVendor);
          if (opEntry) {
            await safeInsert('vendor_ledger', opEntry);
          }
        }

        return newVendor;
      },

      update: async (id, updates) => {
        ensureCollections();
        const db = getLocalDb();
        let updatedRecord = null;

        if (db) {
          const idx = (db.vendors || []).findIndex((v) => v.id === id);
          if (idx !== -1) {
            db.vendors[idx] = {
              ...db.vendors[idx],
              ...updates,
              updated_at: new Date().toISOString(),
            };
            updatedRecord = db.vendors[idx];
            saveLocalDb();
          }
        }

        if (safeUpdate) {
          const res = await safeUpdate('vendors', id, updates);
          if (Array.isArray(res) && res[0]) {
            updatedRecord = res[0];
          }
        }

        return updatedRecord;
      },

      delete: async (id, deletedBy = 'Staff', force = false) => {
        const count = await performCascadingVendorDelete([id], deletedBy, force);
        return count > 0;
      },

      bulkDelete: async (ids = [], deletedBy = 'Staff', force = true) => {
        return await performCascadingVendorDelete(ids, deletedBy, force);
      },

      getStats: async () => {
        if (isSupabaseConfigured()) {
          try {
            const supabase = getSupabase();
            const [
              { data: vendors },
              { data: mobiles },
              { data: ledger }
            ] = await Promise.all([
              supabase.from('vendors').select('id, current_balance'),
              supabase.from('vendor_mobiles').select('id, vendor_id, flow_type, current_status'),
              supabase.from('vendor_ledger').select('vendor_id, debit, credit'),
            ]);

            const vList = vendors || [];
            const mList = mobiles || [];
            const lList = ledger || [];

            const totalVendors = vList.length;

            const sentMobiles = mList.filter((m) => m.flow_type === 'SENT_TO_VENDOR');
            const totalSent = sentMobiles.length;
            const totalReceived = sentMobiles.filter((m) => m.current_status === 'RETURNED').length;
            const currentlyAtVendors = sentMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status)).length;

            const pendingRepairs = mList.filter((m) => ['PENDING', 'IN_REPAIR', 'WAITING_PARTS'].includes(m.current_status)).length;
            const readyForCollection = mList.filter((m) => m.current_status === 'READY_FOR_RETURN' || m.current_status === 'COMPLETED').length;

            const balancesByVendor = {};
            lList.forEach((e) => {
              const cr = parseFloat(e.credit) || 0;
              const db = parseFloat(e.debit) || 0;
              balancesByVendor[e.vendor_id] = (balancesByVendor[e.vendor_id] || 0) + (cr - db);
            });

            let totalPayable = 0;
            let totalReceivable = 0;

            vList.forEach((v) => {
              const bal = balancesByVendor[v.id] !== undefined
                ? Math.round(balancesByVendor[v.id] * 100) / 100
                : (parseFloat(v.current_balance) || 0);
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
          } catch (err) {
            console.warn('⚠️ Supabase vendors.getStats fallback to local:', err.message);
          }
        }

        ensureCollections();
        const db = getLocalDb();
        const vendors = db.vendors || [];
        const mobiles = db.vendor_mobiles || [];

        const totalVendors = vendors.length;
        const sentMobiles = mobiles.filter((m) => m.flow_type === 'SENT_TO_VENDOR');
        const totalSent = sentMobiles.length;
        const totalReceived = sentMobiles.filter((m) => m.current_status === 'RETURNED').length;
        const currentlyAtVendors = sentMobiles.filter((m) => !['RETURNED', 'CANCELLED'].includes(m.current_status)).length;

        const pendingRepairs = mobiles.filter((m) => ['PENDING', 'IN_REPAIR', 'WAITING_PARTS'].includes(m.current_status)).length;
        const readyForCollection = mobiles.filter((m) => m.current_status === 'READY_FOR_RETURN' || m.current_status === 'COMPLETED').length;

        let totalPayable = 0;
        let totalReceivable = 0;

        vendors.forEach((v) => {
          let balance = 0;
          (db?.vendor_ledger || []).filter((l) => l.vendor_id === v.id).forEach((e) => {
            balance += ((parseFloat(e.credit) || 0) - (parseFloat(e.debit) || 0));
          });
          if (balance > 0) totalPayable += balance;
          if (balance < 0) totalReceivable += Math.abs(balance);
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
        if (isSupabaseConfigured()) {
          try {
            const supabase = getSupabase();
            let query = supabase.from('vendor_transactions').select('*', { count: 'exact' });

            if (vendorId) {
              query = query.eq('vendor_id', vendorId);
            }
            if (txnType && txnType !== 'ALL') {
              query = query.eq('txn_type', txnType);
            }
            if (startDate) {
              query = query.gte('txn_date', startDate);
            }
            if (endDate) {
              query = query.lte('txn_date', endDate);
            }
            if (search) {
              const q = search.trim();
              query = query.or(`txn_number.ilike.%${q}%,notes.ilike.%${q}%`);
            }

            const isAsc = sortDir === 'asc';
            const orderCol = ['created_at', 'txn_date', 'total_cost', 'total_mobiles'].includes(sortBy)
              ? sortBy
              : 'created_at';
            query = query.order(orderCol, { ascending: isAsc }).range(offset, offset + limit - 1);

            const { data: txns, count, error } = await query;
            if (error) throw error;

            const tList = txns || [];
            if (tList.length === 0) {
              return { transactions: [], total: count || 0 };
            }

            const vendorIds = Array.from(new Set(tList.map((t) => t.vendor_id).filter(Boolean)));
            const txnIds = tList.map((t) => t.id);

            const [
              { data: vendors },
              { data: mobiles }
            ] = await Promise.all([
              vendorIds.length > 0 ? supabase.from('vendors').select('*').in('id', vendorIds) : Promise.resolve({ data: [] }),
              supabase.from('vendor_mobiles').select('*').or(`send_txn_id.in.(${txnIds.join(',')}),return_txn_id.in.(${txnIds.join(',')})`),
            ]);

            const vendorMap = new Map((vendors || []).map((v) => [v.id, v]));
            const mobilesByTxn = {};
            (mobiles || []).forEach((m) => {
              if (m.send_txn_id) {
                mobilesByTxn[m.send_txn_id] = mobilesByTxn[m.send_txn_id] || [];
                mobilesByTxn[m.send_txn_id].push(m);
              }
              if (m.return_txn_id && m.return_txn_id !== m.send_txn_id) {
                mobilesByTxn[m.return_txn_id] = mobilesByTxn[m.return_txn_id] || [];
                mobilesByTxn[m.return_txn_id].push(m);
              }
            });

            const hydrated = tList.map((t) => {
              const mob = mobilesByTxn[t.id] || [];
              return {
                ...t,
                vendor: vendorMap.get(t.vendor_id) || null,
                mobiles: mob,
                total_mobiles: mob.length || t.total_mobiles || 0,
              };
            });

            return { transactions: hydrated, total: count || hydrated.length };
          } catch (err) {
            console.warn('⚠️ Supabase vendor_transactions.list fallback to local:', err.message);
          }
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
        if (isSupabaseConfigured()) {
          try {
            const supabase = getSupabase();
            const { data: txn, error } = await supabase
              .from('vendor_transactions')
              .select('*')
              .or(`id.eq.${id},txn_number.eq.${id}`)
              .maybeSingle();
            if (error) throw error;
            if (!txn) return null;

            const [
              { data: vendor },
              { data: mobiles }
            ] = await Promise.all([
              txn.vendor_id ? supabase.from('vendors').select('*').eq('id', txn.vendor_id).maybeSingle() : Promise.resolve({ data: null }),
              supabase.from('vendor_mobiles').select('*').or(`send_txn_id.eq.${txn.id},return_txn_id.eq.${txn.id}`),
            ]);

            return {
              ...txn,
              vendor: vendor || null,
              mobiles: mobiles || [],
            };
          } catch (err) {
            console.warn('⚠️ Supabase vendor_transactions.findById fallback to local:', err.message);
          }
        }

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

        let vendor = null;
        if (isSupabaseConfigured()) {
          try {
            const { data } = await getSupabase().from('vendors').select('*').eq('id', vendor_id).maybeSingle();
            vendor = data;
          } catch (_) {}
        }
        if (!vendor && db) {
          vendor = (db.vendors || []).find((v) => v.id === vendor_id);
        }
        if (!vendor) throw new Error('Selected vendor not found.');

        if (!Array.isArray(mobiles) || mobiles.length === 0) {
          throw new Error('Please add at least one mobile to send.');
        }

        const txnId = uuidv4();
        const txnNumber = await generateNextVendorTxnNumber('SEND_TO_VENDOR');
        const dateStr = txn_date || new Date().toISOString().split('T')[0];

        let totalEstCost = 0;
        const createdMobiles = [];
        const historyRecords = [];

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

          createdMobiles.push(mobileRecord);
          if (db) db.vendor_mobiles.push(mobileRecord);

          const hist = {
            id: uuidv4(),
            vendor_mobile_id: mobileId,
            previous_status: null,
            new_status: mobileRecord.current_status,
            changed_by: created_by,
            remarks: `Mobile sent to vendor ${vendor.name} (${vendor.shop_name || 'Lab'}). Problem: ${mobileRecord.repair_problem}`,
            created_at: new Date().toISOString(),
          };
          historyRecords.push(hist);
          if (db) db.vendor_status_history.push(hist);
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

        if (db) db.vendor_transactions.push(masterTxn);

        let paymentRecord = null;
        let ledgerRecord = null;

        if (numPaid > 0) {
          const voucherNo = await generateNextVendorVoucherNumber();
          paymentRecord = {
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
          };
          if (db) db.vendor_payments.push(paymentRecord);

          const currentBal = await calculateVendorBalance(vendor.id);
          ledgerRecord = {
            id: uuidv4(),
            vendor_id: vendor.id,
            date: dateStr,
            entry_type: 'PAYMENT_MADE',
            txn_id: txnId,
            vendor_mobile_id: null,
            debit: numPaid,
            credit: 0,
            amount: numPaid,
            running_balance: currentBal - numPaid,
            payment_mode: payment_mode || 'CASH',
            reference_no: payment_ref || txnNumber,
            description: `Advance payment to vendor (${txnNumber})`,
            created_by,
            created_at: new Date().toISOString(),
          };
          if (db) db.vendor_ledger.push(ledgerRecord);
        }

        saveLocalDb();

        if (safeInsert) {
          await safeInsert('vendor_transactions', masterTxn);
          await safeInsert('vendor_mobiles', createdMobiles);
          if (historyRecords.length > 0) await safeInsert('vendor_status_history', historyRecords);
          if (paymentRecord) await safeInsert('vendor_payments', paymentRecord);
          if (ledgerRecord) await safeInsert('vendor_ledger', ledgerRecord);
        }

        return {
          ...masterTxn,
          vendor,
          mobiles: createdMobiles,
        };
      },

      // Action 2: Receive Mobiles from Vendor (INWARD / RETURN)
      createReceiveTransaction: async ({
        vendor_id,
        txn_date,
        notes = '',
        received_items = [],
        paid_amount = 0,
        payment_mode = 'NONE',
        payment_ref = '',
        created_by = 'Shop Owner',
      }) => {
        ensureCollections();
        const db = getLocalDb();

        let vendor = null;
        if (isSupabaseConfigured()) {
          try {
            const { data } = await getSupabase().from('vendors').select('*').eq('id', vendor_id).maybeSingle();
            vendor = data;
          } catch (_) {}
        }
        if (!vendor && db) {
          vendor = (db.vendors || []).find((v) => v.id === vendor_id);
        }
        if (!vendor) throw new Error('Selected vendor not found.');

        if (!Array.isArray(received_items) || received_items.length === 0) {
          throw new Error('Please select at least one mobile to receive.');
        }

        const txnId = uuidv4();
        const txnNumber = await generateNextVendorTxnNumber('RECEIVE_FROM_VENDOR');
        const dateStr = txn_date || new Date().toISOString().split('T')[0];

        let totalActualCost = 0;
        const updatedMobiles = [];
        const historyRecords = [];

        for (const item of received_items) {
          let existing = null;
          if (isSupabaseConfigured()) {
            try {
              const { data } = await getSupabase().from('vendor_mobiles').select('*').eq('id', item.mobile_id).maybeSingle();
              existing = data;
            } catch (_) {}
          }
          if (!existing && db) {
            existing = (db.vendor_mobiles || []).find((m) => m.id === item.mobile_id);
          }
          if (!existing) continue;

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

          updatedMobiles.push(updatedMobile);

          if (db) {
            const idx = (db.vendor_mobiles || []).findIndex((m) => m.id === item.mobile_id);
            if (idx !== -1) db.vendor_mobiles[idx] = updatedMobile;
          }

          const hist = {
            id: uuidv4(),
            vendor_mobile_id: existing.id,
            previous_status: existing.current_status,
            new_status: newStatus,
            changed_by: created_by,
            remarks: `Received back from ${vendor.name}. Result: ${result}. Actual Charge: ₹${cost}. ${item.remarks || ''}`.trim(),
            created_at: new Date().toISOString(),
          };
          historyRecords.push(hist);
          if (db) db.vendor_status_history.push(hist);
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

        if (db) db.vendor_transactions.push(masterTxn);

        let repairLedger = null;
        if (totalActualCost > 0) {
          repairLedger = {
            id: uuidv4(),
            vendor_id: vendor.id,
            date: dateStr,
            entry_type: 'REPAIR_CHARGE',
            txn_id: txnId,
            vendor_mobile_id: updatedMobiles[0]?.id || null,
            debit: 0,
            credit: totalActualCost,
            amount: totalActualCost,
            running_balance: 0,
            payment_mode: 'NONE',
            reference_no: txnNumber,
            description: `Repair charges for ${updatedMobiles.length} mobile(s) received (${txnNumber})`,
            created_by,
            created_at: new Date().toISOString(),
          };
          if (db) db.vendor_ledger.push(repairLedger);
        }

        let paymentRecord = null;
        let paymentLedger = null;
        if (numPaid > 0) {
          const voucherNo = await generateNextVendorVoucherNumber();
          paymentRecord = {
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
          };
          if (db) db.vendor_payments.push(paymentRecord);

          paymentLedger = {
            id: uuidv4(),
            vendor_id: vendor.id,
            date: dateStr,
            entry_type: 'PAYMENT_MADE',
            txn_id: txnId,
            vendor_mobile_id: null,
            debit: numPaid,
            credit: 0,
            amount: numPaid,
            running_balance: 0,
            payment_mode: payment_mode || 'CASH',
            reference_no: payment_ref || txnNumber,
            description: `Payment to vendor on receive (${txnNumber})`,
            created_by,
            created_at: new Date().toISOString(),
          };
          if (db) db.vendor_ledger.push(paymentLedger);
        }

        saveLocalDb();

        if (safeInsert) {
          await safeInsert('vendor_transactions', masterTxn);
          for (const mob of updatedMobiles) {
            if (safeUpdate) await safeUpdate('vendor_mobiles', mob.id, mob);
          }
          if (historyRecords.length > 0) await safeInsert('vendor_status_history', historyRecords);
          if (repairLedger) await safeInsert('vendor_ledger', repairLedger);
          if (paymentRecord) await safeInsert('vendor_payments', paymentRecord);
          if (paymentLedger) await safeInsert('vendor_ledger', paymentLedger);

          const updatedBal = await calculateVendorBalance(vendor.id);
          if (safeUpdate) await safeUpdate('vendors', vendor.id, { current_balance: updatedBal });
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
        received_amount = 0,
        paid_amount = 0,
        payment_mode = 'NONE',
        payment_ref = '',
        created_by = 'Shop Owner',
      }) => {
        ensureCollections();
        const db = getLocalDb();

        let vendor = null;
        if (isSupabaseConfigured()) {
          try {
            const { data } = await getSupabase().from('vendors').select('*').eq('id', vendor_id).maybeSingle();
            vendor = data;
          } catch (_) {}
        }
        if (!vendor && db) {
          vendor = (db.vendors || []).find((v) => v.id === vendor_id);
        }
        if (!vendor) throw new Error('Selected vendor not found.');

        if (!Array.isArray(mobiles) || mobiles.length === 0) {
          throw new Error('Please add at least one mobile.');
        }

        const txnId = uuidv4();
        const txnNumber = await generateNextVendorTxnNumber('VENDOR_JOB_INWARD');
        const dateStr = txn_date || new Date().toISOString().split('T')[0];

        let totalEstCost = 0;
        const createdMobiles = [];
        const historyRecords = [];

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

          createdMobiles.push(mobileRecord);
          if (db) db.vendor_mobiles.push(mobileRecord);

          const hist = {
            id: uuidv4(),
            vendor_mobile_id: mobileId,
            previous_status: null,
            new_status: 'PENDING',
            changed_by: created_by,
            remarks: `Received handset from vendor ${vendor.name} for repair at our shop.`,
            created_at: new Date().toISOString(),
          };
          historyRecords.push(hist);
          if (db) db.vendor_status_history.push(hist);
        }

        const numReceived = parseFloat(received_amount || paid_amount) || 0;

        const masterTxn = {
          id: txnId,
          txn_number: txnNumber,
          vendor_id: vendor.id,
          txn_type: 'VENDOR_JOB_INWARD',
          txn_date: dateStr,
          total_mobiles: mobiles.length,
          total_cost: totalEstCost,
          paid_amount: numReceived,
          payment_mode: numReceived > 0 ? (payment_mode || 'CASH') : 'NONE',
          payment_ref: payment_ref || '',
          notes,
          parent_txn_id: null,
          created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (db) db.vendor_transactions.push(masterTxn);

        let paymentRecord = null;
        let ledgerRecord = null;

        if (numReceived > 0) {
          const voucherNo = await generateNextVendorVoucherNumber();
          paymentRecord = {
            id: uuidv4(),
            voucher_no: voucherNo,
            vendor_id: vendor.id,
            payment_type: 'PAYMENT_FROM_VENDOR',
            date: dateStr,
            amount: numReceived,
            payment_mode: payment_mode || 'CASH',
            reference_no: payment_ref || txnNumber,
            notes: `Advance payment received from vendor for job inward ${txnNumber}`,
            created_by,
            created_at: new Date().toISOString(),
          };
          if (db) db.vendor_payments.push(paymentRecord);

          const currentBal = await calculateVendorBalance(vendor.id);
          ledgerRecord = {
            id: uuidv4(),
            vendor_id: vendor.id,
            date: dateStr,
            entry_type: 'PAYMENT_RECEIVED',
            txn_id: txnId,
            vendor_mobile_id: null,
            debit: 0,
            credit: numReceived,
            amount: numReceived,
            running_balance: currentBal - numReceived,
            payment_mode: payment_mode || 'CASH',
            reference_no: payment_ref || txnNumber,
            description: `Advance payment received for inward job ${txnNumber}`,
            created_by,
            created_at: new Date().toISOString(),
          };
          if (db) db.vendor_ledger.push(ledgerRecord);
        }

        saveLocalDb();

        if (safeInsert) {
          await safeInsert('vendor_transactions', masterTxn);
          await safeInsert('vendor_mobiles', createdMobiles);
          if (historyRecords.length > 0) await safeInsert('vendor_status_history', historyRecords);
          if (paymentRecord) await safeInsert('vendor_payments', paymentRecord);
          if (ledgerRecord) await safeInsert('vendor_ledger', ledgerRecord);
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
        return_items = [],
        received_amount = 0,
        payment_mode = 'NONE',
        payment_ref = '',
        notes = '',
        created_by = 'Shop Owner',
      }) => {
        ensureCollections();
        const db = getLocalDb();

        let vendor = null;
        if (isSupabaseConfigured()) {
          try {
            const { data } = await getSupabase().from('vendors').select('*').eq('id', vendor_id).maybeSingle();
            vendor = data;
          } catch (_) {}
        }
        if (!vendor && db) {
          vendor = (db.vendors || []).find((v) => v.id === vendor_id);
        }
        if (!vendor) throw new Error('Selected vendor not found.');

        if (!Array.isArray(return_items) || return_items.length === 0) {
          throw new Error('Please select at least one mobile to return.');
        }

        const txnId = uuidv4();
        const txnNumber = await generateNextVendorTxnNumber('VENDOR_JOB_RETURN');
        const dateStr = txn_date || new Date().toISOString().split('T')[0];

        let totalCharges = 0;
        const updatedMobiles = [];
        const historyRecords = [];

        for (const item of return_items) {
          let existing = null;
          if (isSupabaseConfigured()) {
            try {
              const { data } = await getSupabase().from('vendor_mobiles').select('*').eq('id', item.mobile_id).maybeSingle();
              existing = data;
            } catch (_) {}
          }
          if (!existing && db) {
            existing = (db.vendor_mobiles || []).find((m) => m.id === item.mobile_id);
          }
          if (!existing) continue;

          const charge = parseFloat(item.actual_charge) || 0;
          totalCharges += charge;

          const result = item.repair_result || 'REPAIRED';

          const updatedMobile = {
            ...existing,
            return_txn_id: txnId,
            actual_cost: charge,
            repair_result: result,
            current_status: 'RETURNED',
            returned_date: dateStr,
            notes: item.remarks ? `${existing.notes || ''} | ${item.remarks}`.trim() : existing.notes,
            updated_at: new Date().toISOString(),
          };

          updatedMobiles.push(updatedMobile);

          if (db) {
            const idx = (db.vendor_mobiles || []).findIndex((m) => m.id === item.mobile_id);
            if (idx !== -1) db.vendor_mobiles[idx] = updatedMobile;
          }

          const hist = {
            id: uuidv4(),
            vendor_mobile_id: existing.id,
            previous_status: existing.current_status,
            new_status: 'RETURNED',
            changed_by: created_by,
            remarks: `Returned device back to partner vendor ${vendor.name}. Repair Result: ${result}. Our Service Charge: ₹${charge}. ${item.remarks || ''}`.trim(),
            created_at: new Date().toISOString(),
          };
          historyRecords.push(hist);
          if (db) db.vendor_status_history.push(hist);
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

        if (db) db.vendor_transactions.push(masterTxn);

        let repairLedger = null;
        if (totalCharges > 0) {
          repairLedger = {
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
          };
          if (db) db.vendor_ledger.push(repairLedger);
        }

        let paymentRecord = null;
        let paymentLedger = null;
        if (numReceived > 0) {
          const voucherNo = await generateNextVendorVoucherNumber();
          paymentRecord = {
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
          };
          if (db) db.vendor_payments.push(paymentRecord);

          paymentLedger = {
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
          };
          if (db) db.vendor_ledger.push(paymentLedger);
        }

        saveLocalDb();

        if (safeInsert) {
          await safeInsert('vendor_transactions', masterTxn);
          for (const mob of updatedMobiles) {
            if (safeUpdate) await safeUpdate('vendor_mobiles', mob.id, mob);
          }
          if (historyRecords.length > 0) await safeInsert('vendor_status_history', historyRecords);
          if (repairLedger) await safeInsert('vendor_ledger', repairLedger);
          if (paymentRecord) await safeInsert('vendor_payments', paymentRecord);
          if (paymentLedger) await safeInsert('vendor_ledger', paymentLedger);

          const updatedBal = await calculateVendorBalance(vendor.id);
          if (safeUpdate) await safeUpdate('vendors', vendor.id, { current_balance: updatedBal });
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
        if (isSupabaseConfigured()) {
          try {
            const supabase = getSupabase();
            let query = supabase.from('vendor_mobiles').select('*', { count: 'exact' });

            if (vendorId) {
              query = query.eq('vendor_id', vendorId);
            }
            if (flowType && flowType !== 'ALL') {
              if (flowType === 'VENDOR_JOB_INWARD' || flowType === 'RECEIVED_FROM_VENDOR') {
                query = query.in('flow_type', ['RECEIVED_FROM_VENDOR', 'VENDOR_JOB_INWARD']);
              } else {
                query = query.eq('flow_type', flowType);
              }
            }
            if (status && status !== 'ALL') {
              query = query.eq('current_status', status);
            }
            if (paymentStatus && paymentStatus !== 'ALL') {
              query = query.eq('payment_status', paymentStatus);
            }
            if (imei) {
              query = query.ilike('imei', `%${imei.trim()}%`);
            }
            if (startDate) {
              query = query.gte('created_at', startDate.length === 10 ? `${startDate}T00:00:00.000Z` : startDate);
            }
            if (endDate) {
              query = query.lte('created_at', endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate);
            }
            if (search) {
              const q = search.trim();
              query = query.or(`brand.ilike.%${q}%,model.ilike.%${q}%,imei.ilike.%${q}%,customer_name.ilike.%${q}%,repair_problem.ilike.%${q}%`);
            }

            const isAsc = sortDir === 'asc';
            const orderCol = ['created_at', 'sent_date', 'received_date', 'returned_date', 'model', 'brand'].includes(sortBy)
              ? sortBy
              : 'created_at';
            query = query.order(orderCol, { ascending: isAsc }).range(offset, offset + limit - 1);

            const { data: mobiles, count, error } = await query;
            if (error) throw error;

            const mList = mobiles || [];
            if (mList.length === 0) {
              return { mobiles: [], total: count || 0 };
            }

            const vendorIds = Array.from(new Set(mList.map((m) => m.vendor_id).filter(Boolean)));
            const sendTxnIds = Array.from(new Set(mList.map((m) => m.send_txn_id).filter(Boolean)));
            const returnTxnIds = Array.from(new Set(mList.map((m) => m.return_txn_id).filter(Boolean)));
            const allTxnIds = Array.from(new Set([...sendTxnIds, ...returnTxnIds]));

            const [
              { data: vendors },
              { data: txns }
            ] = await Promise.all([
              vendorIds.length > 0 ? supabase.from('vendors').select('*').in('id', vendorIds) : Promise.resolve({ data: [] }),
              allTxnIds.length > 0 ? supabase.from('vendor_transactions').select('*').in('id', allTxnIds) : Promise.resolve({ data: [] }),
            ]);

            const vendorMap = new Map((vendors || []).map((v) => [v.id, v]));
            const txnMap = new Map((txns || []).map((t) => [t.id, t]));

            const hydrated = mList.map((m) => ({
              ...m,
              vendor: vendorMap.get(m.vendor_id) || null,
              send_txn: txnMap.get(m.send_txn_id) || null,
              return_txn: txnMap.get(m.return_txn_id) || null,
            }));

            return { mobiles: hydrated, total: count || hydrated.length };
          } catch (err) {
            console.warn('⚠️ Supabase vendor_mobiles.list fallback to local:', err.message);
          }
        }

        ensureCollections();
        const db = getLocalDb();
        let list = [...(db.vendor_mobiles || [])];

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
        if (isSupabaseConfigured()) {
          try {
            const supabase = getSupabase();
            const { data } = await supabase
              .from('vendor_mobiles')
              .select('*')
              .eq('vendor_id', vendorId)
              .eq('flow_type', 'SENT_TO_VENDOR')
              .not('current_status', 'in', '("RETURNED","CANCELLED")');
            return data || [];
          } catch (_) {}
        }

        ensureCollections();
        const db = getLocalDb();
        return (db.vendor_mobiles || []).filter(
          (m) =>
            m.vendor_id === vendorId &&
            m.flow_type === 'SENT_TO_VENDOR' &&
            !['RETURNED', 'CANCELLED'].includes(m.current_status)
        );
      },

      getPendingAtMyShop: async (vendorId) => {
        if (isSupabaseConfigured()) {
          try {
            const supabase = getSupabase();
            const { data } = await supabase
              .from('vendor_mobiles')
              .select('*')
              .eq('vendor_id', vendorId)
              .eq('flow_type', 'RECEIVED_FROM_VENDOR')
              .not('current_status', 'in', '("RETURNED","CANCELLED")');
            return data || [];
          } catch (_) {}
        }

        ensureCollections();
        const db = getLocalDb();
        return (db.vendor_mobiles || []).filter(
          (m) =>
            m.vendor_id === vendorId &&
            m.flow_type === 'RECEIVED_FROM_VENDOR' &&
            !['RETURNED', 'CANCELLED'].includes(m.current_status)
        );
      },

      findById: async (id) => {
        if (isSupabaseConfigured()) {
          try {
            const supabase = getSupabase();
            const { data: mobile, error } = await supabase
              .from('vendor_mobiles')
              .select('*')
              .eq('id', id)
              .maybeSingle();
            if (error) throw error;
            if (!mobile) return null;

            const [
              { data: vendor },
              { data: sendTxn },
              { data: returnTxn },
              { data: history }
            ] = await Promise.all([
              mobile.vendor_id ? supabase.from('vendors').select('*').eq('id', mobile.vendor_id).maybeSingle() : Promise.resolve({ data: null }),
              mobile.send_txn_id ? supabase.from('vendor_transactions').select('*').eq('id', mobile.send_txn_id).maybeSingle() : Promise.resolve({ data: null }),
              mobile.return_txn_id ? supabase.from('vendor_transactions').select('*').eq('id', mobile.return_txn_id).maybeSingle() : Promise.resolve({ data: null }),
              supabase.from('vendor_status_history').select('*').eq('vendor_mobile_id', mobile.id).order('created_at', { ascending: false })
            ]);

            return {
              ...mobile,
              vendor: vendor || null,
              send_txn: sendTxn || null,
              return_txn: returnTxn || null,
              status_history: history || [],
            };
          } catch (err) {
            console.warn('⚠️ Supabase vendor_mobiles.findById fallback to local:', err.message);
          }
        }

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
        let existing = null;

        if (isSupabaseConfigured()) {
          try {
            const { data } = await getSupabase().from('vendor_mobiles').select('*').eq('id', id).maybeSingle();
            existing = data;
          } catch (_) {}
        }
        if (!existing && db) {
          existing = (db.vendor_mobiles || []).find((m) => m.id === id);
        }
        if (!existing) throw new Error('Mobile record not found.');

        const oldStatus = existing.current_status;
        const updated = {
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

        if (db) {
          const idx = (db.vendor_mobiles || []).findIndex((m) => m.id === id);
          if (idx !== -1) db.vendor_mobiles[idx] = updated;
          db.vendor_status_history.push(historyRecord);
          saveLocalDb();
        }

        if (safeUpdate) {
          await safeUpdate('vendor_mobiles', id, { current_status: newStatus, updated_at: new Date().toISOString() });
        }
        if (safeInsert) {
          await safeInsert('vendor_status_history', historyRecord);
        }

        return {
          mobile: updated,
          history: historyRecord,
        };
      },

      updatePaymentStatus: async (id, paymentStatus, changedBy = 'Shop Owner', remarks = '') => {
        ensureCollections();
        const db = getLocalDb();
        let existing = null;

        if (isSupabaseConfigured()) {
          try {
            const { data } = await getSupabase().from('vendor_mobiles').select('*').eq('id', id).maybeSingle();
            existing = data;
          } catch (_) {}
        }
        if (!existing && db) {
          existing = (db.vendor_mobiles || []).find((m) => m.id === id);
        }
        if (!existing) throw new Error('Mobile record not found.');

        const oldPaymentStatus = existing.payment_status || 'PENDING';
        const updated = {
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

        if (db) {
          const idx = (db.vendor_mobiles || []).findIndex((m) => m.id === id);
          if (idx !== -1) db.vendor_mobiles[idx] = updated;
          db.vendor_status_history.push(historyRecord);
          saveLocalDb();
        }

        if (safeUpdate) {
          await safeUpdate('vendor_mobiles', id, { payment_status: paymentStatus, updated_at: new Date().toISOString() });
        }
        if (safeInsert) {
          await safeInsert('vendor_status_history', historyRecord);
        }

        return {
          mobile: updated,
          history: historyRecord,
        };
      },

      bulkDelete: async (ids = [], deletedBy = 'Staff') => {
        if (!Array.isArray(ids) || ids.length === 0) return 0;
        const idSet = new Set(ids);
        ensureCollections();
        const db = getLocalDb();

        let selected = [];
        if (isSupabaseConfigured()) {
          try {
            const { data } = await getSupabase().from('vendor_mobiles').select('*').in('id', ids);
            selected = data || [];
          } catch (_) {}
        }
        if (selected.length === 0 && db) {
          selected = (db.vendor_mobiles || []).filter((mobile) => idSet.has(mobile.id));
        }
        if (selected.length === 0) return 0;

        // Archive into Recycle Bin
        try {
          const recycleBin = typeof getRecycleBin === 'function' ? getRecycleBin() : null;
          if (recycleBin && typeof recycleBin.add === 'function') {
            for (const m of selected) {
              await recycleBin.add({
                entity_type: 'vendor_mobile',
                original_id: m.id,
                title: `Handset: ${m.brand} ${m.model}`,
                subtitle: `IMEI: ${m.imei || 'N/A'} • Flow: ${m.flow_type === 'SENT_TO_VENDOR' ? 'Dispatched' : 'Received Inward'} • Problem: ${m.repair_problem || 'N/A'}`,
                data: {
                  mobile: { ...m },
                },
                deleted_by: deletedBy,
              });
            }
          }
        } catch (recycleErr) {
          console.warn('Recycle bin vendor mobile archive error:', recycleErr);
        }

        // Delete from Supabase in FK dependency order
        if (safeDelete) {
          try {
            await safeDelete('vendor_status_history', ids, 'vendor_mobile_id');
            await safeDelete('vendor_mobiles', ids, 'id');
          } catch (sbErr) {
            console.warn('Supabase vendor mobile delete notice:', sbErr.message);
          }
        }

        // Mirror in local memory
        if (db) {
          db.vendor_mobiles = (db.vendor_mobiles || []).filter((mobile) => !idSet.has(mobile.id));
          db.vendor_status_history = (db.vendor_status_history || []).filter((history) => !idSet.has(history.vendor_mobile_id));
          (db.vendor_ledger || []).forEach((l) => {
            if (idSet.has(l.vendor_mobile_id)) {
              l.vendor_mobile_id = null;
            }
          });
          saveLocalDb();
        }

        return selected.length;
      },
    },

    // -------------------------------------------------------------
    // VENDOR ACCOUNTING LEDGER & PAYMENTS
    // -------------------------------------------------------------
    vendor_ledger: {
      getVendorStatement: async (vendorId, { startDate = '', endDate = '' } = {}) => {
        let vendor = null;
        let entries = [];

        if (isSupabaseConfigured()) {
          try {
            const supabase = getSupabase();
            const [
              { data: vData },
              { data: lData }
            ] = await Promise.all([
              supabase.from('vendors').select('*').eq('id', vendorId).maybeSingle(),
              supabase.from('vendor_ledger').select('*').eq('vendor_id', vendorId)
            ]);
            vendor = vData;
            entries = lData || [];
          } catch (err) {
            console.warn('⚠️ Supabase getVendorStatement fallback to local:', err.message);
          }
        }

        if (!vendor) {
          ensureCollections();
          const db = getLocalDb();
          vendor = (db.vendors || []).find((v) => v.id === vendorId);
          entries = (db.vendor_ledger || []).filter((l) => l.vendor_id === vendorId);
        }

        if (!vendor) throw new Error('Vendor not found.');

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
        payment_type = 'PAYMENT_TO_VENDOR',
        amount,
        payment_mode = 'CASH',
        reference_no = '',
        notes = '',
        created_by = 'Shop Owner',
        date,
      }) => {
        ensureCollections();
        const db = getLocalDb();

        let vendor = null;
        if (isSupabaseConfigured()) {
          try {
            const { data } = await getSupabase().from('vendors').select('*').eq('id', vendor_id).maybeSingle();
            vendor = data;
          } catch (_) {}
        }
        if (!vendor && db) {
          vendor = (db.vendors || []).find((v) => v.id === vendor_id);
        }
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

        if (db) db.vendor_payments.push(paymentRecord);

        // Ledger Entry
        const isToVendor = payment_type === 'PAYMENT_TO_VENDOR';
        const ledgerRecord = {
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
        };

        if (db) db.vendor_ledger.push(ledgerRecord);
        saveLocalDb();

        if (safeInsert) {
          await safeInsert('vendor_payments', paymentRecord);
          await safeInsert('vendor_ledger', ledgerRecord);
          const updatedBal = await calculateVendorBalance(vendor.id);
          if (safeUpdate) {
            await safeUpdate('vendors', vendor.id, { current_balance: updatedBal });
          }
          vendor.current_balance = updatedBal;
        }

        return {
          ...paymentRecord,
          vendor,
          updated_balance: vendor.current_balance,
        };
      },

      list: async ({ vendorId = '', limit = 50, offset = 0 } = {}) => {
        if (isSupabaseConfigured()) {
          try {
            const supabase = getSupabase();
            let query = supabase.from('vendor_payments').select('*', { count: 'exact' });
            if (vendorId) {
              query = query.eq('vendor_id', vendorId);
            }
            query = query.order('date', { ascending: false }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);

            const { data: payments, count, error } = await query;
            if (error) throw error;

            const pList = payments || [];
            const vendorIds = Array.from(new Set(pList.map((p) => p.vendor_id).filter(Boolean)));
            const { data: vendors } = vendorIds.length > 0
              ? await supabase.from('vendors').select('*').in('id', vendorIds)
              : { data: [] };

            const vendorMap = new Map((vendors || []).map((v) => [v.id, v]));
            const hydrated = pList.map((p) => ({
              ...p,
              vendor: vendorMap.get(p.vendor_id) || null,
            }));

            return { payments: hydrated, total: count || hydrated.length };
          } catch (err) {
            console.warn('⚠️ Supabase vendor_payments.list fallback to local:', err.message);
          }
        }

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
        let mobiles = [];
        let txns = [];
        let payments = [];
        let vendors = [];

        if (isSupabaseConfigured()) {
          try {
            const supabase = getSupabase();
            let mobQuery = supabase.from('vendor_mobiles').select('*');
            let txnQuery = supabase.from('vendor_transactions').select('*');
            let payQuery = supabase.from('vendor_payments').select('*');

            if (vendorId) {
              mobQuery = mobQuery.eq('vendor_id', vendorId);
              txnQuery = txnQuery.eq('vendor_id', vendorId);
              payQuery = payQuery.eq('vendor_id', vendorId);
            }
            if (status && status !== 'ALL') {
              mobQuery = mobQuery.eq('current_status', status);
            }
            if (flowType && flowType !== 'ALL') {
              if (flowType === 'VENDOR_JOB_INWARD' || flowType === 'RECEIVED_FROM_VENDOR') {
                mobQuery = mobQuery.in('flow_type', ['RECEIVED_FROM_VENDOR', 'VENDOR_JOB_INWARD']);
              } else {
                mobQuery = mobQuery.eq('flow_type', flowType);
              }
            }
            if (startDate) {
              mobQuery = mobQuery.gte('created_at', startDate.length === 10 ? `${startDate}T00:00:00.000Z` : startDate);
              txnQuery = txnQuery.gte('txn_date', startDate);
              payQuery = payQuery.gte('date', startDate);
            }
            if (endDate) {
              mobQuery = mobQuery.lte('created_at', endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate);
              txnQuery = txnQuery.lte('txn_date', endDate);
              payQuery = payQuery.lte('date', endDate);
            }

            const [
              { data: mData },
              { data: tData },
              { data: pData },
              { data: vData }
            ] = await Promise.all([
              mobQuery,
              txnQuery,
              payQuery,
              supabase.from('vendors').select('*')
            ]);

            mobiles = mData || [];
            txns = tData || [];
            payments = pData || [];
            vendors = vData || [];
          } catch (err) {
            console.warn('⚠️ Supabase vendor_reports.getSummary fallback to local:', err.message);
          }
        }

        if (mobiles.length === 0 && txns.length === 0 && payments.length === 0) {
          ensureCollections();
          const db = getLocalDb();
          mobiles = [...(db.vendor_mobiles || [])];
          txns = [...(db.vendor_transactions || [])];
          payments = [...(db.vendor_payments || [])];
          vendors = [...(db.vendors || [])];

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
        }

        const vendorMap = new Map(vendors.map((v) => [v.id, v]));
        const hydratedMobiles = mobiles.map((m) => ({
          ...m,
          vendor: vendorMap.get(m.vendor_id) || null,
        }));

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
