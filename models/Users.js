import { DataTypes } from 'sequelize';
import argon2 from 'argon2';
import sequelize from '../config/db.js';

export const User = sequelize.define(
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

    displayName: {
      type: DataTypes.STRING(220),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(320),
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('email', value?.toLowerCase().trim());
      },
    },

    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },

    passwordHash: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        return undefined;
      },
    },

    password: {
      type: DataTypes.VIRTUAL,
    },

    authProvider: {
      type: DataTypes.ENUM(
        'local',
        'google',
        'apple',
        'microsoft',
        'otp'
      ),
      allowNull: false,
      defaultValue: 'local',
    },

    providerUserId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    phoneVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM(
        'invited',
        'active',
        'pending_verification',
        'locked',
        'disabled'
      ),
      allowNull: false,
      defaultValue: 'pending_verification',
    },

    failedLoginCount: {
      type: DataTypes.SMALLINT,
      allowNull: false,
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

    lastPasswordChangedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    deletedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    preferences: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: 'users',

    defaultScope: {
      attributes: {
        exclude: ['passwordHash'],
      },
    },

    scopes: {
      withAuth: {
        attributes: {
          include: ['passwordHash'],
        },
      },
    },

    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
      {
        unique: true,
        fields: ['phone_number'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['auth_provider', 'provider_user_id'],
      },
      {
        fields: ['deleted_at'],
      },
    ],

    hooks: {
      beforeValidate(user) {
        if (!user.displayName && (user.firstName || user.lastName)) {
          user.displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        }
      },

      async beforeCreate(user) {
        if (user.password) {
          user.setDataValue('passwordHash', await hashPassword(user.password));
          user.lastPasswordChangedAt = new Date();
          user.password = undefined;
        }
      },

      async beforeUpdate(user) {
        if (user.changed('password') && user.password) {
          user.setDataValue('passwordHash', await hashPassword(user.password));
          user.lastPasswordChangedAt = new Date();
          user.password = undefined;
        }
      },
    },
  }
);

async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

User.prototype.verifyPassword = async function verifyPassword(plainPassword) {
  const hash = this.getDataValue('passwordHash');

  if (!hash) {
    return false;
  }

  return argon2.verify(hash, plainPassword);
};

Object.defineProperty(User.prototype, 'isLocked', {
  get() {
    return Boolean(this.lockedUntil && this.lockedUntil > new Date());
  },
});

export default User;