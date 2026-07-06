import { DataTypes } from 'sequelize';
import argon2 from 'argon2';
import sequelize from '../config/db.js';

export const Users = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(320),
      allowNull: false,
      unique: true,
      set(v) {
        this.setDataValue('email', v.toLowerCase().trim());
      },
      validate: {
        isEmail: true,
      },
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      validate: {
        isNumeric: true,
        len: [10, 20],
      },
    },
    passwordHash: {
      type: DataTypes.TEXT,
      get() {
        return undefined; // Hide hash from serializations
      },
    },
    password: {
      type: DataTypes.VIRTUAL,
    },
    role: {
      type: DataTypes.ENUM('PATIENT', 'DOCTOR', 'ADMIN'),
      allowNull: false,
      defaultValue: 'PATIENT',
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'),
      defaultValue: 'ACTIVE',
    },
    failedLoginCount: {
      type: DataTypes.SMALLINT,
      defaultValue: 0,
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginIp: {
      type: DataTypes.INET,
      allowNull: true,
    },
    customFields: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deletedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: 'users',
    defaultScope: {
      attributes: { exclude: ['passwordHash'] },
    },
    scopes: {
      withAuth: {
        attributes: { include: ['passwordHash'] },
      },
    },
    hooks: {
      async beforeCreate(user) {
        if (user.password) {
          const hash = await argon2.hash(user.password, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 3,
          });
          user.setDataValue('passwordHash', hash);
          user.password = undefined;
        }
      },
      async beforeUpdate(user) {
        if (user.changed('password') && user.password) {
          const hash = await argon2.hash(user.password, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 3,
          });
          user.setDataValue('passwordHash', hash);
          user.password = undefined;
        }
      },
    },
  }
);

Users.prototype.verifyPassword = async function (plain) {
  const hash = this.getDataValue('passwordHash');
  if (!hash) return false;
  return argon2.verify(hash, plain);
};

Object.defineProperty(Users.prototype, 'isLocked', {
  get() {
    return this.lockedUntil && this.lockedUntil > new Date();
  },
});

export default Users;