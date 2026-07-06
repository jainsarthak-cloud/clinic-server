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
    isBooked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    maxAppointments: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: 'time_slots',
    indexes: [
      {
        unique: true,
        fields: ['doctor_id', 'date', 'start_time', 'end_time'],
      },
    ],
  }
);

export default TimeSlot;
