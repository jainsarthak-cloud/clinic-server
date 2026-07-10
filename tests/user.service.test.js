import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ||= 'postgres://postgres:postgres@localhost:5432/hospital_queue_test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';

const { UserRepository } = await import('../repositories/user.repository.js');
const sequelize = (await import('../config/db.js')).default;
const { UserService } = await import('../services/user.service.js');

const originalMethods = {};
for (const method of [
  'findByEmail',
  'create',
  'createMembership',
  'findByIdGlobal',
  'listHospitalUsers',
  'findByIdWithAssociations',
  'findByRole',
  'findActiveUsers',
  'updateStatus',
  'updateMembership',
  'restore'
]) {
  originalMethods[method] = UserRepository.prototype[method];
}

const originalTransaction = sequelize.transaction;

test.after(() => {
  Object.assign(UserRepository.prototype, originalMethods);
  sequelize.transaction = originalTransaction;
});

test.beforeEach(() => {
  Object.assign(UserRepository.prototype, originalMethods);
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

test('UserService.createUser creates user and membership', async () => {
  const service = new UserService();
  UserRepository.prototype.findByEmail = async () => null;
  UserRepository.prototype.create = async (payload) => ({ id: 'user-1', ...payload });
  UserRepository.prototype.createMembership = async (payload) => ({ id: 'membership-1', ...payload });
  UserRepository.prototype.findByIdGlobal = async () => ({
    id: 'user-1',
    displayName: 'Demo User',
    email: 'demo@test.com',
    phoneNumber: null,
    avatarUrl: null,
    status: 'invited',
    memberships: [
      {
        id: 'membership-1',
        hospitalId: 'hospital-1',
        role: 'admin',
        permissions: [],
        status: 'invited'
      }
    ]
  });

  const result = await service.createUser({
    fullName: ' Demo User ',
    email: 'DEMO@test.com',
    password: 'Password123!',
    hospitalId: 'hospital-1',
    role: 'admin'
  });

  assert.equal(result.id, 'user-1');
  assert.equal(result.email, 'demo@test.com');
  assert.equal(result.memberships[0].role, 'admin');
});

test('UserService.createUser rejects duplicate email', async () => {
  const service = new UserService();
  UserRepository.prototype.findByEmail = async () => ({ id: 'existing-user' });

  await assert.rejects(
    () =>
      service.createUser({
        fullName: 'Demo User',
        email: 'demo@test.com',
        password: 'Password123!'
      }),
    /Email already exists/
  );
});

test('UserService.getAllUsers formats hospital memberships', async () => {
  const service = new UserService();
  UserRepository.prototype.listHospitalUsers = async () => ({
    data: [
      {
        id: 'membership-1',
        hospitalId: 'hospital-1',
        role: 'doctor',
        status: 'active',
        permissions: [],
        user: {
          id: 'user-1',
          displayName: 'Dr Demo',
          email: 'doctor@test.com',
          phoneNumber: '+910000000000',
          status: 'active'
        }
      }
    ],
    meta: { total: 1 }
  });

  const result = await service.getAllUsers('hospital-1');
  assert.equal(result.data[0].id, 'user-1');
  assert.equal(result.data[0].role, 'doctor');
  assert.equal(result.meta.total, 1);
});

test('UserService.getUserById throws when user is missing', async () => {
  const service = new UserService();
  UserRepository.prototype.findByIdWithAssociations = async () => null;

  await assert.rejects(
    () => service.getUserById('user-1', 'hospital-1'),
    /User not found/
  );
});

test('UserService.updateUserStatus validates status', async () => {
  const service = new UserService();
  await assert.rejects(
    () => service.updateUserStatus('user-1', 'hospital-1', 'bad-status'),
    /Invalid status value/
  );
});
