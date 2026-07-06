import sequelize from '../config/db.js';
import Users from './Users.js';
import Patients from './Patients.js';
import Doctor from './Doctor.js';
import Admin from './Admin.js';
import TimeSlot from './TimeSlot.js';
import Appointment from './Appointment.js';

// --- Associations ---

// User <-> Patient (1:1)
Users.hasOne(Patients, { foreignKey: 'userId', as: 'patientProfile', onDelete: 'CASCADE' });
Patients.belongsTo(Users, { foreignKey: 'userId', as: 'user' });

// User <-> Doctor (1:1)
Users.hasOne(Doctor, { foreignKey: 'userId', as: 'doctorProfile', onDelete: 'CASCADE' });
Doctor.belongsTo(Users, { foreignKey: 'userId', as: 'user' });

// User <-> Admin (1:1)
Users.hasOne(Admin, { foreignKey: 'userId', as: 'adminProfile', onDelete: 'CASCADE' });
Admin.belongsTo(Users, { foreignKey: 'userId', as: 'user' });

// Doctor <-> TimeSlot (1:N)
Doctor.hasMany(TimeSlot, { foreignKey: 'doctorId', as: 'timeSlots', onDelete: 'CASCADE' });
TimeSlot.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

// Patient <-> Appointment (1:N)
Patients.hasMany(Appointment, { foreignKey: 'patientId', as: 'appointments', onDelete: 'RESTRICT' });
Appointment.belongsTo(Patients, { foreignKey: 'patientId', as: 'patient' });

// Doctor <-> Appointment (1:N)
Doctor.hasMany(Appointment, { foreignKey: 'doctorId', as: 'appointments', onDelete: 'RESTRICT' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

// TimeSlot <-> Appointment (1:N or 1:1 depending on capacity)
TimeSlot.hasMany(Appointment, { foreignKey: 'timeSlotId', as: 'appointments', onDelete: 'RESTRICT' });
Appointment.belongsTo(TimeSlot, { foreignKey: 'timeSlotId', as: 'timeSlot' });

export {
  sequelize,
  Users,
  Patients,
  Doctor,
  Admin,
  TimeSlot,
  Appointment,
};
