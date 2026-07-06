import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Patients = sequelize.define(
  'Patient',
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
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    gender: {
      type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'),
      defaultValue: 'PREFER_NOT_TO_SAY',
    },
    bloodType: {
      type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allowNull: true,
    },
    allergies: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    emergencyContactName: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    emergencyContactPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    medicalHistory: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: 'patients',
  }
);

export default Patients;
