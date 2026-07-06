import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Appointment = sequelize.define(
  'Appointment',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    timeSlotId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    appointmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'),
      defaultValue: 'PENDING',
    },
    symptoms: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    prescription: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    billingStatus: {
      type: DataTypes.ENUM('UNPAID', 'PAID', 'PARTIALLY_PAID', 'REFUNDED'),
      defaultValue: 'UNPAID',
    },
    paymentDetails: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: 'appointments',
  }
);

export default Appointment;
