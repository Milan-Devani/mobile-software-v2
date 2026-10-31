import {
  db,
  generateNextVendorCode,
  generateNextVendorTxnNumber,
  generateNextVendorVoucherNumber,
} from '../db/db.js';
import { AppError } from '../middleware/errorHandler.js';

// -------------------------------------------------------------
// VENDORS MASTER CONTROLLERS
// -------------------------------------------------------------

export const getVendors = async (req, res, next) => {
  try {
    const { search = '', status = 'ALL', startDate = '', endDate = '', limit = 50, offset = 0, sortBy = 'created_at', sortDir = 'desc' } = req.query;
    const result = await db.vendors.list({
      search,
      status,
      startDate,
      endDate,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      sortBy,
      sortDir,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getVendorStats = async (req, res, next) => {
  try {
    const stats = await db.vendors.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

export const getVendorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendor = await db.vendors.findById(id);
    if (!vendor) throw new AppError('Vendor not found.', 404, 'VENDOR_NOT_FOUND');
    res.json({
      success: true,
      data: { vendor },
    });
  } catch (err) {
    next(err);
  }
};

export const createVendor = async (req, res, next) => {
  try {
    const { name, mobile, shop_name, whatsapp, address, gst_number, opening_balance = 0, notes = '' } = req.body;

    if (!name || !name.trim()) {
      throw new AppError('Vendor Contact Name is required.', 400, 'VALIDATION_ERROR');
    }
    if (!mobile || !mobile.trim()) {
      throw new AppError('Vendor Mobile Number is required.', 400, 'VALIDATION_ERROR');
    }

    const created = await db.vendors.create({
      name,
      mobile,
      shop_name,
      whatsapp,
      address,
      gst_number,
      opening_balance,
      notes,
    });

    res.status(201).json({
      success: true,
      message: `Vendor "${created.name}" registered successfully.`,
      data: { vendor: created },
    });
  } catch (err) {
    next(err);
  }
};

export const updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await db.vendors.update(id, req.body);
    if (!updated) throw new AppError('Vendor not found.', 404, 'VENDOR_NOT_FOUND');

    res.json({
      success: true,
      message: 'Vendor updated successfully.',
      data: { vendor: updated },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.vendors.delete(id);
    res.json({
      success: true,
      message: 'Vendor deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// TRANSACTIONS & MULTI-MOBILE MOVEMENTS
// -------------------------------------------------------------

export const getNextTxnNumber = async (req, res, next) => {
  try {
    const { type = 'SEND_TO_VENDOR' } = req.query;
    const txnNumber = await generateNextVendorTxnNumber(type);
    res.json({
      success: true,
      data: { txnNumber },
    });
  } catch (err) {
    next(err);
  }
};

export const getPendingMobilesWithVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const mobiles = await db.vendor_mobiles.getPendingWithVendor(vendorId);
    res.json({
      success: true,
      data: { mobiles },
    });
  } catch (err) {
    next(err);
  }
};

export const sendMobilesToVendor = async (req, res, next) => {
  try {
    const { vendor_id, txn_date, notes = '', mobiles = [], paid_amount = 0, payment_mode = 'NONE', payment_ref = '' } = req.body;

    if (!vendor_id) throw new AppError('Vendor selection is required.', 400, 'VALIDATION_ERROR');
    if (!Array.isArray(mobiles) || mobiles.length === 0) {
      throw new AppError('At least one mobile must be added to the transaction.', 400, 'VALIDATION_ERROR');
    }

    const result = await db.vendor_transactions.createSendTransaction({
      vendor_id,
      txn_date,
      notes,
      mobiles,
      paid_amount,
      payment_mode,
      payment_ref,
      created_by: req.user?.full_name || 'Shop Staff',
    });

    res.status(201).json({
      success: true,
      message: `Successfully dispatched ${mobiles.length} mobile(s) under Transaction #${result.txn_number}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const receiveMobilesFromVendor = async (req, res, next) => {
  try {
    const {
      vendor_id,
      txn_date,
      received_items = [],
      paid_amount = 0,
      payment_mode = 'NONE',
      payment_ref = '',
      notes = '',
    } = req.body;

    if (!vendor_id) throw new AppError('Vendor selection is required.', 400, 'VALIDATION_ERROR');
    if (!Array.isArray(received_items) || received_items.length === 0) {
      throw new AppError('Please select at least one mobile to receive.', 400, 'VALIDATION_ERROR');
    }

    const result = await db.vendor_transactions.createReceiveTransaction({
      vendor_id,
      txn_date,
      received_items,
      paid_amount,
      payment_mode,
      payment_ref,
      notes,
      created_by: req.user?.full_name || 'Shop Staff',
    });

    res.status(201).json({
      success: true,
      message: `Successfully received ${received_items.length} mobile(s) under Inward Return #${result.txn_number}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const recordVendorJobInward = async (req, res, next) => {
  try {
    const { vendor_id, txn_date, notes = '', mobiles = [] } = req.body;

    if (!vendor_id) throw new AppError('Vendor selection is required.', 400, 'VALIDATION_ERROR');
    if (!Array.isArray(mobiles) || mobiles.length === 0) {
      throw new AppError('Please add at least one mobile.', 400, 'VALIDATION_ERROR');
    }

    const result = await db.vendor_transactions.createVendorJobInward({
      vendor_id,
      txn_date,
      notes,
      mobiles,
      created_by: req.user?.full_name || 'Shop Staff',
    });

    res.status(201).json({
      success: true,
      message: `Logged ${mobiles.length} inward client device(s) from vendor under #${result.txn_number}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const recordVendorJobReturn = async (req, res, next) => {
  try {
    const {
      vendor_id,
      txn_date,
      return_items = [],
      received_amount = 0,
      payment_mode = 'NONE',
      payment_ref = '',
      notes = '',
    } = req.body;

    if (!vendor_id) throw new AppError('Vendor selection is required.', 400, 'VALIDATION_ERROR');
    if (!Array.isArray(return_items) || return_items.length === 0) {
      throw new AppError('Please select at least one mobile to return.', 400, 'VALIDATION_ERROR');
    }

    const result = await db.vendor_transactions.createVendorJobReturn({
      vendor_id,
      txn_date,
      return_items,
      received_amount,
      payment_mode,
      payment_ref,
      notes,
      created_by: req.user?.full_name || 'Shop Staff',
    });

    res.status(201).json({
      success: true,
      message: `Successfully returned ${return_items.length} device(s) to vendor under #${result.txn_number}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getVendorTransactions = async (req, res, next) => {
  try {
    const {
      search = '',
      vendorId = '',
      txnType = 'ALL',
      startDate = '',
      endDate = '',
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortDir = 'desc',
    } = req.query;

    const result = await db.vendor_transactions.list({
      search,
      vendorId,
      txnType,
      startDate,
      endDate,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      sortBy,
      sortDir,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const txn = await db.vendor_transactions.findById(id);
    if (!txn) throw new AppError('Transaction record not found.', 404, 'TXN_NOT_FOUND');
    res.json({
      success: true,
      data: { transaction: txn },
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// VENDOR MOBILES & STATUS TRACKING
// -------------------------------------------------------------

export const getVendorMobiles = async (req, res, next) => {
  try {
    const {
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
    } = req.query;

    const result = await db.vendor_mobiles.list({
      search,
      vendorId,
      flowType,
      status,
      imei,
      startDate,
      endDate,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      sortBy,
      sortDir,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getMobileById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mobile = await db.vendor_mobiles.findById(id);
    if (!mobile) throw new AppError('Mobile record not found.', 404, 'MOBILE_NOT_FOUND');
    res.json({
      success: true,
      data: { mobile },
    });
  } catch (err) {
    next(err);
  }
};

export const updateMobileStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks = '' } = req.body;

    if (!status) throw new AppError('New status is required.', 400, 'VALIDATION_ERROR');

    const result = await db.vendor_mobiles.updateStatus(
      id,
      status,
      req.user?.full_name || 'Shop Staff',
      remarks
    );

    res.json({
      success: true,
      message: `Status updated to ${status}.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// VENDOR ACCOUNTING LEDGER & PAYMENTS
// -------------------------------------------------------------

export const getVendorLedger = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { startDate = '', endDate = '' } = req.query;

    const statement = await db.vendor_ledger.getVendorStatement(vendorId, {
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: statement,
    });
  } catch (err) {
    next(err);
  }
};

export const recordVendorPayment = async (req, res, next) => {
  try {
    const {
      vendor_id,
      payment_type = 'PAYMENT_TO_VENDOR',
      amount,
      payment_mode = 'CASH',
      reference_no = '',
      notes = '',
      date,
    } = req.body;

    if (!vendor_id) throw new AppError('Vendor selection is required.', 400, 'VALIDATION_ERROR');
    if (!amount || parseFloat(amount) <= 0) {
      throw new AppError('Valid payment amount is required.', 400, 'VALIDATION_ERROR');
    }

    const payment = await db.vendor_payments.recordPayment({
      vendor_id,
      payment_type,
      amount,
      payment_mode,
      reference_no,
      notes,
      date,
      created_by: req.user?.full_name || 'Shop Staff',
    });

    res.status(201).json({
      success: true,
      message: `Payment of ₹${amount} recorded under Voucher #${payment.voucher_no}`,
      data: { payment },
    });
  } catch (err) {
    next(err);
  }
};

export const getVendorPayments = async (req, res, next) => {
  try {
    const { vendorId = '', limit = 50, offset = 0 } = req.query;
    const result = await db.vendor_payments.list({
      vendorId,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// VENDOR COMPREHENSIVE REPORTS
// -------------------------------------------------------------

export const getVendorReports = async (req, res, next) => {
  try {
    const {
      vendorId = '',
      startDate = '',
      endDate = '',
      status = 'ALL',
      flowType = 'ALL',
    } = req.query;

    const report = await db.vendor_reports.getSummary({
      vendorId,
      startDate,
      endDate,
      status,
      flowType,
    });

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};
