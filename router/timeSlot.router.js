import express from 'express';
import { TimeSlotController } from '../controllers/timeSlot.controller.js';
const {
  createTimeSlotValidator,
  createManyTimeSlotsValidator,
  updateTimeSlotValidator,
  blockTimeSlotValidator
} = await import('../middlewares/validators/timeSlot.validator.js');
const {
  identifyUser,
  checkPermission
} = await import('../middlewares/security/index.js');

const router = express.Router({ mergeParams: true });
const ctrl = new TimeSlotController();

router.use(identifyUser);

router
  .route('/')
  .get(checkPermission('read:time-slot'), ctrl.getAll)
  .post(
    checkPermission('create:time-slot'),
    createTimeSlotValidator,
    ctrl.create
  );

router
  .route('/bulk')
  .post(
    checkPermission('create:time-slot'),
    createManyTimeSlotsValidator,
    ctrl.createMany
  );

router
  .route('/available')
  .get(checkPermission('read:time-slot'), ctrl.getAvailable);

router
  .route('/:id')
  .get(checkPermission('read:time-slot'), ctrl.getById)
  .put(
    checkPermission('update:time-slot'),
    updateTimeSlotValidator,
    ctrl.update
  )
  .delete(checkPermission('delete:time-slot'), ctrl.delete);

router
  .route('/:id/block')
  .patch(
    checkPermission('update:time-slot'),
    blockTimeSlotValidator,
    ctrl.block
  );

router
  .route('/:id/unblock')
  .patch(checkPermission('update:time-slot'), ctrl.unblock);

export default router;
