import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Admin = sequelize.define(
  'Admin',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
  },
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: 'admins',
  }
);

export default Admin;
