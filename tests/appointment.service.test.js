import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ||= 'postgres://postgres:postgres@localhost:5432/hospital_queue_test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';

const { AppointmentRepository } = await import('../repositories/appointment.repository.js');
const { TimeSlotRepository } = await import('../repositories/timeSlot.repository.js');
const sequelize = (await import('../config/db.js')).default;
const { AppointmentService } = await import('../services/appointment.service.js');

const appointmentOriginals = {};
for (const method of [
  'findOverlappingDoctorAppointments',
  'create',
  'findByIdWithAssociations',
  'findAllByHospital',
  'findById',
  'updateStatus',
  'updateAppointment',
  'softDelete',
  'countByStatus'
]) {
  appointmentOriginals[method] = AppointmentRepository.prototype[method];
}

const timeSlotOriginals = {};
for (const method of ['findById', 'incrementBookedAppointments', 'decrementBookedAppointments']) {
  timeSlotOriginals[method] = TimeSlotRepository.prototype[method];
}

const originalTransaction = sequelize.transaction;

test.after(() => {
  Object.assign(AppointmentRepository.prototype, appointmentOriginals);
  Object.assign(TimeSlotRepository.prototype, timeSlotOriginals);
  sequelize.transaction = originalTransaction;
});

test.beforeEach(() => {
  Object.assign(AppointmentRepository.prototype, appointmentOriginals);
  Object.assign(TimeSlotRepository.prototype, timeSlotOriginals);
  sequelize.transaction = async () => ({
    finished: false,
    commit: async function commit() {
      this.finished = 'commit';
    },
    rollback: async function rollback() {
      this.finished = 'rollback';
    }
  });
});

test('AppointmentService.createAppointment creates appointment', async () => {
  const service = new AppointmentService();
  service.validateReferences = async () => {};

  AppointmentRepository.prototype.findOverlappingDoctorAppointments = async () => [];
  AppointmentRepository.prototype.create = async (payload) => ({ id: 'appointment-1', ...payload });
  AppointmentRepository.prototype.findByIdWithAssociations = async () => ({
    id: 'appointment-1',
    hospitalId: 'hospital-1',
    branchId: 'branch-1',
    departmentId: 'department-1',
    doctorId: 'doctor-1',
    patientId: 'patient-1',
    appointmentNumber: 'APT-001',
    source: 'reception',
    type: 'scheduled',
    scheduledDate: '2026-07-08',
    startsAt: '2026-07-08T10:00:00.000Z',
    endsAt: '2026-07-08T10:15:00.000Z',
    status: 'booked',
    metadata: {}
  });

  const result = await service.createAppointment('hospital-1', {
    branchId: 'branch-1',
    departmentId: 'department-1',
    doctorId: 'doctor-1',
    patientId: 'patient-1',
    appointmentNumber: 'APT-001',
    scheduledDate: '2026-07-08',
    startsAt: '2026-07-08T10:00:00.000Z',
    endsAt: '2026-07-08T10:15:00.000Z'
  });

  assert.equal(result.id, 'appointment-1');
  assert.equal(result.status, 'booked');
});

test('AppointmentService.createAppointment rejects overlapping appointment', async () => {
  const service = new AppointmentService();
  service.validateReferences = async () => {};

  AppointmentRepository.prototype.findOverlappingDoctorAppointments = async () => [{ id: 'appointment-2' }];

  await assert.rejects(
    () =>
      service.createAppointment('hospital-1', {
        branchId: 'branch-1',
        departmentId: 'department-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        appointmentNumber: 'APT-002',
        scheduledDate: '2026-07-08',
        startsAt: '2026-07-08T10:00:00.000Z',
        endsAt: '2026-07-08T10:15:00.000Z'
      }),
    /Doctor already has an appointment/
  );
});

test('AppointmentService.getAppointments formats paginated results', async () => {
  const service = new AppointmentService();
  AppointmentRepository.prototype.findAllByHospital = async () => ({
    data: [{ id: 'appointment-1', hospitalId: 'hospital-1', appointmentNumber: 'APT-001', status: 'booked', metadata: {} }],
    meta: { total: 1 }
  });

  const result = await service.getAppointments('hospital-1');
  assert.equal(result.data[0].appointmentNumber, 'APT-001');
  assert.equal(result.meta.total, 1);
});

test('AppointmentService.getAppointmentById throws when missing', async () => {
  const service = new AppointmentService();
  AppointmentRepository.prototype.findByIdWithAssociations = async () => null;

  await assert.rejects(
    () => service.getAppointmentById('appointment-1', 'hospital-1'),
    /Appointment not found/
  );
});

test('AppointmentService.cancelAppointment updates status and releases slot', async () => {
  const service = new AppointmentService();
  let releasedSlotId = null;

  AppointmentRepository.prototype.findById = async () => ({
    id: 'appointment-1',
    hospitalId: 'hospital-1',
    timeSlotId: 'slot-1',
    status: 'booked'
  });
  AppointmentRepository.prototype.updateStatus = async () => ({
    id: 'appointment-1',
    hospitalId: 'hospital-1',
    status: 'cancelled',
    metadata: {}
  });
  TimeSlotRepository.prototype.decrementBookedAppointments = async (slotId) => {
    releasedSlotId = slotId;
  };

  const result = await service.cancelAppointment('appointment-1', 'hospital-1', {
    reason: 'Patient requested'
  });

  assert.equal(result.status, 'cancelled');
  assert.equal(releasedSlotId, 'slot-1');
});
