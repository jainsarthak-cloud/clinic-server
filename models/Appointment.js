import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Appointment = sequelize.define(
  'Appointment',
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
    branchId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    timeSlotId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    appointmentNumber: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    source: {
      type: DataTypes.ENUM('android', 'ios', 'web_admin', 'reception', 'doctor_dashboard', 'public_web', 'api'),
      allowNull: false,
      defaultValue: 'reception'
    },
    type: {
      type: DataTypes.ENUM('walk_in', 'scheduled', 'follow_up', 'teleconsultation'),
      allowNull: false,
      defaultValue: 'scheduled'
    },
    scheduledDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('booked', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show'),
      allowNull: false,
      defaultValue: 'booked'
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    }
  },
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: 'appointments',
    indexes: [
      { unique: true, fields: ['hospital_id', 'appointment_number'] },
      { fields: ['hospital_id', 'branch_id', 'scheduled_date'] },
      { fields: ['hospital_id', 'doctor_id', 'starts_at'] },
      { fields: ['hospital_id', 'patient_id', 'scheduled_date'] },
      { fields: ['hospital_id', 'time_slot_id'] },
      { fields: ['hospital_id', 'status'] }
    ],
    validate: {
      endsAfterStart() {
        if (this.startsAt && this.endsAt && new Date(this.endsAt) <= new Date(this.startsAt)) {
          throw new Error('endsAt must be after startsAt');
        }
      }
    }
  }
);

export default Appointment;
