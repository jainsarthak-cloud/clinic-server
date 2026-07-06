import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Doctor = sequelize.define(
  'Doctor',
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
    specialization: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    licenseNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    experienceYears: {
      type: DataTypes.SMALLINT,
      defaultValue: 0,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    consultationFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00,
    },
    availabilityStatus: {
      type: DataTypes.ENUM('AVAILABLE', 'ON_LEAVE', 'BUSY'),
      defaultValue: 'AVAILABLE',
    },
  },
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: 'doctors',
  }
);

export default Doctor;
