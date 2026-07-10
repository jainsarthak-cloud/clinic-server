import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import config from '../../config/env.js';
import { Hospital, HospitalMembership, User } from '../../models/index.js';

const ROLE_PERMISSIONS = {
  owner: ['*'],
  admin: ['*'],
  receptionist: [
    'read:user',
    'create:user',
    'update:user',
    'read:appointment',
    'create:appointment',
    'update:appointment',
    'delete:appointment',
    'read:time-slot',
    'create:time-slot',
    'update:time-slot',
    'delete:time-slot'
  ],
  doctor: [
    'read:user',
    'read:appointment',
    'update:appointment',
    'read:time-slot'
  ],
  nurse: [
    'read:user',
    'read:appointment',
    'update:appointment',
    'read:time-slot'
  ],
  billing: ['read:user', 'read:appointment'],
  viewer: ['read:user', 'read:appointment', 'read:time-slot']
};

const getToken = (req) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme && scheme.toLowerCase() !== 'bearer') return null;
  return req.cookies?.token || token || null;
};

const resolveHospitalIdFromRequest = (req, decoded) =>
  req.params.hospitalId ||
  req.headers['x-hospital-id'] ||
  decoded.hospitalId ||
  decoded.tenantId;

export const identifyUser = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Login required' });
    if (!config.jwt.accessSecret) {
      return res.status(500).json({ success: false, message: 'JWT access secret is not configured' });
    }

    const decoded = jwt.verify(token, config.jwt.accessSecret);
    const hospitalId = resolveHospitalIdFromRequest(req, decoded);
    if (!hospitalId) {
      return res.status(400).json({ success: false, message: 'Hospital context required' });
    }

    const hospital = await Hospital.findOne({
      where: { id: hospitalId, status: { [Op.in]: ['trial', 'active'] } }
    });
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    const user = await User.findByPk(decoded.id || decoded.userId);
    if (!user || user.status === 'disabled' || user.isLocked) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    const membership = await HospitalMembership.findOne({
      where: {
        hospitalId,
        userId: user.id,
        status: 'active'
      }
    });

    if (!membership) {
      return res.status(403).json({ success: false, message: 'Hospital access denied' });
    }

    const rolePermissions = ROLE_PERMISSIONS[membership.role] || [];
    const customPermissions = Array.isArray(membership.permissions)
      ? membership.permissions
      : [];

    req.user = {
      ...decoded,
      id: user.id,
      hospitalId,
      role: membership.role,
      membershipId: membership.id,
      permissions: [...new Set([...rolePermissions, ...customPermissions])]
    };
    req.hospitalId = hospitalId;
    req.tenantId = hospitalId;
    req.tenant = { hospitalId };
    req.hospital = hospital;

    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Session invalid' });
  }
};

export const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(500).json({
        success: false,
        message: 'Internal Auth Error: Permissions not resolved'
      });
    }

    if (req.user.permissions.includes('*')) return next();

    if (!req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have the '${requiredPermission}' permission`
      });
    }

    return next();
  };
};
