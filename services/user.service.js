import sequelize from '../config/db.js';
import { UserRepository } from '../repositories/user.repository.js';

const userRepo = new UserRepository();

const splitName = (fullName) => {
  const normalized = String(fullName || '').trim().replace(/\s+/g, ' ');
  const [firstName, ...rest] = normalized.split(' ');
  return {
    firstName: firstName || normalized,
    lastName: rest.join(' ') || firstName || normalized,
    displayName: normalized
  };
};

class UserService {
  async createUser(payload, options = {}) {
    const email = payload.email?.toLowerCase().trim();
    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) throw new Error('Email already exists');

    let transaction = options.transaction;
    let localTransaction = false;
    if (!transaction) {
      transaction = await sequelize.transaction();
      localTransaction = true;
    }

    try {
      const name = splitName(payload.fullName);
      const user = await userRepo.create(
        {
          ...name,
          email,
          phoneNumber: payload.phone?.trim() || null,
          password: payload.password,
          avatarUrl: payload.avatarUrl || null,
          status: payload.status || 'invited'
        },
        { transaction }
      );

      if (payload.hospitalId && payload.role) {
        await userRepo.createMembership(
          {
            hospitalId: payload.hospitalId,
            userId: user.id,
            role: payload.role,
            permissions: payload.permissions || [],
            status: payload.membershipStatus || 'invited',
            invitedAt: new Date()
          },
          { transaction }
        );
      }

      if (localTransaction) await transaction.commit();
      const createdUser = await userRepo.findByIdGlobal(user.id);
      return this.formatUserResponse(createdUser);
    } catch (error) {
      if (localTransaction && !transaction.finished) await transaction.rollback();
      throw error;
    }
  }

  async getAllUsers(hospitalId, filter = {}) {
    const result = await userRepo.listHospitalUsers(hospitalId, filter);
    return {
      ...result,
      data: result.data.map((membership) =>
        this.formatHospitalUserResponse(membership)
      )
    };
  }

  async getUserById(userId, hospitalId) {
    const user = await userRepo.findByIdWithAssociations(userId, hospitalId);
    if (!user) throw new Error('User not found');
    return this.formatUserResponse(user);
  }

  async getUsersByRole(role, hospitalId, filter = {}) {
    const memberships = await userRepo.findByRole(role, hospitalId, filter);
    return memberships.map((membership) =>
      this.formatHospitalUserResponse(membership)
    );
  }

  async getActiveUsers(hospitalId, filter = {}) {
    const memberships = await userRepo.findActiveUsers(hospitalId, filter);
    return memberships.map((membership) =>
      this.formatHospitalUserResponse(membership)
    );
  }

  async updateUser(userId, hospitalId, payload) {
    const user = await userRepo.findByIdWithHospitalAccess(userId, hospitalId);
    if (!user) throw new Error('User not found');

    if (payload.email && payload.email.toLowerCase().trim() !== user.email) {
      const existingUser = await userRepo.findByEmail(payload.email);
      if (existingUser && existingUser.id !== userId) throw new Error('Email already exists');
    }

    const updateData = {};
    if (payload.fullName) Object.assign(updateData, splitName(payload.fullName));
    if (payload.email) updateData.email = payload.email.toLowerCase().trim();
    if (payload.phone !== undefined) updateData.phoneNumber = payload.phone?.trim() || null;
    if (payload.avatarUrl !== undefined) updateData.avatarUrl = payload.avatarUrl;
    if (payload.status) updateData.status = payload.status;

    await user.update(updateData);
    const updated = await userRepo.findByIdWithAssociations(userId, hospitalId);
    return this.formatUserResponse(updated);
  }

  async updateUserStatus(userId, hospitalId, status) {
    const validStatuses = ['invited', 'active', 'pending_verification', 'locked', 'disabled'];
    if (!validStatuses.includes(status)) throw new Error('Invalid status value');

    const user = await userRepo.updateStatus(userId, hospitalId, status);
    if (!user) throw new Error('User not found');
    return this.formatUserResponse(user);
  }

  async updateMembership(userId, hospitalId, payload) {
    const membership = await userRepo.updateMembership(userId, hospitalId, payload);
    if (!membership) throw new Error('Hospital membership not found');
    return membership;
  }

  async updatePassword(userId, plainPassword) {
    const user = await userRepo.updatePassword(userId, plainPassword);
    if (!user) throw new Error('User not found');
    return this.formatUserResponse(user);
  }

  async updateLastLogin(userId, loginData = {}) {
    await userRepo.updateLastLoginGlobal(userId, loginData);
  }

  async deleteUser(userId, hospitalId) {
    const result = await userRepo.softDelete(userId, hospitalId);
    if (!result) throw new Error('User not found');
  }

  async restoreUser(userId, hospitalId) {
    const user = await userRepo.restore(userId, hospitalId);
    if (!user) throw new Error('User not found');
    return this.formatUserResponse(user);
  }

  async loginByEmail(email, password) {
    const trimmedEmail = email?.toLowerCase().trim();
    if (!trimmedEmail) throw new Error('Email is required');
    if (!password) throw new Error('Password is required');

    const user = await userRepo.findByEmail(trimmedEmail);
    if (!user || user.status === 'disabled' || user.isLocked) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) throw new Error('Invalid email or password');

    await userRepo.updateLastLoginGlobal(user.id);
    const userWithAssociations = await userRepo.findByIdGlobal(user.id);
    return this.formatUserResponse(userWithAssociations);
  }

  formatUserResponse(user) {
    const memberships = (user.memberships || []).map((membership) => ({
      id: membership.id,
      hospitalId: membership.hospitalId,
      role: membership.role,
      permissions: membership.permissions,
      status: membership.status,
      hospital: membership.hospital
        ? {
            id: membership.hospital.id,
            name: membership.hospital.name,
            slug: membership.hospital.slug,
            status: membership.hospital.status
          }
        : null
    }));

    return {
      id: user.id,
      fullName: user.displayName,
      email: user.email,
      phone: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      memberships
    };
  }

  formatHospitalUserResponse(membership) {
    return {
      id: membership.user?.id,
      fullName: membership.user?.displayName,
      email: membership.user?.email,
      phone: membership.user?.phoneNumber,
      avatarUrl: membership.user?.avatarUrl,
      userStatus: membership.user?.status,
      membershipId: membership.id,
      hospitalId: membership.hospitalId,
      role: membership.role,
      permissions: membership.permissions,
      membershipStatus: membership.status,
      invitedAt: membership.invitedAt,
      acceptedAt: membership.acceptedAt,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt
    };
  }
}

export { UserService };
