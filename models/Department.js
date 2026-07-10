import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Department = sequelize.define(
  'Department',
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
    name: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'disabled'),
      allowNull: false,
      defaultValue: 'active'
    }
  },
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: 'departments',
    indexes: [{ fields: ['hospital_id'] }]
  }
);

export default Department;
