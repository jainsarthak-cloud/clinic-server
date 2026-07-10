import sequelize from '../config/db.js';
import Users from './Users.js';
import Patients from './Patients.js';
import Doctor from './Doctor.js';
import Admin from './Admin.js';
import TimeSlot from './TimeSlot.js';
import Appointment from './Appointment.js';
import Hospital from './Hospital.js';
import HospitalMembership from './HospitalMembership.js';
import HospitalBranch from './HospitalBranch.js';
import Department from './Department.js';
import QueueTicket from './QueueTicket.js';

// --- Associations ---

// Hospital tenancy
Hospital.hasMany(HospitalMembership, { foreignKey: 'hospitalId', as: 'memberships', onDelete: 'CASCADE' });
HospitalMembership.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

Users.hasMany(HospitalMembership, { foreignKey: 'userId', as: 'memberships', onDelete: 'CASCADE' });
HospitalMembership.belongsTo(Users, { foreignKey: 'userId', as: 'user' });

Hospital.hasMany(HospitalBranch, { foreignKey: 'hospitalId', as: 'branches', onDelete: 'CASCADE' });
HospitalBranch.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

Hospital.hasMany(Department, { foreignKey: 'hospitalId', as: 'departments', onDelete: 'CASCADE' });
Department.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

// User <-> Patient (1:1)
Users.hasOne(Patients, { foreignKey: 'userId', as: 'patientProfile', onDelete: 'CASCADE' });
Patients.belongsTo(Users, { foreignKey: 'userId', as: 'user' });
Hospital.hasMany(Patients, { foreignKey: 'hospitalId', as: 'patients', onDelete: 'RESTRICT' });
Patients.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

// User <-> Doctor (1:1)
Users.hasOne(Doctor, { foreignKey: 'userId', as: 'doctorProfile', onDelete: 'CASCADE' });
Doctor.belongsTo(Users, { foreignKey: 'userId', as: 'user' });
Hospital.hasMany(Doctor, { foreignKey: 'hospitalId', as: 'doctors', onDelete: 'RESTRICT' });
Doctor.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

// User <-> Admin (1:1)
Users.hasOne(Admin, { foreignKey: 'userId', as: 'adminProfile', onDelete: 'CASCADE' });
Admin.belongsTo(Users, { foreignKey: 'userId', as: 'user' });
Hospital.hasMany(Admin, { foreignKey: 'hospitalId', as: 'admins', onDelete: 'RESTRICT' });
Admin.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

// Doctor <-> TimeSlot (1:N)
Doctor.hasMany(TimeSlot, { foreignKey: 'doctorId', as: 'timeSlots', onDelete: 'CASCADE' });
TimeSlot.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });
Hospital.hasMany(TimeSlot, { foreignKey: 'hospitalId', as: 'timeSlots', onDelete: 'RESTRICT' });
TimeSlot.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });
HospitalBranch.hasMany(TimeSlot, { foreignKey: 'branchId', as: 'timeSlots', onDelete: 'RESTRICT' });
TimeSlot.belongsTo(HospitalBranch, { foreignKey: 'branchId', as: 'branch' });
Department.hasMany(TimeSlot, { foreignKey: 'departmentId', as: 'timeSlots', onDelete: 'RESTRICT' });
TimeSlot.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Patient <-> Appointment (1:N)
Patients.hasMany(Appointment, { foreignKey: 'patientId', as: 'appointments', onDelete: 'RESTRICT' });
Appointment.belongsTo(Patients, { foreignKey: 'patientId', as: 'patient' });
Hospital.hasMany(Appointment, { foreignKey: 'hospitalId', as: 'appointments', onDelete: 'RESTRICT' });
Appointment.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });
HospitalBranch.hasMany(Appointment, { foreignKey: 'branchId', as: 'appointments', onDelete: 'RESTRICT' });
Appointment.belongsTo(HospitalBranch, { foreignKey: 'branchId', as: 'branch' });
Department.hasMany(Appointment, { foreignKey: 'departmentId', as: 'appointments', onDelete: 'RESTRICT' });
Appointment.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Doctor <-> Appointment (1:N)
Doctor.hasMany(Appointment, { foreignKey: 'doctorId', as: 'appointments', onDelete: 'RESTRICT' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

// TimeSlot <-> Appointment (1:N or 1:1 depending on capacity)
TimeSlot.hasMany(Appointment, { foreignKey: 'timeSlotId', as: 'appointments', onDelete: 'RESTRICT' });
Appointment.belongsTo(TimeSlot, { foreignKey: 'timeSlotId', as: 'timeSlot' });

Appointment.hasOne(QueueTicket, { foreignKey: 'appointmentId', as: 'queueTicket', onDelete: 'CASCADE' });
QueueTicket.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' });
Hospital.hasMany(QueueTicket, { foreignKey: 'hospitalId', as: 'queueTickets', onDelete: 'RESTRICT' });
QueueTicket.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

export {
  sequelize,
  Hospital,
  HospitalMembership,
  HospitalBranch,
  Department,
  Users,
  Users as User,
  Patients,
  Patients as Patient,
  Doctor,
  Admin,
  TimeSlot,
  Appointment,
  QueueTicket,
};
