import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const TimeSlot = sequelize.define(
  'TimeSlot',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    hospitalId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    slotType: {
      type: DataTypes.ENUM(
        'consultation',
        'follow_up',
        'emergency',
        'teleconsultation'
      ),
      allowNull: false,
      defaultValue: 'consultation',
    },

    maxAppointments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    bookedAppointments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    status: {
      type: DataTypes.ENUM(
        'available',
        'full',
        'blocked',
        'cancelled',
        'completed'
      ),
      allowNull: false,
      defaultValue: 'available',
    },

    blockReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    isWalkInAllowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    isOnlineBookingAllowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    underscored: true,
    paranoid: true,
    tableName: 'time_slots',

    indexes: [
      {
        name: 'time_slots_unique_slot',
        unique: true,
        fields: [
          'hospital_id',
          'branch_id',
          'doctor_id',
          'date',
          'start_time',
          'end_time',
        ],
      },
      {
        fields: ['hospital_id', 'date'],
      },
      {
        fields: ['hospital_id', 'branch_id', 'date'],
      },
      {
        fields: ['hospital_id', 'department_id', 'date'],
      },
      {
        fields: ['hospital_id', 'doctor_id', 'date'],
      },
      {
        fields: ['hospital_id', 'status'],
      },
      {
        fields: ['hospital_id', 'slot_type'],
      },
    ],
  }
);

export default TimeSlot;