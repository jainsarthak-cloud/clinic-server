import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const HospitalMembership = sequelize.define(
  'HospitalMembership',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    hospitalId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'receptionist', 'doctor', 'nurse', 'billing', 'viewer'),
      allowNull: false
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('invited', 'active', 'disabled'),
      allowNull: false,
      defaultValue: 'invited'
    },
    invitedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: 'hospital_memberships',
    indexes: [
      { unique: true, fields: ['hospital_id', 'user_id'] },
      { fields: ['hospital_id', 'role'] },
      { fields: ['hospital_id', 'status'] }
    ]
  }
);

export default HospitalMembership;
