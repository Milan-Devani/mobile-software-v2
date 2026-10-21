import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/db.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

export const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      throw new AppError('Please provide both email and password.', 400, 'AUTH_MISSING_CREDENTIALS');
    }

    const user = await db.users.findByEmail(email);
    if (!user) {
      // Avoid revealing whether email exists
      throw new AppError('Invalid email or password.', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    if (user.is_active === false) {
      throw new AppError('Account is disabled. Please contact administrator.', 403, 'AUTH_ACCOUNT_DISABLED');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    const tokenExpiry = rememberMe ? '30d' : (env.JWT_EXPIRES_IN || '7d');
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role_id: user.role_id,
        full_name: user.full_name,
      },
      env.JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    const { password_hash, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Logged in successfully.',
      data: {
        token,
        user: safeUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await db.users.findById(req.user.id);
    if (!user) {
      throw new AppError('User profile not found.', 404, 'USER_NOT_FOUND');
    }
    const { password_hash, ...safeUser } = user;
    res.json({
      success: true,
      data: { user: safeUser },
    });
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const users = await db.users.list();
    res.json({
      success: true,
      data: { users },
    });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { email, password, full_name, role_id, phone } = req.body;

    if (!email || !password || !full_name || !role_id) {
      throw new AppError('Missing required fields: email, password, full_name, role_id', 400, 'VALIDATION_ERROR');
    }

    const existing = await db.users.findByEmail(email);
    if (existing) {
      throw new AppError('User with this email already exists.', 400, 'USER_ALREADY_EXISTS');
    }

    const password_hash = await bcrypt.hash(password, 10);
    const createdUser = await db.users.create({
      email,
      password_hash,
      full_name,
      role_id,
      phone: phone || '',
      is_active: true,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: { user: createdUser },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      throw new AppError('You cannot delete your own active account.', 400, 'CANNOT_DELETE_SELF');
    }
    const deleted = await db.users.delete(id, req.user.id);
    if (!deleted) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }
    res.json({
      success: true,
      message: 'User account removed successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const bulkDeleteUsers = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('No user IDs provided for bulk deletion.', 400, 'IDS_REQUIRED');
    }
    const count = await db.users.bulkDelete(ids, req.user.id);
    res.json({
      success: true,
      message: `Successfully removed ${count} user account(s).`,
      data: { count },
    });
  } catch (err) {
    next(err);
  }
};
