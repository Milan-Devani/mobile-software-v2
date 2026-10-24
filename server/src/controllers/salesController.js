import { db, generateNextSaleInvoiceNumber } from '../db/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { dispatchSaleInvoiceNotification } from '../services/notificationService.js';
import { generateSaleInvoicePdfBuffer } from '../services/pdfService.js';

export const getSales = async (req, res, next) => {
  try {
    const { search, limit = 50, offset = 0, status, sortBy, sortDir } = req.query;
    const result = await db.sales.list({
      search,
      status,
      sortBy,
      sortDir,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      success: true,
      data: {
        sales: result.sales,
        total: result.total,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getNextInvoiceNumber = async (req, res, next) => {
  try {
    const nextSeq = await generateNextSaleInvoiceNumber();
    res.json({
      success: true,
      data: nextSeq,
    });
  } catch (err) {
    next(err);
  }
};

export const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await db.sales.findById(id);
    if (!sale) throw new AppError('Sale invoice not found.', 404, 'SALE_NOT_FOUND');

    const shop = await db.shops.getProfile();

    res.json({
      success: true,
      data: {
        sale,
        shop,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createSale = async (req, res, next) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email = '',
      customer_address = '',
      place_of_supply = 'Gujarat ( 24 )',
      customer_gstin = '',
      items = [],
      gst_enabled = true,
      gst_type = 'IGST', // 'IGST' or 'CGST_SGST'
      gst_rate = 18,
      discount_type = 'amount', // 'amount' or 'percentage'
      discount_value = 0,
      payment_mode = 'CASH',
      invoice_number: customInvoiceNumber,
      invoice_date,
      bank_details,
      terms_conditions,
      notes = '',
    } = req.body;

    if (!customer_name || !customer_phone) {
      throw new AppError('Customer name and phone number are required.', 400, 'VALIDATION_ERROR');
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('At least one product or part must be added to the bill.', 400, 'VALIDATION_ERROR');
    }

    // 1. Link or create customer
    let customer = null;
    try {
      const customersList = await db.customers.list({ search: customer_phone.trim(), limit: 5 });
      const existing = (customersList.customers || []).find(
        (c) => c.phone && c.phone.replace(/\D/g, '') === customer_phone.replace(/\D/g, '')
      );

      if (existing) {
        customer = existing;
      } else {
        customer = await db.customers.create({
          full_name: customer_name.trim(),
          phone: customer_phone.trim(),
          email: customer_email.trim() || null,
          address: customer_address.trim() || null,
          notes: 'Customer created from Sales Billing',
        });
      }
    } catch (_) {
      // Non-blocking fallback
    }

    // 2. Format Items and calculate line totals
    let rawSubtotal = 0;
    const formattedItems = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
      const rate = Math.max(0, parseFloat(it.rate || it.unit_price) || 0);
      const taxable = Math.round(qty * rate * 100) / 100;
      rawSubtotal += taxable;

      // Calculate line tax if GST is enabled
      const itemGstRate = gst_enabled ? (it.gst_rate !== undefined ? parseFloat(it.gst_rate) : parseFloat(gst_rate)) : 0;
      const lineTax = gst_enabled ? Math.round((taxable * itemGstRate) / 100 * 100) / 100 : 0;
      const lineTotal = taxable + lineTax;

      formattedItems.push({
        sr_no: i + 1,
        name: it.name || it.item_name || 'Product',
        item_type: it.item_type || 'PART', // 'PHONE' or 'PART' or 'ACCESSORY'
        imei: it.imei || it.serial_number || '',
        warranty: it.warranty || '',
        hsn: it.hsn || it.hsn_sac || '8517',
        quantity: qty,
        unit: it.unit || 'NOS',
        rate,
        taxable_value: taxable,
        gst_rate: itemGstRate,
        gst_amount: lineTax,
        total: lineTotal,
        part_id: it.part_id || null,
      });

      // If tied to inventory part, auto-decrement stock
      if (it.part_id) {
        try {
          await db.parts.adjustStock(it.part_id, {
            type: 'OUT',
            quantity: qty,
            reason: `Direct Sale Invoice Bill`,
            created_by_user_id: req.user?.id || null,
          });
        } catch (_) {
          // Non-blocking
        }
      }
    }

    // 3. Discount calculation
    const numDiscountVal = Math.max(0, parseFloat(discount_value) || 0);
    let totalDiscount = 0;
    if (discount_type === 'percentage') {
      totalDiscount = Math.round((rawSubtotal * numDiscountVal) / 100 * 100) / 100;
    } else {
      totalDiscount = Math.min(rawSubtotal, numDiscountVal);
    }

    const discountedTaxableSubtotal = Math.max(0, rawSubtotal - totalDiscount);

    // 4. Overall Tax Calculation
    const effectiveGstRate = gst_enabled ? (parseFloat(gst_rate) || 18) : 0;
    const totalTax = gst_enabled ? Math.round((discountedTaxableSubtotal * effectiveGstRate) / 100 * 100) / 100 : 0;

    let igstRate = 0;
    let igstAmount = 0;
    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;

    if (gst_enabled) {
      if (gst_type === 'CGST_SGST') {
        cgstRate = effectiveGstRate / 2;
        cgstAmount = Math.round((totalTax / 2) * 100) / 100;
        sgstRate = effectiveGstRate / 2;
        sgstAmount = totalTax - cgstAmount;
      } else {
        igstRate = effectiveGstRate;
        igstAmount = totalTax;
      }
    }

    const totalAmount = Math.round((discountedTaxableSubtotal + totalTax) * 100) / 100;

    // 5. Invoice numbering
    let finalInvoiceNumber = customInvoiceNumber;
    let seqNumber = null;
    if (!finalInvoiceNumber) {
      const nextSeq = await generateNextSaleInvoiceNumber();
      finalInvoiceNumber = nextSeq.fullNumber;
      seqNumber = nextSeq.seqNumber;
    }

    const shop = await db.shops.getProfile();

    const saleRecord = {
      invoice_number: finalInvoiceNumber,
      invoice_no_seq: seqNumber,
      invoice_date: invoice_date || new Date().toISOString().split('T')[0],
      customer_id: customer?.id || null,
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      customer_email: customer_email.trim(),
      customer_address: customer_address.trim(),
      place_of_supply: place_of_supply || 'Gujarat ( 24 )',
      customer_gstin: customer_gstin.trim(),
      items: formattedItems,
      subtotal: rawSubtotal,
      discount_type,
      discount_value: numDiscountVal,
      discount_amount: totalDiscount,
      taxable_amount: discountedTaxableSubtotal,
      gst_enabled: Boolean(gst_enabled),
      gst_type, // 'IGST' or 'CGST_SGST'
      gst_rate: effectiveGstRate,
      igst_rate: igstRate,
      igst_amount: igstAmount,
      cgst_rate: cgstRate,
      cgst_amount: cgstAmount,
      sgst_rate: sgstRate,
      sgst_amount: sgstAmount,
      total_tax: totalTax,
      total_amount: totalAmount,
      payment_mode: payment_mode || 'CASH',
      payment_status: 'PAID',
      bank_details: bank_details || {
        bank_name: 'ICICI Bank',
        branch: 'Surat',
        account_number: '2715500356',
        ifsc: 'ICIC000045',
        upi_id: 'mobotech@icici',
      },
      terms_conditions: terms_conditions || [
        'Subject to Surat/Maharashtra Jurisdiction.',
        'Our Responsibility Ceases as soon as goods leave our Premises.',
        'Goods once sold will not be taken back.',
        'Warranty as per manufacturer or shop warranty policy. Physical or liquid damage voids warranty.',
        'Delivery Ex-Premises.',
      ],
      notes,
      issued_by_user_id: req.user?.id || null,
      issued_by_name: req.user?.full_name || 'Front Desk Staff',
    };

    const createdSale = await db.sales.create(saleRecord);

    // Automatically send invoice to customer WhatsApp & Email
    dispatchSaleInvoiceNotification({ sale: createdSale, shop }).catch((err) =>
      console.warn('⚠️ [Sales Notification] Background dispatch error:', err.message)
    );

    res.status(201).json({
      success: true,
      message: 'Sales bill created successfully.',
      data: {
        sale: createdSale,
        shop,
        notification_dispatched: true,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await db.sales.delete(id);
    if (!deleted) throw new AppError('Sale not found.', 404, 'SALE_NOT_FOUND');

    res.json({
      success: true,
      message: 'Sale record deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const bulkDeleteSales = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('No sale invoice IDs provided.', 400, 'VALIDATION_ERROR');
    }
    const count = await db.sales.bulkDelete(ids);
    res.json({
      success: true,
      message: `Deleted ${count} sales invoices successfully.`,
      count,
    });
  } catch (err) {
    next(err);
  }
};

export const downloadSalePdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await db.sales.findById(id);
    if (!sale) throw new AppError('Sale invoice not found.', 404, 'SALE_NOT_FOUND');

    const shop = await db.shops.getProfile();
    const pdfBuffer = await generateSaleInvoicePdfBuffer({ sale, shop });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice_${sale.invoice_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

export const sendSaleInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await db.sales.findById(id);
    if (!sale) throw new AppError('Sale invoice not found.', 404, 'SALE_NOT_FOUND');

    const shop = await db.shops.getProfile();
    const result = await dispatchSaleInvoiceNotification({ sale, shop });

    res.json({
      success: true,
      message: `Original invoice PDF sent automatically to ${sale.customer_phone || 'customer'}.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};


