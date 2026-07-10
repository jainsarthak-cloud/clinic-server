import { UserService } from '../services/user.service.js';
import { catchAsync } from '../utils/catchAsync.js';
import { resolveHospitalId } from './base.controller.js';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

const userService = new UserService();

const parseFilter = (query) => {
  if (!query.filter) return {};
  try {
    return JSON.parse(query.filter);
  } catch {
    const error = new Error('filter must be valid JSON');
    error.statusCode = 400;
    throw error;
  }
};

class UserController {
  create = catchAsync(async (req, res) => {
    const data = await userService.createUser({
      ...req.body,
      hospitalId: resolveHospitalId(req)
    });
    res.status(201).json({ success: true, data });
  });

  getAll = catchAsync(async (req, res) => {
    const filter = parseFilter(req.query);
    const data = await userService.getAllUsers(resolveHospitalId(req), {
      ...filter,
      ...req.query
    });
    res.status(200).json({ success: true, data });
  });

  getById = catchAsync(async (req, res) => {
    const data = await userService.getUserById(
      req.params.id,
      resolveHospitalId(req)
    );
    res.status(200).json({ success: true, data });
  });

  getByRole = catchAsync(async (req, res) => {
    const { role } = req.params;
    const filter = parseFilter(req.query);
    const data = await userService.getUsersByRole(
      role,
      resolveHospitalId(req),
      filter
    );
    res.status(200).json({ success: true, data });
  });

  getActive = catchAsync(async (req, res) => {
    const filter = parseFilter(req.query);
    const data = await userService.getActiveUsers(resolveHospitalId(req), filter);
    res.status(200).json({ success: true, data });
  });

  update = catchAsync(async (req, res) => {
    const data = await userService.updateUser(
      req.params.id,
      resolveHospitalId(req),
      req.body
    );
    res.status(200).json({ success: true, data });
  });

  updateStatus = catchAsync(async (req, res) => {
    const { status } = req.body;
    const data = await userService.updateUserStatus(
      req.params.id,
      resolveHospitalId(req),
      status
    );
    res.status(200).json({ success: true, data });
  });

  updateMembership = catchAsync(async (req, res) => {
    const data = await userService.updateMembership(
      req.params.id,
      resolveHospitalId(req),
      req.body
    );
    res.status(200).json({ success: true, data });
  });

  delete = catchAsync(async (req, res) => {
    await userService.deleteUser(req.params.id, resolveHospitalId(req));
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  });

  restore = catchAsync(async (req, res) => {
    const data = await userService.restoreUser(req.params.id, resolveHospitalId(req));
    res.status(200).json({
      success: true,
      message: 'User restored successfully',
      data
    });
  });

  login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const data = await userService.loginByEmail(email, password);

    // Sign the token using user ID, email, and primary hospitalId from membership (if any)
    const token = jwt.sign(
      {
        id: data.id,
        email: data.email,
        hospitalId: data.memberships?.[0]?.hospitalId || null
      },
      config.jwt.accessSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '90d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        ...data
      }
    });
  });

  logout = catchAsync(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  });
}

export { UserController };
