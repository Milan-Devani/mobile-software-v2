import { db } from '../db/db.js';
import { AppError } from '../middleware/errorHandler.js';

export const getCustomers = async (req, res, next) => {
  try {
    const { search = '', limit = 50, offset = 0 } = req.query;
    const result = await db.customers.list({
      search,
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

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await db.customers.findById(id);

    if (!customer) {
      throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    }

    // Fetch devices and repair jobs for this customer
    const devices = await db.devices.listByCustomerId(id);
    const { jobs } = await db.jobs.list({ customerId: id, limit: 100 });

    // Calculate customer statistics
    let totalRepairs = jobs.length;
    let activeRepairs = 0;
    let completedRepairs = 0;
    let pendingPayments = 0;
    let totalSpent = 0;

    jobs.forEach(j => {
      if (['DELIVERED'].includes(j.status)) {
        completedRepairs += 1;
      } else if (!['CANCELLED', 'REJECTED'].includes(j.status)) {
        activeRepairs += 1;
      }

      totalSpent += (j.paid_amount || 0);
      pendingPayments += (j.balance_due || 0);
    });

    res.json({
      success: true,
      data: {
        customer,
        devices,
        jobs,
        stats: {
          total_repairs: totalRepairs,
          active_repairs: activeRepairs,
          completed_repairs: completedRepairs,
          pending_payments: parseFloat(pendingPayments.toFixed(2)),
          total_spent: parseFloat(totalSpent.toFixed(2)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const { full_name, phone, email, whatsapp_number, address, city, state, postal_code, notes } = req.body;

    if (!full_name || !phone) {
      throw new AppError('Customer Full Name and Phone Number are required.', 400, 'VALIDATION_ERROR');
    }

    const customer = await db.customers.create({
      full_name,
      phone,
      email: email || '',
      whatsapp_number: whatsapp_number || phone,
      address: address || '',
      city: city || '',
      state: state || '',
      postal_code: postal_code || '',
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully.',
      data: { customer },
    });
  } catch (err) {
    next(err);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.customers.findById(id);
    if (!existing) {
      throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    }

    const updated = await db.customers.update(id, req.body);

    res.json({
      success: true,
      message: 'Customer updated successfully.',
      data: { customer: updated },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Check if customer has associated jobs
    const { jobs } = await db.jobs.list({ customerId: id, limit: 1 });
    if (jobs && jobs.length > 0) {
      throw new AppError('Cannot delete customer with existing repair jobs history. Consider archiving instead.', 400, 'CUSTOMER_HAS_JOBS');
    }

    await db.customers.delete(id);

    res.json({
      success: true,
      message: 'Customer deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
