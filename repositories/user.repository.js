import { Op } from 'sequelize';
import {
  User,
  HospitalMembership,
  Doctor,
  Admin,
  Patient
} from '../models/index.js';
import { BaseRepository, toPositiveInteger } from './base.repository.js';

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email, options = {}) {
    return this.model.scope('withAuth').findOne({
      where: { email: email.toLowerCase().trim() },
      ...options
    });
  }

  async findByPhone(phone, options = {}) {
    return this.model.findOne({
      where: { phoneNumber: phone },
      ...options
    });
  }

  async findByEmailOrPhone(identifier, options = {}) {
    const normalizedIdentifier = String(identifier).toLowerCase().trim();
    return this.model.scope('withAuth').findOne({
      where: {
        [Op.or]: [
          { email: normalizedIdentifier },
          { phoneNumber: identifier }
        ]
      },
      ...options
    });
  }

  async findByIdGlobal(id, options = {}) {
    return this.model.findByPk(id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        {
          association: 'memberships',
          include: [
            {
              association: 'hospital',
              attributes: ['id', 'name', 'slug', 'status']
            }
          ]
        }
      ],
      ...options
    });
  }

  async findByIdWithHospitalAccess(id, hospitalId, options = {}) {
    return this.model.findOne({
      where: { id },
      attributes: { exclude: ['passwordHash'] },
      include: [
        {
          model: HospitalMembership,
          as: 'memberships',
          where: { hospitalId },
          required: true
        }
      ],
      ...options
    });
  }

  async findActiveUsers(hospitalId, filter = {}, options = {}) {
    return HospitalMembership.findAll({
      where: {
        hospitalId,
        status: 'active',
        ...(filter.role ? { role: filter.role } : {})
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['passwordHash'] },
          where: filter.userWhere || {}
        }
      ],
      ...options
    });
  }

  async findByRole(role, hospitalId, filter = {}, options = {}) {
    const { page, limit, search, status, ...safeFilter } = filter;
    return HospitalMembership.findAll({
      where: {
        ...safeFilter,
        ...(status ? { status } : {}),
        hospitalId,
        role
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['passwordHash'] },
          where: this.buildUserSearchWhere(search)
        }
      ],
      ...options
    });
  }

  async findByIdWithAssociations(id, hospitalId, include = [], options = {}) {
    const defaultInclude = [
      {
        model: HospitalMembership,
        as: 'memberships',
        where: { hospitalId },
        required: true
      },
      {
        model: Doctor,
        as: 'doctorProfile',
        required: false,
        where: { hospitalId }
      }
    ];

    return this.model.findOne({
      where: { id },
      attributes: { exclude: ['passwordHash'] },
      include: include.length > 0 ? include : defaultInclude,
      ...options
    });
  }

  async updatePassword(id, hashedPassword, options = {}) {
    const user = await this.model.scope(null).findByPk(id, options);
    if (!user) return null;
    return user.update({ passwordHash: hashedPassword }, options);
  }

  async updateLastLoginGlobal(id, loginData = {}, options = {}) {
    const user = await this.model.findByPk(id, options);
    if (!user) return null;
    return user.update({ lastLoginAt: new Date(), ...loginData }, options);
  }

  async updateStatus(id, hospitalId, status, options = {}) {
    const user = await this.findByIdWithHospitalAccess(id, hospitalId, options);
    if (!user) return null;
    return user.update({ status }, options);
  }

  async softDelete(id, hospitalId, options = {}) {
    const user = await this.findByIdWithHospitalAccess(id, hospitalId, options);
    if (!user) return 0;
    return user.destroy(options);
  }

  async restore(id, hospitalId, options = {}) {
    const membership = await HospitalMembership.findOne({
      where: { userId: id, hospitalId },
      paranoid: false,
      ...options
    });
    if (!membership) return null;

    const user = await this.model.findOne({
      where: { id },
      paranoid: false,
      ...options
    });
    if (!user) return null;
    return user.restore(options);
  }

  async createMembership(payload, options = {}) {
    return HospitalMembership.create(payload, options);
  }

  async findMembership(userId, hospitalId, options = {}) {
    return HospitalMembership.findOne({
      where: { userId, hospitalId },
      ...options
    });
  }

  async updateMembership(userId, hospitalId, changes, options = {}) {
    const membership = await this.findMembership(userId, hospitalId, options);
    if (!membership) return null;
    return membership.update(changes, options);
  }

  async removeMembership(userId, hospitalId, options = {}) {
    return HospitalMembership.destroy({
      where: { userId, hospitalId },
      ...options
    });
  }

  async listHospitalUsers(hospitalId, filters = {}, options = {}) {
    const page = toPositiveInteger(filters.page, 1);
    const limit = toPositiveInteger(filters.limit, 20);
    const offset = (page - 1) * limit;
    const membershipWhere = { hospitalId };

    if (filters.role) membershipWhere.role = filters.role;
    if (filters.status) membershipWhere.status = filters.status;

    const result = await HospitalMembership.findAndCountAll({
      where: membershipWhere,
      include: [
        {
          model: User,
          as: 'user',
          where: this.buildUserSearchWhere(filters.search),
          attributes: { exclude: ['passwordHash'] }
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
      ...options
    });

    return {
      data: result.rows,
      meta: {
        page,
        limit,
        total: result.count,
        totalPages: result.count ? Math.ceil(result.count / limit) : 0
      }
    };
  }

  async findDoctorProfile(userId, hospitalId, options = {}) {
    return Doctor.findOne({ where: { userId, hospitalId }, ...options });
  }

  async findAdminProfile(userId, hospitalId, options = {}) {
    return Admin.findOne({ where: { userId, hospitalId }, ...options });
  }

  async findPatientProfile(userId, hospitalId, options = {}) {
    return Patient.findOne({ where: { userId, hospitalId }, ...options });
  }

  buildUserSearchWhere(search) {
    if (!search) return {};
    return {
      [Op.or]: [
        { displayName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phoneNumber: { [Op.iLike]: `%${search}%` } }
      ]
    };
  }
}

const userRepository = new UserRepository();

export {
  UserRepository,
  userRepository
};
