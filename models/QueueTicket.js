import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const QueueTicket = sequelize.define(
  'QueueTicket',
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
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    },
    ticketNumber: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('waiting', 'called', 'served', 'cancelled'),
      allowNull: false,
      defaultValue: 'waiting'
    }
  },
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: 'queue_tickets',
    indexes: [
      { unique: true, fields: ['hospital_id', 'ticket_number'] },
      { fields: ['hospital_id', 'status'] }
    ]
  }
);

export default QueueTicket;
