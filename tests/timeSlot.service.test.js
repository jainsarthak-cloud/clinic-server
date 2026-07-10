import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ||= 'postgres://postgres:postgres@localhost:5432/hospital_queue_test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';

const { TimeSlotRepository } = await import('../repositories/timeSlot.repository.js');
const sequelize = (await import('../config/db.js')).default;
const { TimeSlotService } = await import('../services/timeSlot.service.js');

const originalMethods = {};
for (const method of [
  'findOverlappingSlots',
  'create',
  'findAllByHospital',
  'findByIdWithAssociations',
  'findAvailableSlots',
  'findById',
  'blockSlot',
  'unblockSlot',
  'softDelete'
]) {
  originalMethods[method] = TimeSlotRepository.prototype[method];
}

const originalTransaction = sequelize.transaction;

test.after(() => {
  Object.assign(TimeSlotRepository.prototype, originalMethods);
  sequelize.transaction = originalTransaction;
});

test.beforeEach(() => {
  Object.assign(TimeSlotRepository.prototype, originalMethods);
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

test('TimeSlotService.createTimeSlot creates slot', async () => {
  const service = new TimeSlotService();
  TimeSlotRepository.prototype.findOverlappingSlots = async () => [];
  TimeSlotRepository.prototype.create = async (payload) => ({ id: 'slot-1', ...payload });

  const result = await service.createTimeSlot('hospital-1', {
    branchId: 'branch-1',
    departmentId: 'department-1',
    doctorId: 'doctor-1',
    date: '2026-07-08',
    startTime: '10:00:00',
    endTime: '10:15:00'
  });

  assert.equal(result.id, 'slot-1');
  assert.equal(result.status, 'available');
  assert.equal(result.maxAppointments, 1);
});

test('TimeSlotService.createTimeSlot rejects overlapping slot', async () => {
  const service = new TimeSlotService();
  TimeSlotRepository.prototype.findOverlappingSlots = async () => [{ id: 'slot-2' }];

  await assert.rejects(
    () =>
      service.createTimeSlot('hospital-1', {
        doctorId: 'doctor-1',
        date: '2026-07-08',
        startTime: '10:00:00',
        endTime: '10:15:00'
      }),
    /Doctor already has a time slot/
  );
});

test('TimeSlotService.getTimeSlots formats paginated results', async () => {
  const service = new TimeSlotService();
  TimeSlotRepository.prototype.findAllByHospital = async () => ({
    data: [{ id: 'slot-1', hospitalId: 'hospital-1', status: 'available', metadata: {} }],
    meta: { total: 1 }
  });

  const result = await service.getTimeSlots('hospital-1');
  assert.equal(result.data[0].id, 'slot-1');
  assert.equal(result.meta.total, 1);
});

test('TimeSlotService.getTimeSlotById throws when missing', async () => {
  const service = new TimeSlotService();
  TimeSlotRepository.prototype.findByIdWithAssociations = async () => null;

  await assert.rejects(
    () => service.getTimeSlotById('slot-1', 'hospital-1'),
    /Time slot not found/
  );
});

test('TimeSlotService.blockTimeSlot blocks empty slot', async () => {
  const service = new TimeSlotService();
  TimeSlotRepository.prototype.findById = async () => ({ id: 'slot-1', bookedAppointments: 0 });
  TimeSlotRepository.prototype.blockSlot = async () => ({
    id: 'slot-1',
    hospitalId: 'hospital-1',
    status: 'blocked',
    blockReason: 'Doctor unavailable',
    metadata: {}
  });

  const result = await service.blockTimeSlot('slot-1', 'hospital-1', 'Doctor unavailable');
  assert.equal(result.status, 'blocked');
  assert.equal(result.blockReason, 'Doctor unavailable');
});
